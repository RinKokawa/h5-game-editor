/**
 * PalettePanel — builtin tileset picker + tile swatch grid.
 *
 * Step 30: the palette is the builtin tileset registry. A dropdown
 * switches the active tileset (`brushStore.setActiveTileset`); the
 * grid shows one thumbnail per tile plus the eraser sentinel first.
 *
 * Thumbnails are CSS backgrounds of the SAME sheet the texture cache
 * slices — same URL, same grid math (`tileFrameRect` /
 * `tilesetImageSize`) — so the panel and the canvas can never
 * disagree. Pure DOM: Pixi never sees this (the "React never draws a
 * Tile" rule governs the canvas; this is panel chrome).
 */

import { useT } from '@core/i18n';
import { BUILTIN_TILESETS, getBuiltinTileset } from '@editor/map/palette/builtinTilesets';
import { tileFrameRect, tilesetImageSize } from '@editor/map/palette/tileGrid';
import { asTileId, asTilesetId } from '@editor/map/schema/ids';
import { ERASER_TILE_ID, ERASER_TILESET_ID, isEraserSelection, useBrushStore } from '@state/brushStore';

import styles from './PalettePanel.module.css';

/** Thumbnail scale: 16px art × 2 matches the canvas tileSize 32. */
const THUMBNAIL_SCALE = 2;

const tilesetLabelKey = (id: string): string => `palette.tileset.${id}`;

export function PalettePanel() {
  const t = useT();
  const activeTilesetId = useBrushStore((s) => s.activeTilesetId);
  const activeTileId = useBrushStore((s) => s.activeTileId);
  const setActiveTileset = useBrushStore((s) => s.setActiveTileset);
  const setActiveTile = useBrushStore((s) => s.setActiveTile);

  // The registry is a compile-time constant; the fallback keeps the
  // lookup total without a non-null assertion.
  const activeTileset = getBuiltinTileset(activeTilesetId) ?? BUILTIN_TILESETS[0];
  if (!activeTileset) return null;

  const sheet = tilesetImageSize(activeTileset);
  const eraserActive = isEraserSelection(activeTilesetId, activeTileId);

  return (
    <div className={styles.palette}>
      <header className={styles.header}>
        <span className={styles.title}>{t('palette.title')}</span>
        <span className={styles.hint}>{t('palette.hint')}</span>
      </header>
      <select
        className={styles.tilesetSelect}
        value={activeTileset.id}
        onChange={(event) => setActiveTileset(asTilesetId(event.target.value))}
        aria-label={t('palette.aria')}
      >
        {BUILTIN_TILESETS.map((tileset) => (
          <option key={tileset.id} value={tileset.id}>
            {t(tilesetLabelKey(tileset.id))}
          </option>
        ))}
      </select>
      <div className={styles.swatchGrid} role="listbox" aria-label={t('palette.aria')}>
        <button
          type="button"
          role="option"
          aria-selected={eraserActive}
          className={styles.swatch}
          data-active={eraserActive}
          data-eraser="true"
          onClick={() => setActiveTile(ERASER_TILESET_ID, ERASER_TILE_ID)}
          title={t('palette.eraser')}
        />
        {Array.from({ length: activeTileset.tileCount }, (_, index) => {
          const rect = tileFrameRect(activeTileset, index);
          const isActive =
            !eraserActive && activeTilesetId === activeTileset.id && activeTileId === asTileId(index);
          return (
            <button
              key={index}
              type="button"
              role="option"
              aria-selected={isActive}
              className={styles.swatch}
              data-active={isActive}
              onClick={() => setActiveTile(activeTileset.id, asTileId(index))}
              title={`${t(tilesetLabelKey(activeTileset.id))} #${index}`}
            >
              <span
                className={styles.sprite}
                style={{
                  backgroundImage: `url(${activeTileset.image.path})`,
                  backgroundSize: `${sheet.width * THUMBNAIL_SCALE}px ${sheet.height * THUMBNAIL_SCALE}px`,
                  backgroundPosition: `${-rect.x * THUMBNAIL_SCALE}px ${-rect.y * THUMBNAIL_SCALE}px`,
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
