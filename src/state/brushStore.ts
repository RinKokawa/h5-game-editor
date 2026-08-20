/**
 * Brush tool state — the active tile selection.
 *
 * Step 30: the selection is a (tilesetId, tileId) pair into the
 * builtin tileset registry (`@editor/map/palette/builtinTilesets`).
 * The eraser is a sentinel pair on the reserved `'eraser'` tileset id
 * — builtin ids are all `'sprout.*'`, so the sentinel can never
 * collide with a real tile, whatever its tileId.
 */

import { create } from 'zustand';

import { asTileId, asTilesetId } from '@editor/map/schema/ids';

import type { TileId, TilesetId } from '@editor/map/schema/ids';

export const ERASER_TILE_ID: TileId = asTileId(0);
export const ERASER_TILESET_ID: TilesetId = asTilesetId('eraser');

/** True when the pair is the eraser sentinel (erase, don't place). */
export const isEraserSelection = (tilesetId: TilesetId, tileId: TileId): boolean =>
  tilesetId === ERASER_TILESET_ID && tileId === ERASER_TILE_ID;

export interface BrushState {
  readonly activeTilesetId: TilesetId;
  readonly activeTileId: TileId;

  /** Switch tileset and select its first tile. */
  readonly setActiveTileset: (tilesetId: TilesetId) => void;
  readonly setActiveTile: (tilesetId: TilesetId, tileId: TileId) => void;
}

export const useBrushStore = create<BrushState>((set) => ({
  activeTilesetId: asTilesetId('sprout.grass'),
  activeTileId: asTileId(0),
  setActiveTileset: (tilesetId) => set({ activeTilesetId: tilesetId, activeTileId: asTileId(0) }),
  setActiveTile: (tilesetId, tileId) => set({ activeTilesetId: tilesetId, activeTileId: tileId }),
}));
