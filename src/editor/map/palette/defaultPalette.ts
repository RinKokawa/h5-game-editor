/**
 * Placeholder palette (Step 8 → Step 30 demotion).
 *
 * This table used to BE the palette; since Step 30 the live palette is
 * the builtin tileset registry (`./builtinTilesets`) and this file only
 * serves the fallback tier in `TileLayerView`: cells placed before
 * Step 30 carry `tilesetId: 'placeholder.tileset'` and keep rendering
 * as these solid colors so old documents stay readable. The eraser
 * sentinel lives in `@state/brushStore` (`isEraserSelection`).
 */

import { asTileId } from '@editor/map/schema/ids';

import type { TileId } from '@editor/map/schema/ids';

export interface PlaceholderColor {
  readonly id: TileId;
  readonly color: number;
}

const entry = (id: number, color: number): PlaceholderColor => ({
  id: asTileId(id),
  color,
});

export const PLACEHOLDER_COLORS: ReadonlyArray<PlaceholderColor> = [
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
  PLACEHOLDER_COLORS.map((e) => [e.id as unknown as number, e.color]),
);

export const colorForTileId = (id: TileId): number => {
  const c = TILE_ID_TO_COLOR.get(id);
  // Fallback to white rather than throwing — a stale tile id should not
  // crash rendering.
  return c ?? 0xffffff;
};
