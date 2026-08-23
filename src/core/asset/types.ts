/**
 * Core: Asset types.
 *
 * Step 30-A. The `AssetEntry` is a single record in the workspace
 * `assets/manifest.json`; `AssetManifest` is the on-disk shape.
 *
 * Note: `AssetRef` lives in `@editor/map/schema/asset` — that's the
 * shape DocumentMeta uses to *reference* an asset. This file is the
 * shape the *registry* uses to track what assets exist.
 */

import type { AssetId, SemanticKind } from '@editor/map/schema/asset';

/** Directory name for the workspace assets folder. */
export const ASSETS_DIRNAME = 'assets';

/** Manifest file name inside the assets folder. */
export const MANIFEST_FILENAME = 'manifest.json';

/** Manifest schema version. */
export const MANIFEST_VERSION = 1 as const;

/**
 * One entry in the manifest — describes a single asset.
 *
 * `id` doubles as the workspace-relative path (for imports: `tileset/
 * forest.png`) or a virtual id prefixed with `_builtin/` for built-ins.
 * Step 31 will migrate the existing `placeholder.tileset` references to
 * the new id shape; Step 30-A only adds the new shape alongside.
 */
export interface AssetEntry {
  readonly id: AssetId;
  readonly semanticKind: SemanticKind;
  /** Workspace-relative path to the file (`tileset/forest.png`). */
  readonly path: string;
  /** Display name (filename without extension). */
  readonly name: string;
  /** Lowercase hex SHA-256 content hash. */
  readonly hash: string;
  /** Size in bytes. Built-ins may omit (unknown at build time). */
  readonly size?: number;
  /** Epoch ms when the asset was registered. */
  readonly importedAt: number;
  /** Built-ins are read-only; rename / delete refuses. */
  readonly builtin: boolean;
}

/**
 * The on-disk shape of `<workspace>/assets/manifest.json`.
 *
 * `version: 1` is the schema version. When adding fields, append —
 * do not reuse names — and write a migration alongside the loader.
 */
export interface AssetManifest {
  readonly version: typeof MANIFEST_VERSION;
  readonly entries: ReadonlyArray<AssetEntry>;
}

export const EMPTY_MANIFEST: AssetManifest = {
  version: MANIFEST_VERSION,
  entries: [],
};

/** Returns true when the entry is a built-in (read-only). */
export const isBuiltinEntry = (entry: AssetEntry): boolean => entry.builtin;

/** Lenient type guard for the on-disk manifest. */
export const isAssetManifest = (raw: unknown): raw is AssetManifest => {
  if (typeof raw !== 'object' || raw === null) return false;
  const r = raw as Record<string, unknown>;
  if (r['version'] !== MANIFEST_VERSION) return false;
  if (!Array.isArray(r['entries'])) return false;
  return true;
};