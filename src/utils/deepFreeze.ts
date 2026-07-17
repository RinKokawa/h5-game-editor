/**
 * Deep-freeze a value so any mutation throws in strict mode.
 *
 * Used by command / reducer paths that return a "logically new"
 * frozen object. The implementation is intentionally permissive
 * about the input shape — plain objects and arrays are recursed;
 * everything else (Maps, Sets, class instances, primitives) is
 * frozen at the surface level so callers can keep relying on
 * their mutable contracts.
 */

export const deepFreeze = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') return value;
  if (Object.isFrozen(value)) return value;
  Object.freeze(value);
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item);
  } else {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
};