/**
 * AssetBrowserPanel — browses project assets.
 *
 * Placeholder in v0.1. Real implementation loads assets via the
 * `assets/` subsystem and binds to the active Document's asset list.
 */

import styles from './AssetBrowserPanel.module.css';

const FOLDER_MOCK = ['tilesets', 'sprites', 'audio', 'scripts'];

export function AssetBrowserPanel() {
  return (
    <div className={styles.browser}>
      <ul className={styles.list}>
        {FOLDER_MOCK.map((name) => (
          <li key={name} className={styles.row}>
            <span className={styles.icon} aria-hidden="true">
              ▸
            </span>
            <span className={styles.name}>{name}/</span>
            <span className={styles.count}>0</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
