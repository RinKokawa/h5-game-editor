/**
 * Selection store — current tile selection + marquee preview.
 *
 * Selection is per-layer: a `Set<TileCoordKey>` scoped to a single
 * `LayerId`. Switching the active layer does not wipe the selection
 * automatically — the SelectTool decides when to clear.
 *
 * Marquee is a transient drag preview: `start` and `end` are the two
 * corners of the rectangle being drawn. `null` when no drag is in
 * progress. Hover is the cell currently under the cursor (only set
 * by SelectTool; used by the overlay to draw a single-cell
 * highlight).
 *
 * This store is view state — it does not affect the Document. It
 * triggers React re-renders for any panel that reads it.
 */

import { create } from 'zustand';

import { encodeTileCoord } from '@editor/map/schema/tile';

import type { TileCoord } from '@editor/map/schema/geometry';
import type { LayerId, TileCoordKey } from '@editor/map/schema/ids';

export interface MarqueeRect {
  readonly start: TileCoord;
  readonly end: TileCoord;
}

export interface SelectionState {
  /** Layer the current selection belongs to. Null = no selection. */
  readonly layerId: LayerId | null;
  readonly cells: ReadonlySet<TileCoordKey>;
  readonly marquee: MarqueeRect | null;
  readonly hover: TileCoord | null;

  readonly setHover: (coord: TileCoord | null) => void;

  readonly beginMarquee: (layerId: LayerId, start: TileCoord) => void;
  readonly updateMarquee: (end: TileCoord) => void;
  readonly endMarquee: () => ReadonlySet<TileCoordKey>;
  readonly cancelMarquee: () => void;

  readonly setSelection: (layerId: LayerId, cells: Iterable<TileCoord>) => void;
  readonly toggleCell: (layerId: LayerId, coord: TileCoord) => void;
  readonly addCell: (layerId: LayerId, coord: TileCoord) => void;
  readonly clear: () => void;

  readonly setActiveLayer: (layerId: LayerId) => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  layerId: null,
  cells: new Set(),
  marquee: null,
  hover: null,

  setHover: (coord) => set({ hover: coord }),

  beginMarquee: (layerId, start) =>
    set({
      layerId,
      cells: new Set(),
      marquee: { start, end: start },
    }),

  updateMarquee: (end) =>
    set((state) => (state.marquee ? { marquee: { start: state.marquee.start, end } } : state)),

  endMarquee: () => {
    const { marquee, layerId } = get();
    if (!marquee || !layerId) {
      set({ marquee: null });
      return new Set<TileCoordKey>();
    }
    const cells = rectCells(marquee.start, marquee.end);
    set({ marquee: null, cells });
    return cells;
  },

  cancelMarquee: () => set({ marquee: null }),

  setSelection: (layerId, coords) => {
    const cells = new Set<TileCoordKey>();
    for (const c of coords) cells.add(encodeTileCoord(c));
    set({ layerId, cells });
  },

  toggleCell: (layerId, coord) => {
    const key = encodeTileCoord(coord);
    set((state) => {
      if (state.layerId !== layerId) {
        const cells = new Set<TileCoordKey>([key]);
        return { layerId, cells };
      }
      const next = new Set(state.cells);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { cells: next, layerId: next.size === 0 ? null : layerId };
    });
  },

  addCell: (layerId, coord) => {
    const key = encodeTileCoord(coord);
    set((state) => {
      if (state.layerId !== layerId) {
        return { layerId, cells: new Set([key]) };
      }
      if (state.cells.has(key)) return state;
      const next = new Set(state.cells);
      next.add(key);
      return { cells: next };
    });
  },

  clear: () => set({ layerId: null, cells: new Set(), marquee: null, hover: null }),

  setActiveLayer: (layerId) => set({ layerId }),
}));

/** Build the inclusive list of cells inside the rect spanned by `a` and `b`. */
export const rectCells = (a: TileCoord, b: TileCoord): ReadonlySet<TileCoordKey> => {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  const cells = new Set<TileCoordKey>();
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      cells.add(encodeTileCoord({ x, y }));
    }
  }
  return cells;
};
