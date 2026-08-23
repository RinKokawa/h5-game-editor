/**
 * Core: Register built-in assets.
 *
 * Step 30-A. Called once at app boot (EditorShell mount) so the
 * AssetBrowserPanel sees built-in tilesets alongside imported assets.
 *
 * Built-in entries are read-only: the {@link AssetService} throws
 * if you try to remove or rename them. The store mirror updates
 * automatically via the service's `AssetChange` events.
 *
 * Re-mounting (e.g. React StrictMode) calls this twice in quick
 * succession — the second call hits "duplicate id" and is silently
 * skipped so the boot sequence is idempotent.
 */

import { BUILTIN_TILESETS } from '@editor/map/palette/builtinTilesets';
import { asAssetId } from '@editor/map/schema/asset';

import type { AssetEntry } from './types';
import type { AssetService } from './AssetService';

/** Virtual id prefix for built-in assets. */
export const BUILTIN_ASSET_ID_PREFIX = '_builtin';

/** Build the canonical asset id for a built-in (e.g. `_builtin/tileset/sprout.grass`). */
export const builtinAssetId = (semanticKind: string, name: string) =>
  asAssetId(`${BUILTIN_ASSET_ID_PREFIX}/${semanticKind}/${name}`);

/**
 * Register every built-in tileset (and any future built-in assets)
 * against the given service. Idempotent — duplicate registrations
 * are silently ignored.
 */
export const registerBuiltinAssets = (service: AssetService): void => {
  const now = Date.now();
  for (const tileset of BUILTIN_TILESETS) {
    const entry: AssetEntry = {
      id: builtinAssetId('tileset', tileset.id),
      semanticKind: 'tileset',
      // Built-in bytes live at the Vite-imported URL, not a workspace
      // path. `path` carries that URL; callers resolve it via Pixi
      // Assets / texture cache as before.
      path: tileset.image.path,
      name: tileset.name,
      // Built-in hash is unknown at build time (the bytes are
      // bundled). Empty string signals "skip cache invalidation".
      hash: '',
      builtin: true,
      importedAt: now,
    };
    try {
      service.addAsset(entry);
    } catch (err) {
      if (err instanceof Error && err.message.includes('duplicate')) {
        // Idempotent boot — already registered this pass.
        continue;
      }
      throw err;
    }
  }
};