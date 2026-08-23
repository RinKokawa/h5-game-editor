/**
 * Asset store — Zustand mirror of the AssetService manifest + view
 * state (active semantic-kind tab).
 *
 * Step 30-A. The store does not own the manifest — `assetService`
 * (a singleton in `@core/asset/assetServiceSingleton`) is the single
 * source of truth. This store subscribes once at module load and
 * mirrors every `AssetChange` so React components can read the
 * manifest via `useAssetStore`. Mutations on the store delegate
 * straight to the service so events fire normally.
 *
 * `activeKind` is view-only — it's the tab the AssetBrowserPanel
 * is showing right now. It is reset to `'tileset'` when the
 * workspace is left so the next workspace starts on the default tab.
 */

import { create } from 'zustand';

import { assetService } from '@core/asset/assetServiceSingleton';
import { EMPTY_MANIFEST, type AssetEntry, type AssetManifest } from '@core/asset/index';

import type { AssetId, SemanticKind } from '@editor/map/schema/asset';

export interface AssetStoreState {
  readonly manifest: AssetManifest;
  readonly activeKind: SemanticKind;

  /** Replace the manifest wholesale. Boot-time use only. */
  readonly setManifest: (manifest: AssetManifest) => void;
  /** Reset to the empty manifest. Called when leaving a workspace. */
  readonly reset: () => void;

  /** Tab selection for the AssetBrowserPanel. */
  readonly setActiveKind: (kind: SemanticKind) => void;

  /** Mutators — delegate to the service so events fire. */
  readonly addAsset: (entry: AssetEntry) => void;
  readonly removeAsset: (id: AssetId) => AssetEntry | null;
  readonly renameAsset: (id: AssetId, newName: string) => AssetEntry | null;
}

const mirrorManifest = (): AssetManifest => assetService.snapshot();

export const useAssetStore = create<AssetStoreState>((set) => ({
  manifest: mirrorManifest(),
  activeKind: 'tileset',

  setManifest: (manifest) => {
    assetService.setManifest(manifest);
    set({ manifest: mirrorManifest() });
  },

  reset: () => {
    assetService.setManifest(EMPTY_MANIFEST);
    set({ manifest: EMPTY_MANIFEST, activeKind: 'tileset' });
  },

  setActiveKind: (kind) => set({ activeKind: kind }),

  addAsset: (entry) => {
    assetService.addAsset(entry);
    set({ manifest: mirrorManifest() });
  },

  removeAsset: (id) => {
    const removed = assetService.removeAsset(id);
    set({ manifest: mirrorManifest() });
    return removed;
  },

  renameAsset: (id, newName) => {
    const renamed = assetService.renameAsset(id, newName);
    set({ manifest: mirrorManifest() });
    return renamed;
  },
}));

// Subscribe once at module load. Subsequent mutations on the service
// (e.g. from `registerBuiltinAssets` during boot) flow through this
// listener into the store mirror. The mirror is also kept in sync
// explicitly inside each mutator above for the case where the
// mutator's caller wants the latest state synchronously.
assetService.subscribe(() => {
  useAssetStore.setState({ manifest: mirrorManifest() });
});