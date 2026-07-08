/**
 * Default tile palette (Step 8 placeholder).
 *
 * Sixteen stub tiles rendered as solid colors via `Sprite(WHITE) + tint`.
 * Real tilesets with image atlases land with the assets subsystem in a
 * later step; the BrushTool and PalettePanel do not need to change then.
 *
 * Tile id 0 is reserved for the eraser (see `@state/brushStore`). Its
 * color is shown as a hatched swatch in the PalettePanel.
 */

import { asTileId } from '@editor/map/schema/ids';
import { ERASER_TILE_ID } from '@state/brushStore';

import type { TileId } from '@editor/map/schema/ids';

export interface PaletteEntry {
  readonly id: TileId;
  readonly color: number;
  readonly label: string;
}

const entry = (id: number, color: number, label: string): PaletteEntry => ({
  id: asTileId(id),
  color,
  label,
});

export const DEFAULT_PALETTE: ReadonlyArray<PaletteEntry> = [
  entry(0, 0x2a2a2a, 'Eraser'),
  entry(1, 0xb3382c, 'Brick'),
  entry(2, 0x6c8eb3, 'Water'),
  entry(3, 0x82b366, 'Grass'),
  entry(4, 0xd6b656, 'Sand'),
  entry(5, 0x9673a6, 'Stone'),
  entry(6, 0x4a4a4a, 'Wall'),
  entry(7, 0x2f4858, 'Wood'),
  entry(8, 0xe8e8e8, 'Snow'),
  entry(9, 0xb0b0b0, 'Concrete'),
  entry(10, 0xffd86b, 'Sandstone'),
  entry(11, 0x5b9bd5, 'Ice'),
  entry(12, 0x70ad47, 'Moss'),
  entry(13, 0x7030a0, 'Magic'),
  entry(14, 0xc00000, 'Lava'),
  entry(15, 0x404040, 'Shadow'),
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
