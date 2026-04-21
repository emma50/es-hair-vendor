import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeQuery, safeFindOne, safeList } from '@/lib/queries/safe';

describe('safeQuery', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('happy path', () => {
    it('returns the resolved value when fn succeeds', async () => {
      const result = await safeQuery(async () => 'hello', 'fallback');
      expect(result).toBe('hello');
    });

    it('never calls the warn logger on success', async () => {
      await safeQuery(async () => 42, 0);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('preserves complex return shapes', async () => {
      const shape = { products: [{ id: '1' }], total: 1, hasMore: false };
      const result = await safeQuery(async () => shape, {
        products: [],
        total: 0,
        hasMore: false,
      });
      expect(result).toEqual(shape);
    });
  });

  describe('error path', () => {
    it('returns fallback when fn throws', async () => {
      const fallback = { products: [], total: 0 };
      const result = await safeQuery(async () => {
        throw new Error('DB unreachable');
      }, fallback);
      expect(result).toBe(fallback);
    });

    it('logs the error in development', async () => {
      await safeQuery(
        async () => {
          throw new Error('boom');
        },
        null,
        'getThing',
      );
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const [msg] = warnSpy.mock.calls[0]!;
      expect(String(msg)).toContain('safeQuery:getThing');
      expect(String(msg)).toContain('boom');
    });

    it('truncates very long error messages', async () => {
      const longMessage = 'x'.repeat(1000);
      await safeQuery(async () => {
        throw new Error(longMessage);
      }, null);
      const [msg] = warnSpy.mock.calls[0]!;
      // Truncated to ~300 chars + ellipsis
      expect(String(msg).length).toBeLessThan(500);
      expect(String(msg)).toContain('…');
    });

    it('handles non-Error throws', async () => {
      const result = await safeQuery(async () => {
        throw 'string error';
      }, 'fallback');
      expect(result).toBe('fallback');
      expect(warnSpy).toHaveBeenCalled();
    });

    it('catches rejected promises without unhandled rejection', async () => {
      const result = await safeQuery(
        () => Promise.reject(new Error('rejected')),
        [] as number[],
      );
      expect(result).toEqual([]);
    });
  });

  describe('safeFindOne', () => {
    it('returns the value when fn resolves to a record', async () => {
      const record = { id: '1', name: 'Test' };
      const result = await safeFindOne(async () => record);
      expect(result).toBe(record);
    });

    it('returns null when fn resolves to null', async () => {
      const result = await safeFindOne(async () => null);
      expect(result).toBeNull();
    });

    it('returns null when fn throws', async () => {
      const result = await safeFindOne(async () => {
        throw new Error('not found');
      });
      expect(result).toBeNull();
    });
  });

  describe('safeList', () => {
    it('returns the array when fn resolves', async () => {
      const items = [{ id: '1' }, { id: '2' }];
      const result = await safeList(async () => items);
      expect(result).toBe(items);
    });

    it('returns empty array when fn throws', async () => {
      const result = await safeList(async () => {
        throw new Error('DB error');
      });
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns empty array when fn resolves to empty', async () => {
      const result = await safeList(async () => []);
      expect(result).toEqual([]);
    });
  });

  describe('contract for callers', () => {
    it('a caller can always call .map on a safeList result', async () => {
      // Simulates a React component doing products.map(...)
      const products = await safeList<{ id: string }>(async () => {
        throw new Error('prisma down');
      });
      expect(() => products.map((p) => p.id)).not.toThrow();
    });

    it('a caller can always destructure a safeQuery result', async () => {
      const emptyShape = { products: [] as string[], total: 0, hasMore: false };
      const result = await safeQuery(async () => {
        throw new Error('prisma down');
      }, emptyShape);
      const { products, total, hasMore } = result;
      expect(products).toEqual([]);
      expect(total).toBe(0);
      expect(hasMore).toBe(false);
    });
  });
});
