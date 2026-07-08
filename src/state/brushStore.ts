/**
 * Brush tool state — currently selected tile.
 *
 * Tile id 0 is the placeholder "eraser" — selecting it makes the
 * brush remove tiles instead of placing them.
 */

import { create } from 'zustand';

import { asTileId } from '@editor/map/schema/ids';

import type { TileId } from '@editor/map/schema/ids';

export const ERASER_TILE_ID: TileId = asTileId(0);

export interface BrushState {
  readonly activeTileId: TileId;

  readonly setActiveTile: (id: TileId) => void;
}

export const useBrushStore = create<BrushState>((set) => ({
  activeTileId: asTileId(1),
  setActiveTile: (id) => set({ activeTileId: id }),
}));
