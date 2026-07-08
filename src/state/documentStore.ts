/**
 * Document store — current project state (Zustand mirror).
 *
 * Step 10 split: this store is now pure data. It exposes only
 * "primitive" setters (setTile, addLayer, ...) that
 * {@link DocumentService} calls. UI never mutates the document
 * directly — every change goes through a Command dispatched via the
 * CommandBus, which calls the Service, which calls the primitives
 * below.
 *
 * The remaining "view-only" actions (`setActiveLayer`, `setTileSize`,
 * `setMapSize`) don't affect document content and stay here.
 */

import { create } from 'zustand';

import { asLayerId, asTileId, asTilesetId } from '@editor/map/schema/ids';
import { encodeTileCoord } from '@editor/map/schema/tile';

import type { TileLayerEntry } from '@core/document/DocumentService';
import type { TileCoord } from '@editor/map/schema/geometry';
import type { LayerId, TileCoordKey, TilesetId } from '@editor/map/schema/ids';
import type { Layer, TileLayer } from '@editor/map/schema/layer';
import type { PlacedTile } from '@editor/map/schema/tile';
import type { Size } from '@local-types/index';

export const DEFAULT_TILE_SIZE = 32;
export const DEFAULT_MAP_TILES_WIDE = 60;
export const DEFAULT_MAP_TILES_TALL = 34;

const DEFAULT_MAP_SIZE: Size = {
  width: DEFAULT_TILE_SIZE * DEFAULT_MAP_TILES_WIDE,
  height: DEFAULT_TILE_SIZE * DEFAULT_MAP_TILES_TALL,
};

/** Stub tileset for the placeholder palette (Step 8). */
export const PLACEHOLDER_TILESET_ID: TilesetId = asTilesetId('placeholder.tileset');

const seedId = asLayerId('layer.tile.1');

const seedLayer = (id: LayerId, name: string): TileLayer => ({
  id,
  type: 'tile',
  name,
  visible: true,
  locked: false,
  opacity: 1,
  properties: { entries: new Map() },
  data: { tiles: new Map<TileCoordKey, PlacedTile>() },
});

const INITIAL_LAYERS: Layer[] = [seedLayer(seedId, 'Layer 1')];
const INITIAL_ACTIVE = seedId;

/**
 * Structural "tile entry" shape — defined in core so DocumentService
 * (core) can pass values to the store (state) without crossing an
 * editor import boundary. See {@link TileLayerEntry} in DocumentService.
 */

const asPlacedTile = (entry: TileLayerEntry): PlacedTile => ({
  tilesetId: asTilesetId(entry.tilesetId),
  tileId: asTileId(entry.tileId),
  rotation: entry.rotation,
  flipX: entry.flipX,
  flipY: entry.flipY,
});

const isTileLayer = (l: Layer): l is TileLayer => l.type === 'tile';

const pickNextActive = (layers: ReadonlyArray<Layer>): LayerId => {
  const first = layers[0];
  if (!first) {
    // Caller guarantees layers.length >= 1; defensive throw if violated.
    throw new Error('pickNextActive called with empty layers');
  }
  return first.id;
};

export interface DocumentState {
  readonly tileSize: number;
  readonly mapSize: Size;
  readonly layers: ReadonlyArray<Layer>;
  readonly activeLayerId: LayerId;

  // ── view-only setters (not Commands) ──────────────────────────────────
  readonly setTileSize: (size: number) => void;
  readonly setMapSize: (size: Size) => void;
  readonly setActiveLayer: (id: LayerId) => void;

  // ── DocumentService primitives ────────────────────────────────────────
  // These are intentionally not part of the public UI API. Callers go
  // through DocumentService → CommandBus → Command.
  readonly setTile: (layerId: LayerId, coord: TileCoord, entry: TileLayerEntry | null) => void;
  readonly getTile: (layerId: LayerId, coord: TileCoord) => TileLayerEntry | null;
  readonly addLayer: (layer: Layer, makeActive: boolean) => void;
  readonly removeLayer: (id: LayerId) => Layer | null;
  readonly setLayerVisible: (id: LayerId, visible: boolean) => void;
  readonly setLayerLocked: (id: LayerId, locked: boolean) => void;
  readonly reorderLayer: (id: LayerId, toIndex: number) => void;
  readonly findLayerIndex: (id: LayerId) => number;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  tileSize: DEFAULT_TILE_SIZE,
  mapSize: DEFAULT_MAP_SIZE,
  layers: INITIAL_LAYERS,
  activeLayerId: INITIAL_ACTIVE,

  setTileSize: (size) => set({ tileSize: size }),
  setMapSize: (size) => set({ mapSize: size }),

  setActiveLayer: (id) =>
    set((state) => (state.layers.some((l) => l.id === id) ? { activeLayerId: id } : state)),

  setTile: (layerId, coord, entry) => {
    const key = encodeTileCoord(coord);
    set((state) => {
      const idx = state.layers.findIndex((l) => l.id === layerId);
      const layer = idx === -1 ? undefined : state.layers[idx];
      if (!layer || !isTileLayer(layer) || layer.locked) return state;
      const nextTiles = new Map(layer.data.tiles);
      if (entry === null) {
        if (!nextTiles.has(key)) return state;
        nextTiles.delete(key);
      } else {
        const placed = asPlacedTile(entry);
        if (nextTiles.get(key)?.tileId === placed.tileId) return state;
        nextTiles.set(key, placed);
      }
      const nextLayers = state.layers.slice();
      nextLayers[idx] = { ...layer, data: { tiles: nextTiles } };
      return { layers: nextLayers };
    });
  },

  getTile: (layerId, coord) => {
    const state = get();
    const layer = state.layers.find((l) => l.id === layerId);
    if (!layer || !isTileLayer(layer)) return null;
    const key = encodeTileCoord(coord);
    const placed = layer.data.tiles.get(key);
    if (!placed) return null;
    return {
      tilesetId: placed.tilesetId,
      tileId: placed.tileId,
      rotation: placed.rotation,
      flipX: placed.flipX,
      flipY: placed.flipY,
    };
  },

  addLayer: (layer, makeActive) =>
    set((state) => ({
      layers: [layer, ...state.layers],
      activeLayerId: makeActive ? layer.id : state.activeLayerId,
    })),

  removeLayer: (id) => {
    let removed: Layer | null = null;
    set((state) => {
      if (state.layers.length <= 1) {
        // Refuse to delete the last layer — keep at least one around.
        return state;
      }
      const target = state.layers.find((l) => l.id === id);
      if (!target) return state;
      removed = target;
      const layers = state.layers.filter((l) => l.id !== id);
      const activeLayerId =
        state.activeLayerId === id ? pickNextActive(layers) : state.activeLayerId;
      return { layers, activeLayerId };
    });
    return removed;
  },

  setLayerVisible: (id, visible) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, visible } : l)),
    })),

  setLayerLocked: (id, locked) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, locked } : l)),
    })),

  reorderLayer: (id, toIndex) =>
    set((state) => {
      const idx = state.layers.findIndex((l) => l.id === id);
      if (idx === -1) return state;
      if (toIndex < 0 || toIndex >= state.layers.length) return state;
      if (idx === toIndex) return state;
      const moved = state.layers[idx];
      if (!moved) return state;
      const next = state.layers.slice();
      next.splice(idx, 1);
      next.splice(toIndex, 0, moved);
      return { layers: next };
    }),

  findLayerIndex: (id) => get().layers.findIndex((l) => l.id === id),
}));
