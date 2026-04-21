import { describe, it, expect } from 'vitest';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_CHANNEL_LABELS,
  ORDER_CHANNEL_COLORS,
  NIGERIAN_STATES,
  LOW_STOCK_THRESHOLD,
  ITEMS_PER_PAGE,
  STORE_CONFIG,
  estimateShippingCost,
  formatPhoneDisplay,
} from '@/lib/constants';

describe('ORDER_STATUS_LABELS', () => {
  const expectedStatuses = [
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
  ];

  it('has all expected order statuses', () => {
    for (const status of expectedStatuses) {
      expect(ORDER_STATUS_LABELS[status]).toBeDefined();
      expect(typeof ORDER_STATUS_LABELS[status]).toBe('string');
    }
  });

  it('has human-readable labels', () => {
    expect(ORDER_STATUS_LABELS.PENDING).toBe('Pending');
    expect(ORDER_STATUS_LABELS.DELIVERED).toBe('Delivered');
    expect(ORDER_STATUS_LABELS.CANCELLED).toBe('Cancelled');
  });
});

describe('ORDER_STATUS_COLORS', () => {
  it('has a color class for every status label', () => {
    for (const status of Object.keys(ORDER_STATUS_LABELS)) {
      expect(ORDER_STATUS_COLORS[status]).toBeDefined();
      expect(ORDER_STATUS_COLORS[status]).toContain('bg-');
      expect(ORDER_STATUS_COLORS[status]).toContain('text-');
    }
  });
});

describe('ORDER_CHANNEL_LABELS', () => {
  it('supports PAYSTACK and WHATSAPP channels', () => {
    expect(ORDER_CHANNEL_LABELS.PAYSTACK).toBe('Paystack');
    expect(ORDER_CHANNEL_LABELS.WHATSAPP).toBe('WhatsApp');
  });
});

describe('ORDER_CHANNEL_COLORS', () => {
  it('has color classes for each channel', () => {
    expect(ORDER_CHANNEL_COLORS.PAYSTACK).toContain('bg-');
    expect(ORDER_CHANNEL_COLORS.WHATSAPP).toContain('whatsapp');
  });
});

describe('NIGERIAN_STATES', () => {
  it('has 37 states including FCT', () => {
    expect(NIGERIAN_STATES).toHaveLength(37);
  });

  it('includes Lagos', () => {
    expect(NIGERIAN_STATES).toContain('Lagos');
  });

  it('includes FCT (Federal Capital Territory)', () => {
    expect(NIGERIAN_STATES).toContain('FCT');
  });

  it('includes Abuja-related FCT', () => {
    expect(NIGERIAN_STATES).toContain('FCT');
  });

  it('is sorted alphabetically', () => {
    const sorted = [...NIGERIAN_STATES].sort();
    expect(NIGERIAN_STATES).toEqual(sorted);
  });

  it('has no duplicates', () => {
    const unique = new Set(NIGERIAN_STATES);
    expect(unique.size).toBe(NIGERIAN_STATES.length);
  });

  it('includes all geopolitical zones', () => {
    // Sample from each zone
    expect(NIGERIAN_STATES).toContain('Kano'); // North-West
    expect(NIGERIAN_STATES).toContain('Borno'); // North-East
    expect(NIGERIAN_STATES).toContain('Niger'); // North-Central
    expect(NIGERIAN_STATES).toContain('Enugu'); // South-East
    expect(NIGERIAN_STATES).toContain('Rivers'); // South-South
    expect(NIGERIAN_STATES).toContain('Oyo'); // South-West
  });
});

describe('STORE_CONFIG', () => {
  it('returns fallback values when env vars are not set', () => {
    expect(typeof STORE_CONFIG.email).toBe('string');
    expect(typeof STORE_CONFIG.phone).toBe('string');
    expect(typeof STORE_CONFIG.address).toBe('string');
    expect(typeof STORE_CONFIG.appUrl).toBe('string');
  });

  it('has all expected keys', () => {
    const keys = [
      'whatsappNumber',
      'email',
      'phone',
      'address',
      'appUrl',
      'instagramUrl',
      'facebookUrl',
      'tiktokUrl',
    ];
    for (const key of keys) {
      expect(STORE_CONFIG).toHaveProperty(key);
    }
  });
});

describe('estimateShippingCost', () => {
  it('returns shipping fee for subtotal below threshold', () => {
    expect(estimateShippingCost(0)).toBe(2500);
    expect(estimateShippingCost(50000)).toBe(2500);
    expect(estimateShippingCost(99999)).toBe(2500);
  });

  it('returns free shipping at or above threshold', () => {
    expect(estimateShippingCost(100000)).toBe(0);
    expect(estimateShippingCost(200000)).toBe(0);
  });
});

describe('formatPhoneDisplay', () => {
  it('formats a Nigerian phone number with country code', () => {
    expect(formatPhoneDisplay('+2348012345678')).toBe('+234 801 234 5678');
  });

  it('formats without leading plus', () => {
    expect(formatPhoneDisplay('2348012345678')).toBe('+234 801 234 5678');
  });

  it('returns input unchanged if pattern does not match', () => {
    expect(formatPhoneDisplay('12345')).toBe('12345');
  });
});

describe('constants', () => {
  it('LOW_STOCK_THRESHOLD is a reasonable positive number', () => {
    expect(LOW_STOCK_THRESHOLD).toBeGreaterThan(0);
    expect(LOW_STOCK_THRESHOLD).toBeLessThanOrEqual(20);
  });

  it('ITEMS_PER_PAGE is a reasonable positive number', () => {
    expect(ITEMS_PER_PAGE).toBeGreaterThan(0);
    expect(ITEMS_PER_PAGE).toBeLessThanOrEqual(100);
  });
});
