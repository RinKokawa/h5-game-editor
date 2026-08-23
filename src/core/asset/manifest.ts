/**
 * Core: Asset manifest I/O.
 *
 * The manifest is the registry of all assets in a workspace — built-in
 * (registered in memory at boot) and imported (persisted on disk).
 * Step 30-A stores it at `<workspace>/assets/manifest.json`.
 *
 * IO is routed through the Electron IPC bridge so the renderer never
 * touches the filesystem directly. When `window.h5` is absent (vite
 * dev / vitest), reads return the empty manifest and writes return
 * a structured failure — callers handle both paths the same way.
 */

import {
  isElectron,
  readJsonFile,
  writeJsonFile,
} from '@systems/persistence/electronBridge';

import {
  ASSETS_DIRNAME,
  EMPTY_MANIFEST,
  MANIFEST_FILENAME,
  isAssetManifest,
  type AssetManifest,
} from './types';

export type ManifestOutcome<T> =
  | ({ readonly ok: true } & T)
  | { readonly ok: false; readonly error: string };

const manifestPath = (workspaceRoot: string): string =>
  `${workspaceRoot}/${ASSETS_DIRNAME}/${MANIFEST_FILENAME}`;

/**
 * Read `<workspace>/assets/manifest.json`.
 *
 * Missing file → empty manifest (the common case for a new workspace).
 * Corrupt JSON → structured failure; callers log + continue with empty.
 * Outside Electron → empty manifest (tests / `vite dev` without a
 * workspace have no manifest concept).
 */
export const loadManifest = async (
  workspaceRoot: string,
): Promise<ManifestOutcome<{ manifest: AssetManifest }>> => {
  try {
    if (!isElectron()) return { ok: true, manifest: EMPTY_MANIFEST };
    const result = await readJsonFile(manifestPath(workspaceRoot));
    if (!result.ok) {
      // ENOENT → empty (not an error); other I/O failures → propagate.
      if (result.error.includes('ENOENT')) {
        return { ok: true, manifest: EMPTY_MANIFEST };
      }
      return { ok: false, error: result.error };
    }
    const raw: unknown = JSON.parse(result.text);
    if (!isAssetManifest(raw)) {
      return { ok: false, error: 'Manifest is not a valid AssetManifest' };
    }
    return { ok: true, manifest: raw };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

/**
 * Write `<workspace>/assets/manifest.json`.
 *
 * Overwrites the whole file — `manifest` is the full state. Callers
 * read it back via `loadManifest` after a successful write if they
 * need confirmation.
 */
export const saveManifest = async (
  workspaceRoot: string,
  manifest: AssetManifest,
): Promise<ManifestOutcome<{ bytes: number }>> => {
  try {
    if (!isElectron()) {
      return { ok: false, error: 'Asset manifest I/O requires Electron (no window.h5)' };
    }
    const json = JSON.stringify(manifest, null, 2);
    const result = await writeJsonFile(manifestPath(workspaceRoot), json);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, bytes: result.bytes };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};