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
import type { Entity } from '@editor/map/schema/entity';
import type { TileCoord } from '@editor/map/schema/geometry';
import type { EntityId, LayerId, TileId } from '@editor/map/schema/ids';
import type { Layer } from '@editor/map/schema/layer';

export interface DocumentSnapshot {
  readonly tileSize: number;
  readonly mapSize: { readonly width: number; readonly height: number };
  readonly layers: ReadonlyArray<Layer>;
  readonly activeLayerId: LayerId;
  readonly entities: ReadonlyMap<EntityId, Entity>;
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
      entities: s.entities,
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

  // ── entity + ObjectLayer.entityOrder ops ──────────────────────────────

  /** Add an entity to the entities table. */
  addEntity(entity: Entity): void {
    useDocumentStore.getState().addEntity(entity);
    this.emitter.emit({ kind: 'entity:add' });
  }

  /**
   * Remove an entity from the entities table AND from every Object
   * layer's `entityOrder` (orphan cleanup is the caller's
   * responsibility made automatic). Returns the removed entity, or
   * `null` if it wasn't present.
   */
  removeEntity(id: EntityId): Entity | null {
    const state = useDocumentStore.getState();
    const removed = state.removeEntity(id);
    if (!removed) return null;
    for (const layer of state.layers) {
      if (layer.type === 'object' && layer.data.entityOrder.includes(id)) {
        state.removeFromObjectLayer(layer.id, id);
      }
    }
    this.emitter.emit({ kind: 'entity:remove' });
    return removed;
  }

  /** Replace an existing entity. No-op if the id is unknown. */
  setEntity(entity: Entity): void {
    if (!useDocumentStore.getState().getEntity(entity.id)) return;
    useDocumentStore.getState().setEntity(entity);
    this.emitter.emit({ kind: 'entity:set' });
  }

  /** Read the current entity (if any) for an id. */
  getEntity(id: EntityId): Entity | null {
    return useDocumentStore.getState().getEntity(id);
  }

  /** Append an entity to an Object layer's `entityOrder`. */
  appendToObjectLayer(layerId: LayerId, entityId: EntityId): boolean {
    const ok = useDocumentStore.getState().appendToObjectLayer(layerId, entityId);
    if (ok) this.emitter.emit({ kind: 'objectLayer:append' });
    return ok;
  }

  /** Remove an entity from an Object layer's `entityOrder`. */
  removeFromObjectLayer(layerId: LayerId, entityId: EntityId): boolean {
    const ok = useDocumentStore.getState().removeFromObjectLayer(layerId, entityId);
    if (ok) this.emitter.emit({ kind: 'objectLayer:remove' });
    return ok;
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
