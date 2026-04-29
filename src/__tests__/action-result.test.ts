import { describe, it, expect } from 'vitest';
import type { ActionResult } from '@/types';

/**
 * Tests for the ActionResult type contract.
 * Verifies that the discriminated union pattern works correctly
 * and that consumers can safely narrow the type.
 */

describe('ActionResult type contract', () => {
  function createSuccessResult<T>(data: T): ActionResult<T> {
    return { success: true, data };
  }

  function createErrorResult(
    error: string,
    fieldErrors?: Record<string, string[]>,
  ): ActionResult<never> {
    return { success: false, error, fieldErrors };
  }

  it('success result has data property', () => {
    const result = createSuccessResult({ orderNumber: 'ESH-20260406-0001' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderNumber).toBe('ESH-20260406-0001');
    }
  });

  it('error result has error message', () => {
    const result = createErrorResult('Your cart is empty.');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Your cart is empty.');
    }
  });

  it('error result can include field errors', () => {
    const result = createErrorResult('Please check your form fields.', {
      customerName: ['Name must be at least 2 characters'],
      customerPhone: ['Please enter a valid Nigerian phone number'],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.customerName).toContain(
        'Name must be at least 2 characters',
      );
      expect(result.fieldErrors?.customerPhone).toHaveLength(1);
    }
  });

  it('error result fieldErrors is optional', () => {
    const result = createErrorResult('Something went wrong.');
    if (!result.success) {
      expect(result.fieldErrors).toBeUndefined();
    }
  });

  it('success result with void data', () => {
    const result: ActionResult = { success: true, data: undefined };
    expect(result.success).toBe(true);
  });

  it('discriminated union narrowing works', () => {
    const results: ActionResult<string>[] = [
      createSuccessResult('hello'),
      createErrorResult('oops'),
    ];

    const successes = results.filter(
      (r): r is Extract<ActionResult<string>, { success: true }> => r.success,
    );
    const failures = results.filter(
      (r): r is Extract<ActionResult<string>, { success: false }> => !r.success,
    );

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(successes[0]!.data).toBe('hello');
    expect(failures[0]!.error).toBe('oops');
  });
});

describe('order creation result contract', () => {
  interface CreateOrderResult {
    orderNumber: string;
    paymentReference: string;
    amount: number;
    email: string;
  }

  it('Paystack order result has all required fields', () => {
    const result: ActionResult<CreateOrderResult> = {
      success: true,
      data: {
        orderNumber: 'ESH-20260406-0001',
        paymentReference: 'ESH-1712397600000-abc123',
        amount: 9250000, // kobo
        email: 'customer@example.com',
      },
    };

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderNumber).toMatch(/^ESH-/);
      expect(result.data.paymentReference).toMatch(/^ESH-/);
      expect(result.data.amount).toBeGreaterThan(0);
      expect(result.data.email).toContain('@');
    }
  });

  it('WhatsApp order result still has payment reference (null-able in DB)', () => {
    const result: ActionResult<CreateOrderResult> = {
      success: true,
      data: {
        orderNumber: 'ESH-20260406-0002',
        paymentReference: 'ESH-1712397600000-def456', // Generated but not used
        amount: 5500000,
        email: '',
      },
    };

    if (result.success) {
      expect(result.data.orderNumber).toBeDefined();
      expect(result.data.amount).toBe(5500000);
      expect(result.data.email).toBe(''); // WhatsApp orders may not have email
    }
  });
});
