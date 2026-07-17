/**
 * Timing helpers — debounce and throttle.
 *
 * Both return a wrapper that, when called, schedules the inner `fn`
 * according to the chosen policy. The wrapper preserves the return
 * type of `fn` only for `throttle` (which fires synchronously on the
 * leading edge); `debounce` returns `void` because the wrapped
 * function is always invoked asynchronously.
 */

export const debounce = <Args extends readonly unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): ((...args: Args) => void) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Args): void => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, waitMs);
  };
};

/**
 * Throttle that fires on the leading edge and coalesces subsequent
 * calls inside the window into one deferred trailing call.
 * Returns the wrapped function's value on leading-edge invocations
 * and `undefined` for the dropped calls inside the window.
 *
 * Implementation is timer-driven (not Date.now-driven) so the
 * wrapper is deterministic under fake timers / clock mocking — the
 * leading edge fires synchronously on the first call, the trailing
 * edge is the next scheduled `setTimeout`.
 */
export const throttle = <Args extends readonly unknown[], R>(
  fn: (...args: Args) => R,
  waitMs: number,
): ((...args: Args) => R | undefined) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Args | null = null;
  return (...args: Args): R | undefined => {
    if (timer === null) {
      // Leading edge — fire now, schedule the trailing coalesce.
      pendingArgs = args;
      timer = setTimeout(() => {
        timer = null;
        const a = pendingArgs;
        pendingArgs = null;
        if (a) fn(...a);
      }, waitMs);
      return fn(...args);
    }
    // Inside the window — remember latest args, drop the return.
    pendingArgs = args;
    return undefined;
  };
};