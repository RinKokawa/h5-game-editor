/**
 * Asset reference.
 *
 * Project data references assets by path rather than embedding them. The
 * asset loader (see {@link ../../assets}) resolves and caches the bytes.
 *
 * Step 30-A: `semanticKind` distinguishes what the asset IS USED FOR
 * (tileset vs sprite vs theme vs font vs audio) from `kind` which is the
 * physical type (image vs audio vs data vs font). A `tileset` is
 * physically an `image` with grid metadata; a `theme` is `data` (JSON).
 * See `semanticToPhysical` for the mapping.
 *
 * `path` is workspace-relative (`assets/<semanticKind>/<file>` for
 * imports) or a virtual builtin id prefixed with `_builtin/`. {@link AssetId}
 * is the stable identifier DocumentMeta uses to reference an asset.
 */

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

/** Physical byte-stream kind — drives decoding / IO. */
export type AssetKind = 'image' | 'audio' | 'data' | 'font';

/**
 * Semantic kind — drives editor consumption.
 *
 *   `tileset` — Map editor (PNG + grid meta)
 *   `sprite`  — single image, used as entity / icon
 *   `theme`   — UI editor (JSON: colors / fonts / spacing)
 *   `font`    — both editors (woff / woff2 / ttf)
 *   `audio`   — both editors (Step 30-A: type only, IO deferred)
 */
export type SemanticKind = 'tileset' | 'sprite' | 'theme' | 'font' | 'audio';

/** Stable asset identifier — workspace-relative path or `_builtin/...`. */
export type AssetId = Brand<string, 'AssetId'>;

export const asAssetId = (s: string): AssetId => s as AssetId;

export interface AssetRef {
  readonly kind: AssetKind;
  readonly semanticKind: SemanticKind;
  /**
   * Workspace-relative path (`assets/<semanticKind>/<file>` for imports) or
   * a Vite-imported URL for built-in assets. AssetId is derived from this
   * path; see {@link asAssetId}.
   */
  readonly path: string;
  /** Optional content hash for cache invalidation. */
  readonly hash?: string;
}

/** Semantic → physical mapping. */
export const semanticToPhysical: Readonly<Record<SemanticKind, AssetKind>> = {
  tileset: 'image',
  sprite: 'image',
  theme: 'data',
  font: 'font',
  audio: 'audio',
};

/**
 * File extension → semantic kind for unambiguous formats. Image formats
 * (png / jpg / webp) are intentionally absent — they're ambiguous between
 * `tileset` and `sprite`; the ImportAssetDialog lets the user pick.
 */
export const extensionToSemantic: Readonly<Record<string, SemanticKind>> = {
  json: 'theme',
  woff: 'font',
  woff2: 'font',
  ttf: 'font',
};

/** Returns true when the asset id refers to a built-in asset. */
export const isBuiltinAssetId = (id: AssetId): boolean => id.startsWith('_builtin/');