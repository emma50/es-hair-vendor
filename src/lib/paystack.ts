import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Paystack REST + webhook helpers.
 *
 * One-time startup sanity check: verify the server's secret key and
 * (optionally) the browser-exposed public key are in the same
 * environment (test/live). Historic class of incidents: devs paste the
 * live secret key next to a test public key, the inline.js popup opens
 * a TEST charge, but the webhook path uses the LIVE secret so the HMAC
 * and REST verify both fail silently and the order sits PENDING
 * forever. We log a clear error so the mismatch is caught at boot.
 *
 * Paystack key prefixes:
 *   - `sk_test_…` / `pk_test_…` — sandbox
 *   - `sk_live_…` / `pk_live_…` — production
 */
function paystackEnvOf(key: string | undefined): 'test' | 'live' | null {
  if (!key) return null;
  if (key.startsWith('sk_test_') || key.startsWith('pk_test_')) return 'test';
  if (key.startsWith('sk_live_') || key.startsWith('pk_live_')) return 'live';
  return null;
}

// Run once at module load. We DON'T throw — throwing here would take
// the Next.js server down and we still want local dev to boot without
// keys configured. Logging once per worker is the right signal for ops;
// a one-line summary keeps cold-start log noise on Vercel manageable.
(() => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  const secretEnv = paystackEnvOf(secret);
  const publicEnv = paystackEnvOf(publicKey);

  const problems: string[] = [];
  if (secret && !secretEnv) problems.push('secret key malformed');
  if (publicKey && !publicEnv) problems.push('public key malformed');
  if (secretEnv && publicEnv && secretEnv !== publicEnv) {
    problems.push(`env mismatch (secret=${secretEnv}, public=${publicEnv})`);
  }
  if (problems.length > 0) {
    console.error(`[paystack] config: ${problems.join('; ')}`);
  }
})();

/**
 * Constant-time HMAC-SHA512 signature check for Paystack webhooks.
 *
 * `===` on hex strings short-circuits on the first mismatch and leaks
 * timing information about the expected digest. `timingSafeEqual`
 * compares every byte before returning, denying that side-channel.
 * The length guard is required because `timingSafeEqual` throws when
 * the two buffers differ in length (which itself is safe to check
 * non-constant-time since `expected.length` is public).
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;

  const expected = createHmac('sha512', secret).update(body).digest('hex');
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  } catch {
    // `Buffer.from(str, 'hex')` silently drops invalid chars, which
    // can produce a short buffer and throw in timingSafeEqual. Treat
    // that as a failed match.
    return false;
  }
}

/**
 * Full shape of the fields we care about from a `verify/:reference`
 * call. Paystack's response is much larger; we only model what we use
 * so the rest is ignored gracefully.
 */
export interface PaystackVerifyResponse {
  status: boolean;
  message?: string;
  data: {
    /** Paystack internal transaction id — stable once the charge is
     *  created, useful for refund/re-query calls. */
    id?: number;
    status: string;
    reference: string;
    amount: number;
    currency: string;
  };
}

/**
 * Default per-call timeout for Paystack REST. The serverless function
 * timeout is 60s; we cap each upstream request well below that so a
 * stuck Paystack endpoint can't burn the whole invocation.
 */
const PAYSTACK_TIMEOUT_MS = 8_000;

export async function verifyTransaction(
  reference: string,
): Promise<PaystackVerifyResponse> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error('Paystack secret key not configured');

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${secret}`,
      },
      signal: AbortSignal.timeout(PAYSTACK_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    throw new Error(`Paystack verification failed: ${response.statusText}`);
  }

  return response.json() as Promise<PaystackVerifyResponse>;
}

export interface PaystackRefundResponse {
  status: boolean;
  message?: string;
  data: {
    /** Paystack's refund record id. */
    id?: number;
    /** Refund lifecycle — `pending | processed | failed`. Money is not
     *  guaranteed returned until a later `refund.processed` webhook. */
    status?: string;
    amount?: number;
    currency?: string;
    transaction?: {
      id?: number;
      reference?: string;
    };
  };
}

/**
 * Issue a refund against a transaction. `transactionRef` may be either
 * the merchant-side `reference` string (`ESH-…`) or Paystack's
 * numeric transaction id — Paystack accepts both as the `transaction`
 * field. `amount` is in kobo; omit to refund the full amount.
 *
 * Paystack's refund API is ASYNC — a successful POST returns
 * `data.status: 'pending'`. The actual settlement lands as a
 * `refund.processed` webhook event, which is where we flip the order
 * to REFUNDED + credit stock.
 */
export async function refundTransaction(
  transactionRef: string | number,
  amountKobo?: number,
  merchantNote?: string,
): Promise<PaystackRefundResponse> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error('Paystack secret key not configured');

  const body: Record<string, unknown> = { transaction: transactionRef };
  if (typeof amountKobo === 'number') body.amount = amountKobo;
  if (merchantNote) body.merchant_note = merchantNote.slice(0, 300);

  const response = await fetch('https://api.paystack.co/refund', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(PAYSTACK_TIMEOUT_MS),
  });

  // 400 from Paystack usually means "already fully refunded" or
  // "transaction not found" — surface the message so the admin can
  // act, rather than eating it as a generic 500.
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const err = (await response.json()) as { message?: string };
      if (err?.message) detail = err.message;
    } catch {
      // body wasn't JSON — keep statusText
    }
    throw new Error(`Paystack refund failed: ${detail}`);
  }

  return response.json() as Promise<PaystackRefundResponse>;
}
