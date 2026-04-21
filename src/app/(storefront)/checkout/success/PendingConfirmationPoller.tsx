'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getOrderStatusByToken } from '@/app/actions/orders';
import { STORE_CONFIG } from '@/lib/constants';
import { buildWhatsAppDirectUrl } from '@/lib/whatsapp';

interface PendingConfirmationPollerProps {
  /** Capability token from the URL / cookie — used to re-check status. */
  token: string;
}

/**
 * Why this exists:
 *
 * The SSR reconcile path in `/checkout/success` hits Paystack once at
 * page-load. If Paystack hadn't finished settling when we asked, we
 * render the "Finalising Your Payment…" variant and leave. Without a
 * client-side poll, the customer stares at that screen forever —
 * eventually refreshing, which we've seen panic people into
 * double-paying.
 *
 * This component:
 *   - Polls the lightweight `getOrderStatusByToken` server action
 *     every 5s, up to a 2-minute ceiling (typical webhook lag for
 *     Paystack successful charges is <15s).
 *   - If the status flips away from PENDING → triggers a router
 *     refresh so the SSR page re-renders with the real status (and
 *     the reconcile path re-runs).
 *   - If we hit the 2-minute cutoff without a change, we surface a
 *     support-contact CTA so the customer has somewhere to go.
 *
 * What it's NOT:
 *   - A substitute for the webhook. The server action reads the DB;
 *     only the webhook or server reconciliation can *flip* the order.
 *   - A loop that re-verifies with Paystack. Polling Paystack from
 *     the client would leak our secret key (no client auth) and is
 *     rate-limited on their end; the cheap DB read is enough.
 */
const POLL_INTERVAL_MS = 5000;
const POLL_CEILING_MS = 2 * 60 * 1000;

type PollPhase = 'polling' | 'timed-out';

export function PendingConfirmationPoller({
  token,
}: PendingConfirmationPollerProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<PollPhase>('polling');
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      const elapsed = Date.now() - startedAtRef.current;
      if (elapsed >= POLL_CEILING_MS) {
        if (!cancelled) setPhase('timed-out');
        return;
      }

      try {
        const result = await getOrderStatusByToken(token);
        if (cancelled) return;
        if (result.success && result.data.status !== 'PENDING') {
          // Flip happened — rerun the SSR page so the header, icon,
          // and confirmation copy all update atomically.
          router.refresh();
          return;
        }
      } catch {
        // Network hiccups during polling are fine — next tick retries.
      }

      if (!cancelled) {
        window.setTimeout(tick, POLL_INTERVAL_MS);
      }
    }

    const handle = window.setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [token, router]);

  if (phase === 'polling') {
    return (
      <p className="text-muted mt-4 text-xs">
        Auto-refreshing — you do not need to reload this page.
      </p>
    );
  }

  const whatsappHref = buildWhatsAppDirectUrl(STORE_CONFIG.whatsappNumber);
  return (
    <div className="border-warning/30 bg-warning/5 mt-6 rounded-lg border px-4 py-3 text-left">
      <p className="text-silver text-xs leading-relaxed">
        Paystack hasn&apos;t confirmed the payment yet. This is usually a
        short delay, but if you were charged and your order still shows
        pending after a few minutes, please get in touch so we can
        reconcile it manually.
      </p>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gold hover:text-gold-light mt-2 inline-block text-xs font-medium underline underline-offset-2"
      >
        Contact us on WhatsApp
      </a>
    </div>
  );
}
