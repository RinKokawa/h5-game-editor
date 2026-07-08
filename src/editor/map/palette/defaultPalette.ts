/**
 * Default tile palette (Step 8 placeholder).
 *
 * Sixteen stub tiles rendered as solid colors via `Sprite(WHITE) + tint`.
 * Real tilesets with image atlases land with the assets subsystem in a
 * later step; the BrushTool and PalettePanel do not need to change then.
 *
 * Tile id 0 is reserved for the eraser (see `@state/brushStore`). Its
 * color is shown as a hatched swatch in the PalettePanel.
 *
 * `labelKey` is a bundle key, NOT a pre-translated string — PalettePanel
 * calls `t(entry.labelKey)` so swatch tooltips follow the current
 * locale without rebuilding the data table.
 */

import { asTileId } from '@editor/map/schema/ids';
import { ERASER_TILE_ID } from '@state/brushStore';

import type { TileId } from '@editor/map/schema/ids';

export interface PaletteEntry {
  readonly id: TileId;
  readonly color: number;
  readonly labelKey: string;
}

const entry = (id: number, color: number): PaletteEntry => ({
  id: asTileId(id),
  color,
  labelKey: `palette.entry.${id}`,
});

export const DEFAULT_PALETTE: ReadonlyArray<PaletteEntry> = [
  entry(0, 0x2a2a2a),
  entry(1, 0xb3382c),
  entry(2, 0x6c8eb3),
  entry(3, 0x82b366),
  entry(4, 0xd6b656),
  entry(5, 0x9673a6),
  entry(6, 0x4a4a4a),
  entry(7, 0x2f4858),
  entry(8, 0xe8e8e8),
  entry(9, 0xb0b0b0),
  entry(10, 0xffd86b),
  entry(11, 0x5b9bd5),
  entry(12, 0x70ad47),
  entry(13, 0x7030a0),
  entry(14, 0xc00000),
  entry(15, 0x404040),
];

const TILE_ID_TO_COLOR = new Map<number, number>(
  DEFAULT_PALETTE.map((e) => [e.id as unknown as number, e.color]),
);

export const colorForTileId = (id: TileId): number => {
  const c = TILE_ID_TO_COLOR.get(id);
  // Fallback to white rather than throwing — a stale tile id should not
  // crash rendering. Step 9 introduces tile-id validation.
  return c ?? 0xffffff;
};

export const isEraserTile = (id: TileId): boolean => id === ERASER_TILE_ID;
