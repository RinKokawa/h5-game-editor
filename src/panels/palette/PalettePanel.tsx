/**
 * PalettePanel — displays the default tile palette and lets the user
 * pick a tile.
 *
 * Step 8 wiring: bound to `brushStore.activeTileId`. Clicking a swatch
 * dispatches `setActiveTile(id)`. Tile id 0 is the eraser.
 *
 * Real tilesets with image atlases land with the assets subsystem in
 * a later step; this panel will switch from a fixed palette to the
 * active Tileset without contract changes.
 */

import { useT } from '@core/i18n';
import { DEFAULT_PALETTE } from '@editor/map/palette/defaultPalette';
import { ERASER_TILE_ID, useBrushStore } from '@state/brushStore';

import styles from './PalettePanel.module.css';

export function PalettePanel() {
  const t = useT();
  const activeTileId = useBrushStore((s) => s.activeTileId);
  const setActiveTile = useBrushStore((s) => s.setActiveTile);

  return (
    <div className={styles.palette}>
      <header className={styles.header}>
        <span className={styles.title}>{t('palette.title')}</span>
        <span className={styles.hint}>{t('palette.hint')}</span>
      </header>
      <div className={styles.swatchGrid} role="listbox" aria-label={t('palette.aria')}>
        {DEFAULT_PALETTE.map((entry) => {
          const isActive = entry.id === activeTileId;
          const isEraser = entry.id === ERASER_TILE_ID;
          return (
            <button
              key={entry.id}
              type="button"
              role="option"
              aria-selected={isActive}
              className={styles.swatch}
              data-active={isActive}
              data-eraser={isEraser}
              style={{ backgroundColor: `#${entry.color.toString(16).padStart(6, '0')}` }}
              onClick={() => setActiveTile(entry.id)}
              title={t(entry.labelKey)}
            >
              <span className={styles.swatchId}>{entry.id}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
