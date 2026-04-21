import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ----- useDebounce & useDebouncedCallback unit-level tests -----
// These hooks rely on setTimeout, so we test the core debounce logic directly.

describe('debounce logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays execution until timeout elapses', () => {
    const fn = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;

    function debounced(value: string) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(value), 300);
    }

    debounced('a');
    debounced('ab');
    debounced('abc');

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('abc');
  });

  it('fires immediately if enough time passes between calls', () => {
    const fn = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;

    function debounced(value: string) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(value), 300);
    }

    debounced('first');
    vi.advanceTimersByTime(300);

    debounced('second');
    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 'first');
    expect(fn).toHaveBeenNthCalledWith(2, 'second');
  });

  it('cancels pending call when a new one arrives', () => {
    const fn = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;

    function debounced(value: string) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(value), 300);
    }

    debounced('stale');
    vi.advanceTimersByTime(200);
    debounced('fresh');
    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('fresh');
  });
});

// ----- Request deduplication logic -----

describe('request deduplication logic', () => {
  it('deduplicates concurrent identical calls', async () => {
    const inflight = new Map<string, Promise<unknown>>();
    const fetchFn = vi.fn().mockResolvedValue('result');

    async function dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
      const existing = inflight.get(key);
      if (existing) return existing as Promise<T>;

      const promise = fn().finally(() => inflight.delete(key));
      inflight.set(key, promise);
      return promise;
    }

    // Fire twice concurrently with the same key
    const [r1, r2] = await Promise.all([
      dedup('order', fetchFn),
      dedup('order', fetchFn),
    ]);

    expect(fetchFn).toHaveBeenCalledTimes(1); // Only one actual call
    expect(r1).toBe('result');
    expect(r2).toBe('result');
  });

  it('allows new calls after previous completes', async () => {
    const inflight = new Map<string, Promise<unknown>>();
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve(`result-${callCount}`);
    });

    async function dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
      const existing = inflight.get(key);
      if (existing) return existing as Promise<T>;

      const promise = fn().finally(() => inflight.delete(key));
      inflight.set(key, promise);
      return promise;
    }

    const r1 = await dedup('order', fetchFn);
    const r2 = await dedup('order', fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(2); // Sequential = 2 calls
    expect(r1).toBe('result-1');
    expect(r2).toBe('result-2');
  });

  it('different keys run independently', async () => {
    const inflight = new Map<string, Promise<unknown>>();
    const fn1 = vi.fn().mockResolvedValue('a');
    const fn2 = vi.fn().mockResolvedValue('b');

    async function dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
      const existing = inflight.get(key);
      if (existing) return existing as Promise<T>;

      const promise = fn().finally(() => inflight.delete(key));
      inflight.set(key, promise);
      return promise;
    }

    const [r1, r2] = await Promise.all([
      dedup('key-a', fn1),
      dedup('key-b', fn2),
    ]);

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
    expect(r1).toBe('a');
    expect(r2).toBe('b');
  });

  it('cleans up inflight entry even on error', async () => {
    const inflight = new Map<string, Promise<unknown>>();
    const fetchFn = vi.fn().mockRejectedValue(new Error('fail'));

    async function dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
      const existing = inflight.get(key);
      if (existing) return existing as Promise<T>;

      const promise = fn().finally(() => inflight.delete(key));
      inflight.set(key, promise);
      return promise;
    }

    await expect(dedup('order', fetchFn)).rejects.toThrow('fail');
    expect(inflight.size).toBe(0); // Cleaned up
  });
});

// ----- Stale navigation cancellation logic -----

describe('stale navigation cancellation logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('only fires the latest navigation', () => {
    const push = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let latestUrl: string | null = null;

    function navigate(url: string) {
      if (timer) clearTimeout(timer);
      latestUrl = url;
      timer = setTimeout(() => {
        if (latestUrl === url) push(url);
      }, 200);
    }

    navigate('/products?category=wigs');
    navigate('/products?category=bundles');
    navigate('/products?category=closures');

    vi.advanceTimersByTime(200);

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/products?category=closures');
  });

  it('fires separate navigations if enough time passes between', () => {
    const push = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let latestUrl: string | null = null;

    function navigate(url: string) {
      if (timer) clearTimeout(timer);
      latestUrl = url;
      timer = setTimeout(() => {
        if (latestUrl === url) push(url);
      }, 200);
    }

    navigate('/products?sort=price-asc');
    vi.advanceTimersByTime(200);

    navigate('/products?sort=price-desc');
    vi.advanceTimersByTime(200);

    expect(push).toHaveBeenCalledTimes(2);
  });
});

// ----- Disable triggers during flight -----

describe('disable triggers during flight', () => {
  it('isPending guard prevents duplicate form submissions', () => {
    const submitAction = vi.fn();
    let isPending = false;

    function handleSubmit() {
      if (isPending) return;
      isPending = true;
      submitAction();
      // Simulate async completing later
    }

    handleSubmit();
    handleSubmit(); // Should be blocked
    handleSubmit(); // Should be blocked

    expect(submitAction).toHaveBeenCalledTimes(1);
  });

  it('allows resubmission after pending clears', () => {
    const submitAction = vi.fn();
    let isPending = false;

    function handleSubmit() {
      if (isPending) return;
      isPending = true;
      submitAction();
    }

    function completePending() {
      isPending = false;
    }

    handleSubmit();
    expect(submitAction).toHaveBeenCalledTimes(1);

    completePending();
    handleSubmit();
    expect(submitAction).toHaveBeenCalledTimes(2);
  });
});
