/**
 * Asset reference.
 *
 * Project data references assets by URL/path rather than embedding them. The
 * asset loader (see {@link ../../assets}) resolves and caches the bytes.
 */

export type AssetKind = 'image' | 'audio' | 'data' | 'font';

export interface AssetRef {
  readonly kind: AssetKind;
  /** Path relative to the project root, or an absolute URL for built-in assets. */
  readonly path: string;
  /** Optional content hash for cache invalidation. */
  readonly hash?: string;
}
