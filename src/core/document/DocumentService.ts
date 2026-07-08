/**
 * DocumentService — the sole mutator of the Document store.
 *
 * Commands dispatch through this service; renderers and panels read
 * directly from `useDocumentStore` for cheap Zustand subscriptions.
 *
 * Every mutation that affects Document data (tile placements, layer
 * changes) MUST go through here. View-only state (activeLayerId) is
 * not exposed by this service — it lives on the store directly.
 */

import { EventEmitter } from '@core/event/EventEmitter';
import { useDocumentStore } from '@state/documentStore';

import type { Unsubscribe } from '@core/event/EventEmitter';
import type { TileCoord } from '@editor/map/schema/geometry';
import type { LayerId, TileId } from '@editor/map/schema/ids';
import type { Layer } from '@editor/map/schema/layer';

export interface DocumentSnapshot {
  readonly tileSize: number;
  readonly mapSize: { readonly width: number; readonly height: number };
  readonly layers: ReadonlyArray<Layer>;
  readonly activeLayerId: LayerId;
}

/** Event payload published after any Document mutation. */
export interface DocumentChange {
  readonly kind: string;
}

export class DocumentService {
  private readonly emitter = new EventEmitter<DocumentChange>();

  subscribe(listener: (change: DocumentChange) => void): Unsubscribe {
    return this.emitter.subscribe(listener);
  }

  snapshot(): DocumentSnapshot {
    const s = useDocumentStore.getState();
    return {
      tileSize: s.tileSize,
      mapSize: s.mapSize,
      layers: s.layers,
      activeLayerId: s.activeLayerId,
    };
  }

  // ── tile ops ────────────────────────────────────────────────────────────

  /**
   * Set the tile at (`layerId`, `coord`) to `tile` (or remove it when
   * `tile` is `null`). Used by Place/Erase commands' `do` and `undo`.
   */
  setTile(layerId: LayerId, coord: TileCoord, tile: TileLayerEntry | null): void {
    useDocumentStore.getState().setTile(layerId, coord, tile);
    this.emitter.emit({ kind: 'tile:set' });
  }

  /** Read the current placed tile (if any) at (`layerId`, `coord`). */
  getTile(layerId: LayerId, coord: TileCoord): TileLayerEntry | null {
    return useDocumentStore.getState().getTile(layerId, coord);
  }

  // ── layer ops ───────────────────────────────────────────────────────────

  addLayer(layer: Layer, makeActive: boolean): void {
    useDocumentStore.getState().addLayer(layer, makeActive);
    this.emitter.emit({ kind: 'layer:add' });
  }

  removeLayer(id: LayerId): Layer | null {
    const removed = useDocumentStore.getState().removeLayer(id);
    if (removed) this.emitter.emit({ kind: 'layer:remove' });
    return removed;
  }

  setLayerVisible(id: LayerId, visible: boolean): void {
    useDocumentStore.getState().setLayerVisible(id, visible);
    this.emitter.emit({ kind: 'layer:visible' });
  }

  setLayerLocked(id: LayerId, locked: boolean): void {
    useDocumentStore.getState().setLayerLocked(id, locked);
    this.emitter.emit({ kind: 'layer:locked' });
  }

  /**
   * Insert `layer` at the given index. Used by MoveLayerCommand.
   * Pass the layer with its current content (this method does not
   * snapshot tiles — it just reorders the layer entries).
   */
  reorderLayer(id: LayerId, toIndex: number): void {
    useDocumentStore.getState().reorderLayer(id, toIndex);
    this.emitter.emit({ kind: 'layer:reorder' });
  }

  findLayerIndex(id: LayerId): number {
    return useDocumentStore.getState().findLayerIndex(id);
  }

  layerCount(): number {
    return useDocumentStore.getState().layers.length;
  }
}

/** Minimal shape of a placed tile exposed to Commands. */
export interface TileLayerEntry {
  readonly tilesetId: string;
  readonly tileId: TileId;
  readonly rotation: 0 | 90 | 180 | 270;
  readonly flipX: boolean;
  readonly flipY: boolean;
}

// Note: the singleton lives in `./documentServiceSingleton.ts` so it can be
// imported by `core/command/commandBusSingleton.ts` without creating a
// circular dependency.
