/**
 * Core: Asset — barrel.
 *
 * Public surface of the asset module. Manifest IO and Service live
 * here; consumers should depend only on this file plus the schema
 * types in `@editor/map/schema/asset`.
 */

export { AssetService, type AssetChange } from './AssetService';
export { loadManifest, saveManifest, type ManifestOutcome } from './manifest';
export {
  registerBuiltinAssets,
  builtinAssetId,
  BUILTIN_ASSET_ID_PREFIX,
} from './registerBuiltinAssets';
export {
  ASSETS_DIRNAME,
  MANIFEST_FILENAME,
  MANIFEST_VERSION,
  EMPTY_MANIFEST,
  isAssetManifest,
  isBuiltinEntry,
  type AssetEntry,
  type AssetManifest,
} from './types';