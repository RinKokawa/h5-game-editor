/**
 * ImportAssetDialog — register a new workspace asset.
 *
 * Step 30-A. The dialog drives the `asset:importFile` IPC: the main
 * process reads the source bytes, copies them into
 * `<workspace>/assets/<kind>/<name>`, computes the sha-256 hash, and
 * returns the entry metadata. The renderer then mirrors the entry
 * into the asset store and persists the manifest.
 *
 * Drag-drop import is intentionally out of scope (deferred). The
 * "+ Import Asset" button on the AssetBrowserPanel is the only entry
 * point for now.
 */

import { useCallback, useEffect, useState } from 'react';

import { saveManifest } from '@core/asset/index';
import {
  importAssetFile,
  pickFile,
  isElectron,
} from '@systems/persistence/electronBridge';
import { useAssetStore } from '@state/assetStore';
import { useWorkspaceStore } from '@state/workspaceStore';

import type { AssetEntry } from '@core/asset/index';
import type { SemanticKind } from '@editor/map/schema/asset';

import styles from './ImportAssetDialog.module.css';

const KIND_OPTIONS: ReadonlyArray<{ readonly kind: SemanticKind; readonly label: string }> = [
  { kind: 'tileset', label: 'Tileset' },
  { kind: 'sprite', label: 'Sprite' },
  { kind: 'theme', label: 'Theme' },
  { kind: 'font', label: 'Font' },
  { kind: 'audio', label: 'Audio' },
];

const FILTERS_BY_KIND: Readonly<
  Record<
    SemanticKind,
    ReadonlyArray<{ readonly name: string; readonly extensions: ReadonlyArray<string> }>
  >
> = {
  tileset: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
  sprite: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
  theme: [{ name: 'Theme JSON', extensions: ['json'] }],
  font: [{ name: 'Font', extensions: ['woff', 'woff2', 'ttf'] }],
  audio: [{ name: 'Audio', extensions: ['mp3', 'ogg', 'wav'] }],
};

const basename = (path: string): string => {
  const idx = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return idx === -1 ? path : path.slice(idx + 1);
};

const stripExt = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? name : name.slice(0, dot);
};

export interface ImportAssetDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly defaultKind: SemanticKind;
}

export function ImportAssetDialog({ open, onClose, defaultKind }: ImportAssetDialogProps) {
  const [kind, setKind] = useState<SemanticKind>(defaultKind);
  const [sourcePath, setSourcePath] = useState<string | null>(null);
  const [targetName, setTargetName] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on open so a stale state from a previous attempt doesn't
  // leak in.
  useEffect(() => {
    if (open) {
      setKind(defaultKind);
      setSourcePath(null);
      setTargetName('');
      setError(null);
      setBusy(false);
    }
  }, [open, defaultKind]);

  const handleChooseFile = useCallback(async () => {
    setError(null);
    const path = await pickFile(FILTERS_BY_KIND[kind]);
    if (!path) return;
    setSourcePath(path);
    setTargetName(stripExt(basename(path)));
  }, [kind]);

  const handleImport = useCallback(async () => {
    if (!sourcePath || targetName.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const workspace = useWorkspaceStore.getState().current;
      if (!workspace) {
        setError('No active workspace');
        return;
      }
      const result = await importAssetFile(workspace.path, sourcePath, kind, targetName);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const entry: AssetEntry = {
        id: result.entry.id as AssetEntry['id'],
        semanticKind: kind,
        path: result.entry.path,
        name: stripExt(targetName),
        hash: result.entry.hash,
        size: result.entry.size,
        importedAt: Date.now(),
        builtin: false,
      };
      useAssetStore.getState().addAsset(entry);
      const manifest = useAssetStore.getState().manifest;
      const save = await saveManifest(workspace.path, manifest);
      if (!save.ok) {
        // Don't roll back the in-memory entry — the file is on disk;
        // surface the error so the user can re-run save manually.
        setError(`Asset added but manifest save failed: ${save.error}`);
        return;
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [kind, sourcePath, targetName, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-asset-title"
    >
      <div className={styles.dialog}>
        <h2 id="import-asset-title" className={styles.title}>
          Import asset
        </h2>

        {!isElectron() && (
          <div className={styles.notice}>
            Asset import requires the desktop app (Electron). Run via <code>npm run
            electron:dev</code>.
          </div>
        )}

        <label className={styles.field}>
          <span className={styles.label}>Kind</span>
          <select
            className={styles.select}
            value={kind}
            onChange={(e) => setKind(e.target.value as SemanticKind)}
            disabled={busy}
          >
            {KIND_OPTIONS.map(({ kind: k, label }) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Source file</span>
          <button
            className={styles.chooseButton}
            onClick={handleChooseFile}
            disabled={busy}
          >
            {sourcePath ? 'Choose different…' : 'Choose file…'}
          </button>
          {sourcePath && <div className={styles.sourcePath}>{sourcePath}</div>}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Target name</span>
          <input
            className={styles.input}
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            disabled={busy}
            placeholder="filename without extension"
          />
        </label>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className={styles.confirm}
            onClick={handleImport}
            disabled={busy || !sourcePath || targetName.length === 0}
          >
            {busy ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}