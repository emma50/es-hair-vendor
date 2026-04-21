import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHmac } from 'crypto';

describe('verifyWebhookSignature', () => {
  const TEST_SECRET = 'sk_test_xxxxxxxxxxxxxxxxxxxxx';

  beforeEach(() => {
    vi.resetModules();
  });

  async function loadModule(secret?: string) {
    if (secret) {
      vi.stubEnv('PAYSTACK_SECRET_KEY', secret);
    } else {
      vi.stubEnv('PAYSTACK_SECRET_KEY', '');
    }
    const mod = await import('@/lib/paystack');
    return mod.verifyWebhookSignature;
  }

  it('returns true for a valid signature', async () => {
    const verifyWebhookSignature = await loadModule(TEST_SECRET);
    const body = JSON.stringify({
      event: 'charge.success',
      data: { reference: 'ref_123' },
    });
    const signature = createHmac('sha512', TEST_SECRET)
      .update(body)
      .digest('hex');

    expect(verifyWebhookSignature(body, signature)).toBe(true);
  });

  it('returns false for an invalid signature', async () => {
    const verifyWebhookSignature = await loadModule(TEST_SECRET);
    const body = JSON.stringify({ event: 'charge.success' });

    expect(verifyWebhookSignature(body, 'invalid-signature')).toBe(false);
  });

  it('returns false when secret is missing', async () => {
    const verifyWebhookSignature = await loadModule('');
    const body = JSON.stringify({ event: 'charge.success' });

    expect(verifyWebhookSignature(body, 'any-signature')).toBe(false);
  });
});
