/**
 * AssetBrowserPanel — browses project assets.
 *
 * Step 30: lists the builtin tilesets (Sprout Lands terrain basics)
 * with their tile counts, sharing the `palette.tileset.*` i18n keys
 * with the PalettePanel so the two panels always agree on names.
 * Workspace-imported assets (the workspace `assets/` folder) land with
 * the asset-import step and will join this list.
 */

import { useT } from '@core/i18n';
import { BUILTIN_TILESETS } from '@editor/map/palette/builtinTilesets';

import styles from './AssetBrowserPanel.module.css';

export function AssetBrowserPanel() {
  const t = useT();
  return (
    <div className={styles.browser}>
      <div className={styles.group}>{t('asset.builtin.title')}</div>
      <ul className={styles.list}>
        {BUILTIN_TILESETS.map((tileset) => (
          <li key={tileset.id} className={styles.row}>
            <span className={styles.name}>{t(`palette.tileset.${tileset.id}`)}</span>
            <span className={styles.count}>{t('asset.builtin.tiles', { n: tileset.tileCount })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
