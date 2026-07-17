/**
 * ID generation helpers.
 *
 * `generatePrefixedId` is used by tools that auto-name entities and
 * colliders (`Entity ${n}`, `Solid ${n}`). The prefix is opaque to
 * callers — the implementation just keeps a process-wide counter and
 * stamps `${prefix}-${n}`.
 *
 * `generateId` is a 64-bit-base-16 random id for cases that need a
 * collision-resistant handle (the entity/collider id branded types,
 * for example).
 */

let placementCounter = 0;

export const generatePrefixedId = (prefix: string): string => {
  placementCounter += 1;
  return `${prefix}-${placementCounter}`;
};

/**
 * 64-bit cryptographic-random id, hex-encoded. Uses `crypto.randomUUID`
 * when available; falls back to `getRandomValues` for older runtimes.
 * Tests run under happy-dom which exposes both.
 */
export const generateId = (): string => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let out = '';
  for (const b of bytes) {
    out += b.toString(16).padStart(2, '0');
  }
  return out;
};