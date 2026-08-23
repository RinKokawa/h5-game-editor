/**
 * AssetBrowserPanel — workspace asset library.
 *
 * Step 30-A: lists every asset registered with {@link useAssetStore}
 * — built-in tilesets registered at boot, plus any imports. Tab
 * filters by `semanticKind`; each kind renders its own row contents.
 *
 * Click a row to select the asset (the right-hand InspectorPanel
 * reads from the same store and shows full metadata + actions).
 * The footer opens the ImportAssetDialog.
 *
 * Per the project's "no business logic in components" rule, this
 * file only renders; renaming / deleting is wired through the
 * InspectorPanel in a follow-up step.
 */

import { useCallback, useState } from 'react';

import { ImportAssetDialog } from './ImportAssetDialog';
import { useAssetStore } from '@state/assetStore';

import type { AssetEntry } from '@core/asset/index';
import type { SemanticKind } from '@editor/map/schema/asset';

import styles from './AssetBrowserPanel.module.css';

const KIND_TABS: ReadonlyArray<{ readonly kind: SemanticKind; readonly label: string }> = [
  { kind: 'tileset', label: 'Tileset' },
  { kind: 'sprite', label: 'Sprite' },
  { kind: 'theme', label: 'Theme' },
  { kind: 'font', label: 'Font' },
  { kind: 'audio', label: 'Audio' },
];

const KIND_GLYPH: Readonly<Record<SemanticKind, string>> = {
  tileset: '▦',
  sprite: '◆',
  theme: '◐',
  font: 'Aa',
  audio: '♪',
};

const formatBytes = (n: number | undefined): string => {
  if (n === undefined) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const formatCount = (entry: AssetEntry): string => {
  // tileset has tileCount in Tileset shape, but AssetEntry doesn't carry
  // it. Show size when known, otherwise empty. Per-kind detail will be
  // added once each editor's AssetBrowser integration lands.
  if (entry.size !== undefined) return formatBytes(entry.size);
  return '';
};

export function AssetBrowserPanel() {
  const activeKind = useAssetStore((s) => s.activeKind);
  const setActiveKind = useAssetStore((s) => s.setActiveKind);
  const manifest = useAssetStore((s) => s.manifest);

  const [importOpen, setImportOpen] = useState(false);

  const builtin = manifest.entries.filter(
    (e) => e.builtin && e.semanticKind === activeKind,
  );
  const imported = manifest.entries.filter(
    (e) => !e.builtin && e.semanticKind === activeKind,
  );

  const total = builtin.length + imported.length;

  const handleTabClick = useCallback(
    (kind: SemanticKind) => () => setActiveKind(kind),
    [setActiveKind],
  );

  const handleImportClick = useCallback(() => setImportOpen(true), []);
  const handleImportClose = useCallback(() => setImportOpen(false), []);

  return (
    <div className={styles.browser}>
      <div className={styles.tabs} role="tablist">
        {KIND_TABS.map(({ kind, label }) => (
          <button
            key={kind}
            role="tab"
            aria-selected={activeKind === kind}
            className={`${styles.tab} ${activeKind === kind ? styles.tabActive : ''}`}
            onClick={handleTabClick(kind)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {total === 0 ? (
          <div className={styles.empty}>No {activeKind} assets. Import one to start.</div>
        ) : (
          <>
            {builtin.length > 0 && (
              <>
                <div className={styles.group}>Built-in</div>
                <ul className={styles.list}>
                  {builtin.map((entry) => (
                    <AssetRow key={entry.id} entry={entry} />
                  ))}
                </ul>
              </>
            )}
            {imported.length > 0 && (
              <>
                <div className={styles.group}>Imported</div>
                <ul className={styles.list}>
                  {imported.map((entry) => (
                    <AssetRow key={entry.id} entry={entry} />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>

      <div className={styles.footer}>
        <button className={styles.importButton} onClick={handleImportClick}>
          + Import Asset
        </button>
      </div>

      <ImportAssetDialog open={importOpen} onClose={handleImportClose} defaultKind={activeKind} />
    </div>
  );
}

interface AssetRowProps {
  readonly entry: AssetEntry;
}

function AssetRow({ entry }: AssetRowProps) {
  return (
    <li className={styles.row} title={`${entry.name}\n${entry.path}`}>
      <div className={styles.thumb} aria-hidden>
        {KIND_GLYPH[entry.semanticKind]}
      </div>
      <span className={styles.name}>{entry.name}</span>
      <span className={styles.meta}>{formatCount(entry)}</span>
      {entry.builtin && <span className={styles.badge} title="Built-in (read-only)">⚲</span>}
    </li>
  );
}