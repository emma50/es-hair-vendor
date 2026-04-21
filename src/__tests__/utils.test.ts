import { describe, it, expect } from 'vitest';
import { cn, serialize } from '@/lib/utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'py-3')).toBe('px-2 py-3');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'always')).toBe('base always');
  });

  it('resolves tailwind conflicts (last wins)', () => {
    const result = cn('px-2', 'px-4');
    expect(result).toBe('px-4');
  });

  it('handles undefined and null inputs', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });

  it('handles empty string', () => {
    expect(cn('')).toBe('');
  });

  it('merges array inputs', () => {
    expect(cn(['px-2', 'py-3'])).toBe('px-2 py-3');
  });

  it('resolves complex tailwind conflicts', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });
});

describe('serialize', () => {
  it('returns primitive values unchanged', () => {
    expect(serialize('hello')).toBe('hello');
    expect(serialize(42)).toBe(42);
    expect(serialize(true)).toBe(true);
    expect(serialize(null)).toBe(null);
  });

  it('returns plain objects unchanged', () => {
    const obj = { name: 'test', price: 100 };
    expect(serialize(obj)).toEqual(obj);
  });

  it('converts objects with toNumber method (Prisma Decimal)', () => {
    const decimalLike = {
      toNumber: () => 25000,
      toString: () => '25000',
    };
    const data = { price: decimalLike, name: 'Bundle' };
    const result = serialize(data);
    expect(result).toEqual({ price: 25000, name: 'Bundle' });
  });

  it('handles nested Decimal-like objects', () => {
    const data = {
      product: {
        name: 'Test',
        basePrice: { toNumber: () => 50000, toString: () => '50000' },
        variants: [
          { price: { toNumber: () => 60000, toString: () => '60000' } },
        ],
      },
    };
    const result = serialize(data);
    expect(result.product.basePrice).toBe(50000);
    expect(result.product.variants[0].price).toBe(60000);
  });

  it('handles arrays', () => {
    const data = [
      { price: { toNumber: () => 100, toString: () => '100' } },
      { price: { toNumber: () => 200, toString: () => '200' } },
    ];
    const result = serialize(data);
    expect(result[0].price).toBe(100);
    expect(result[1].price).toBe(200);
  });

  it('preserves null fields', () => {
    const data = { name: 'Test', description: null, price: 100 };
    expect(serialize(data)).toEqual(data);
  });

  it('handles empty arrays and objects', () => {
    expect(serialize([])).toEqual([]);
    expect(serialize({})).toEqual({});
  });
});
