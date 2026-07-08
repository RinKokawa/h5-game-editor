/**
 * Selection store — current selection + marquee preview.
 *
 * Selection is a single value (`Selection | null`) tagged by kind:
 *   - 'tiles'    — a per-layer `Set<TileCoordKey>` (existing behaviour,
 *                  preserved for the Brush/Eraser/Select workflow)
 *   - 'entity'   — a single `EntityId` placed on an Object layer
 *   - 'collider' — a single `ColliderId` placed on a Collision layer
 *
 * Tools decide what to select; the store never picks for them. Tools
 * fall through to whichever kind matches the active layer (SelectTool
 * chooses tiles on Tile layers, entities on Object layers, colliders
 * on Collision layers).
 *
 * Marquee is tile-only in v0.1 (`beginMarquee`/`endMarquee` only
 * ever touch `selection.cells`); hover is also tile-only. Future
 * kinds can extend with their own marquee/hover protocols.
 *
 * This store is view state — it does not affect the Document. It
 * triggers React re-renders for any panel that reads it.
 */

import { create } from 'zustand';

import { decodeTileCoord, encodeTileCoord } from '@editor/map/schema/tile';

import type { TileCoord } from '@editor/map/schema/geometry';
import type { ColliderId, EntityId, LayerId, TileCoordKey } from '@editor/map/schema/ids';

export interface MarqueeRect {
  readonly start: TileCoord;
  readonly end: TileCoord;
}

export interface TileSelection {
  readonly kind: 'tiles';
  readonly layerId: LayerId;
  readonly cells: ReadonlySet<TileCoordKey>;
}

export interface EntitySelection {
  readonly kind: 'entity';
  readonly layerId: LayerId;
  readonly entityId: EntityId;
}

export interface ColliderSelection {
  readonly kind: 'collider';
  readonly layerId: LayerId;
  readonly colliderId: ColliderId;
}

export type Selection = TileSelection | EntitySelection | ColliderSelection;

export interface SelectionState {
  readonly selection: Selection | null;
  readonly marquee: MarqueeRect | null;
  readonly hover: TileCoord | null;

  readonly setHover: (coord: TileCoord | null) => void;

  // Tile marquee — drag-preview selection. Only valid while the user
  // is dragging on a Tile layer (SelectTool gates on layer type).
  readonly beginMarquee: (layerId: LayerId, start: TileCoord) => void;
  readonly updateMarquee: (end: TileCoord) => void;
  readonly endMarquee: () => ReadonlySet<TileCoordKey>;
  readonly cancelMarquee: () => void;

  // Tile selection. Setters accept iterables of TileCoord to keep
  // callers free of TileCoordKey encoding.
  readonly setTileSelection: (layerId: LayerId, cells: Iterable<TileCoord>) => void;
  readonly toggleTileCell: (layerId: LayerId, coord: TileCoord) => void;
  readonly addTileCell: (layerId: LayerId, coord: TileCoord) => void;

  // Non-tile selections. Tools fetch the layerId off the entity /
  // collider (each belongs to exactly one layer of the right kind),
  // but the layerId param lets the caller avoid a redundant store
  // read in hot paths.
  readonly setEntitySelection: (entityId: EntityId, layerId: LayerId) => void;
  readonly setColliderSelection: (colliderId: ColliderId, layerId: LayerId) => void;

  readonly clear: () => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selection: null,
  marquee: null,
  hover: null,

  setHover: (coord) => set({ hover: coord }),

  beginMarquee: (layerId, start) => {
    set({
      marquee: { start, end: start },
      selection: { kind: 'tiles', layerId, cells: new Set<TileCoordKey>() },
    });
  },

  updateMarquee: (end) =>
    set((state) => (state.marquee ? { marquee: { start: state.marquee.start, end } } : state)),

  endMarquee: () => {
    const { marquee } = get();
    if (!marquee) {
      set({ marquee: null });
      return new Set<TileCoordKey>();
    }
    const cells = rectCells(marquee.start, marquee.end);
    set((state) => {
      if (state.selection?.kind !== 'tiles') {
        return { marquee: null, selection: null };
      }
      return {
        marquee: null,
        selection: { kind: 'tiles', layerId: state.selection.layerId, cells },
      };
    });
    return cells;
  },

  cancelMarquee: () =>
    set((state) => ({
      marquee: null,
      // Aborting a tile-drag clears the tile selection only — never
      // touches an entity/collider selection that might be active.
      selection: state.selection?.kind === 'tiles' ? null : state.selection,
    })),

  setTileSelection: (layerId, coords) => {
    const cells = new Set<TileCoordKey>();
    for (const c of coords) cells.add(encodeTileCoord(c));
    set({ selection: { kind: 'tiles', layerId, cells } });
  },

  toggleTileCell: (layerId, coord) => {
    const key = encodeTileCoord(coord);
    set((state) => {
      if (state.selection?.kind !== 'tiles' || state.selection.layerId !== layerId) {
        const cells = new Set<TileCoordKey>([key]);
        return { selection: { kind: 'tiles', layerId, cells } };
      }
      const next = new Set(state.selection.cells);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      if (next.size === 0) return { selection: null };
      return { selection: { kind: 'tiles', layerId, cells: next } };
    });
  },

  addTileCell: (layerId, coord) => {
    const key = encodeTileCoord(coord);
    set((state) => {
      if (state.selection?.kind !== 'tiles' || state.selection.layerId !== layerId) {
        return { selection: { kind: 'tiles', layerId, cells: new Set([key]) } };
      }
      if (state.selection.cells.has(key)) return state;
      const next = new Set(state.selection.cells);
      next.add(key);
      return { selection: { kind: 'tiles', layerId, cells: next } };
    });
  },

  setEntitySelection: (entityId, layerId) =>
    set({ selection: { kind: 'entity', entityId, layerId } }),

  setColliderSelection: (colliderId, layerId) =>
    set({ selection: { kind: 'collider', colliderId, layerId } }),

  clear: () => set({ selection: null, marquee: null, hover: null }),
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

/** Decode every tile-coord key in the tile selection. Returns [] for non-tile. */
export const selectionTileCoords = (selection: Selection | null): readonly TileCoord[] => {
  if (selection?.kind !== 'tiles') return [];
  const out: TileCoord[] = [];
  for (const k of selection.cells) out.push(decodeTileCoord(k));
  return out;
};
