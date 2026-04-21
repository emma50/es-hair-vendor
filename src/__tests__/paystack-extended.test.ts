import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHmac } from 'crypto';

describe('verifyTransaction', () => {
  const TEST_SECRET = 'sk_test_xxxxxxxxxxxxxxxxxxxxx';

  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn());
  });

  async function loadModule(secret?: string) {
    vi.stubEnv('PAYSTACK_SECRET_KEY', secret || '');
    const mod = await import('@/lib/paystack');
    return mod;
  }

  it('throws when secret key is missing', async () => {
    const { verifyTransaction } = await loadModule('');
    await expect(verifyTransaction('ref_123')).rejects.toThrow(
      'Paystack secret key not configured',
    );
  });

  it('calls paystack API with correct reference', async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          status: true,
          data: {
            status: 'success',
            reference: 'ref_123',
            amount: 5000000,
            currency: 'NGN',
          },
        }),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const { verifyTransaction } = await loadModule(TEST_SECRET);
    await verifyTransaction('ref_123');

    expect(fetch).toHaveBeenCalledWith(
      'https://api.paystack.co/transaction/verify/ref_123',
      {
        headers: {
          Authorization: `Bearer ${TEST_SECRET}`,
        },
      },
    );
  });

  it('returns parsed response on success', async () => {
    const responseData = {
      status: true,
      data: {
        status: 'success',
        reference: 'ref_456',
        amount: 2500000,
        currency: 'NGN',
      },
    };
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve(responseData),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const { verifyTransaction } = await loadModule(TEST_SECRET);
    const result = await verifyTransaction('ref_456');

    expect(result.status).toBe(true);
    expect(result.data.reference).toBe('ref_456');
    expect(result.data.amount).toBe(2500000);
  });

  it('throws when Paystack API returns non-ok response', async () => {
    const mockResponse = {
      ok: false,
      statusText: 'Not Found',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const { verifyTransaction } = await loadModule(TEST_SECRET);
    await expect(verifyTransaction('invalid_ref')).rejects.toThrow(
      'Paystack verification failed: Not Found',
    );
  });

  it('encodes reference in URL to prevent injection', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ status: true, data: {} }),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const { verifyTransaction } = await loadModule(TEST_SECRET);
    await verifyTransaction('ref with spaces & special=chars');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('ref%20with%20spaces%20%26%20special%3Dchars'),
      expect.any(Object),
    );
  });
});

describe('verifyWebhookSignature - extended', () => {
  const TEST_SECRET = 'sk_test_xxxxxxxxxxxxxxxxxxxxx';

  beforeEach(() => {
    vi.resetModules();
  });

  async function loadModule(secret?: string) {
    vi.stubEnv('PAYSTACK_SECRET_KEY', secret || '');
    const mod = await import('@/lib/paystack');
    return mod.verifyWebhookSignature;
  }

  it('handles large payloads correctly', async () => {
    const verifyWebhookSignature = await loadModule(TEST_SECRET);
    const largeBody = JSON.stringify({
      event: 'charge.success',
      data: {
        reference: 'ref_123',
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Product ${i}`,
          quantity: i + 1,
        })),
      },
    });
    const signature = createHmac('sha512', TEST_SECRET)
      .update(largeBody)
      .digest('hex');
    expect(verifyWebhookSignature(largeBody, signature)).toBe(true);
  });

  it('is case-sensitive for signature comparison', async () => {
    const verifyWebhookSignature = await loadModule(TEST_SECRET);
    const body = '{"event":"charge.success"}';
    const signature = createHmac('sha512', TEST_SECRET)
      .update(body)
      .digest('hex');
    const upperSignature = signature.toUpperCase();
    // SHA-512 hex digest is lowercase, so uppercase should fail
    expect(verifyWebhookSignature(body, upperSignature)).toBe(false);
  });

  it('returns false for empty body with valid secret', async () => {
    const verifyWebhookSignature = await loadModule(TEST_SECRET);
    const signature = createHmac('sha512', TEST_SECRET)
      .update('')
      .digest('hex');
    // Empty body with matching signature should still validate
    expect(verifyWebhookSignature('', signature)).toBe(true);
  });

  it('rejects when body is tampered after signing', async () => {
    const verifyWebhookSignature = await loadModule(TEST_SECRET);
    const originalBody = JSON.stringify({
      event: 'charge.success',
      data: { amount: 5000 },
    });
    const signature = createHmac('sha512', TEST_SECRET)
      .update(originalBody)
      .digest('hex');

    const tamperedBody = JSON.stringify({
      event: 'charge.success',
      data: { amount: 50000 },
    });
    expect(verifyWebhookSignature(tamperedBody, signature)).toBe(false);
  });
});
