/**
 * debounce / throttle — central timing helpers.
 *
 * Step 24 adds these to the utils barrel. happy-dom runs the timers
 * via fake timers so the tests are deterministic.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { debounce, throttle } from './timing';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays the call until `waitMs` elapses since the last invocation', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d();
    d();
    d();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes the latest args through', () => {
    const fn = vi.fn();
    const d = debounce(fn, 50);
    d('a');
    d('b');
    d('c');
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires synchronously on the leading edge', () => {
    const fn = vi.fn((_arg: string) => 'ok');
    const t = throttle(fn, 100);
    expect(t('a')).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('coalesces trailing calls inside the window into one deferred call', () => {
    const fn = vi.fn((_arg: string) => undefined);
    const t = throttle(fn, 100);
    t('a');
    t('b');
    t('c');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith('a');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('c');
  });

  it('fires a fresh leading edge once the window has elapsed', () => {
    const fn = vi.fn((_arg: string) => undefined);
    const t = throttle(fn, 100);
    t('a');
    vi.advanceTimersByTime(100); // trailing fires here
    t('b');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(fn).toHaveBeenNthCalledWith(1, 'a');
    expect(fn).toHaveBeenNthCalledWith(2, 'a'); // trailing edge replays latest
    expect(fn).toHaveBeenNthCalledWith(3, 'b');
  });
});