/**
 * AssetBrowserPanel — browses project assets.
 *
 * Placeholder in v0.1. Real implementation loads assets via the
 * `assets/` subsystem and binds to the active Document's asset list.
 *
 * Folder names are user-facing labels (not real filesystem paths) and
 * are translated via `useT()`.
 */

import { useT } from '@core/i18n';

import styles from './AssetBrowserPanel.module.css';

interface FolderEntry {
  readonly key: string;
}

const FOLDERS: ReadonlyArray<FolderEntry> = [
  { key: 'asset.folder.tilesets' },
  { key: 'asset.folder.sprites' },
  { key: 'asset.folder.audio' },
  { key: 'asset.folder.scripts' },
];

export function AssetBrowserPanel() {
  const t = useT();
  return (
    <div className={styles.browser}>
      <ul className={styles.list}>
        {FOLDERS.map((folder) => (
          <li key={folder.key} className={styles.row}>
            <span className={styles.icon} aria-hidden="true">
              ▸
            </span>
            <span className={styles.name}>{t(folder.key)}/</span>
            <span className={styles.count}>0</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
