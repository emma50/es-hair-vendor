import { describe, it, expect } from 'vitest';
import {
  formatNaira,
  formatDate,
  formatDateTime,
  formatOrderNumber,
  slugify,
} from '@/lib/formatters';

describe('formatNaira', () => {
  it('formats zero', () => {
    expect(formatNaira(0)).toContain('0');
  });

  it('formats thousands with grouping', () => {
    const result = formatNaira(50000);
    expect(result).toContain('50');
    expect(result).toContain('000');
  });

  it('formats string input', () => {
    const result = formatNaira('25000');
    expect(result).toContain('25');
  });

  it('formats large numbers', () => {
    const result = formatNaira(1000000);
    expect(result).toContain('1');
  });
});

describe('formatDate', () => {
  it('formats a Date object', () => {
    const date = new Date('2025-03-15T12:00:00Z');
    const result = formatDate(date);
    expect(result).toContain('2025');
    expect(result).toContain('15');
  });

  it('formats an ISO string', () => {
    const result = formatDate('2025-06-01T00:00:00Z');
    expect(result).toContain('2025');
  });
});

describe('formatDateTime', () => {
  it('includes time components', () => {
    const date = new Date('2025-03-15T14:30:00Z');
    const result = formatDateTime(date);
    expect(result).toContain('2025');
    expect(result).toContain('15');
  });
});

describe('formatOrderNumber', () => {
  it('produces ESH-YYYYMMDD-NNNN format', () => {
    const date = new Date('2025-03-15');
    expect(formatOrderNumber(date, 1)).toBe('ESH-20250315-0001');
  });

  it('zero-pads the counter', () => {
    const date = new Date('2025-01-01');
    expect(formatOrderNumber(date, 42)).toBe('ESH-20250101-0042');
  });

  it('handles large counter values', () => {
    const date = new Date('2025-12-31');
    expect(formatOrderNumber(date, 9999)).toBe('ESH-20251231-9999');
  });
});

describe('slugify', () => {
  it('lowercases text', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('my product name')).toBe('my-product-name');
  });

  it('removes special characters', () => {
    expect(slugify('Hair (Premium) @100%')).toBe('hair-premium-100');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('a---b')).toBe('a-b');
  });

  it('trims whitespace', () => {
    expect(slugify('  spaced  ')).toBe('spaced');
  });
});
