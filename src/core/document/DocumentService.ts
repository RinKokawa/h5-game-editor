/**
 * DocumentService — the sole mutator of the Document store.
 *
 * Commands dispatch through this service; renderers and panels read
 * directly from `useDocumentStore` for cheap Zustand subscriptions.
 *
 * Every mutation that affects Document data (tile placements, layer
 * changes, project meta) MUST go through here. View-only state
 * (activeLayerId) is not exposed by this service — it lives on the
 * store directly.
 *
 * Step 21: `setTileSize` / `setMapSize` / `setMeta` mutate the
 * project-level {@link DocumentMeta} and emit `kind: 'document:meta'`.
 * Callers should go through {@link SetTileSizeCommand} /
 * {@link SetMapSizeCommand} so the change is undoable.
 *
 * Step 22: `DocumentChange` is now a discriminated union — every
 * variant carries the location info a Pixi subscriber needs to
 * decide between a targeted update and a full redraw. Subscribers
 * that don't need granularity still `subscribe(c => { if
 * (c.kind === ...) redraw(); })` against the new shape.
 *
 * Emitter-side coalescing is *not* implemented: Pixi views already
 * rAF-debounce their redraws at the base-class level, and async
 * delivery would add complexity without giving finer-grained
 * subscribers any new information. If a hot path later needs it,
 * add a `flushable` flag here and keep the emitter synchronous.
 */

import { EventEmitter } from '@core/event/EventEmitter';
import { useDocumentStore } from '@state/documentStore';

import type { Unsubscribe } from '@core/event/EventEmitter';
import type { Collider } from '@editor/map/schema/collider';
import type { DocumentMeta } from '@editor/map/schema/document';
import type { Entity } from '@editor/map/schema/entity';
import type { TileCoord } from '@editor/map/schema/geometry';
import type { ColliderId, EntityId, LayerId, TileId } from '@editor/map/schema/ids';
import type { Layer } from '@editor/map/schema/layer';

export interface DocumentSnapshot {
  readonly meta: DocumentMeta;
  readonly layers: ReadonlyArray<Layer>;
  readonly activeLayerId: LayerId;
  readonly entities: ReadonlyMap<EntityId, Entity>;
  readonly colliders: ReadonlyMap<ColliderId, Collider>;
}

/**
 * Discriminated union of every Document mutation. Each variant
 * carries enough location info for a focused subscriber (the
 * TileLayerView listens on `tile:set` to patch one cell; the
 * SelectionOverlay listens on entity/collider events to keep its
 * outlines live). Subscribers that don't care about a particular
 * kind can fall back to "redraw everything from the store".
 */
export type DocumentChange =
  | { readonly kind: 'tile:set'; readonly layerId: LayerId; readonly coord: TileCoord }
  | { readonly kind: 'layer:add'; readonly layer: Layer; readonly atIndex: number }
  | { readonly kind: 'layer:remove'; readonly layerId: LayerId }
  | { readonly kind: 'layer:visible'; readonly layerId: LayerId; readonly visible: boolean }
  | { readonly kind: 'layer:locked'; readonly layerId: LayerId; readonly locked: boolean }
  | { readonly kind: 'layer:reorder'; readonly layerId: LayerId; readonly toIndex: number }
  | { readonly kind: 'entity:add'; readonly entity: Entity }
  | { readonly kind: 'entity:remove'; readonly entityId: EntityId }
  | { readonly kind: 'entity:set'; readonly entity: Entity }
  | {
      readonly kind: 'objectLayer:append';
      readonly layerId: LayerId;
      readonly entityId: EntityId;
    }
  | {
      readonly kind: 'objectLayer:remove';
      readonly layerId: LayerId;
      readonly entityId: EntityId;
    }
  | { readonly kind: 'collider:add'; readonly collider: Collider }
  | { readonly kind: 'collider:remove'; readonly colliderId: ColliderId }
  | { readonly kind: 'collider:set'; readonly collider: Collider }
  | {
      readonly kind: 'collisionLayer:append';
      readonly layerId: LayerId;
      readonly colliderId: ColliderId;
    }
  | {
      readonly kind: 'collisionLayer:remove';
      readonly layerId: LayerId;
      readonly colliderId: ColliderId;
    }
  | { readonly kind: 'document:meta' };

export class DocumentService {
  private readonly emitter = new EventEmitter<DocumentChange>();

  subscribe(listener: (change: DocumentChange) => void): Unsubscribe {
    return this.emitter.subscribe(listener);
  }

  snapshot(): DocumentSnapshot {
    const s = useDocumentStore.getState();
    return {
      meta: s.meta,
      layers: s.layers,
      activeLayerId: s.activeLayerId,
      entities: s.entities,
      colliders: s.colliders,
    };
  }

  // ── meta ops (Step 21) ─────────────────────────────────────────────────

  /** Read the current project-level meta (tileSize / mapSize). */
  getMeta(): DocumentMeta {
    return useDocumentStore.getState().meta;
  }

  /**
   * Replace the project meta wholesale. Used by IO (`documentIO`,
   * `workspaceIO`) when loading a Document from disk; Commands
   * should prefer {@link setTileSize} / {@link setMapSize} so each
   * scalar stays undoable.
   */
  setMeta(meta: DocumentMeta): void {
    useDocumentStore.getState().setMeta(meta);
    this.emitter.emit({ kind: 'document:meta' });
  }

  /** Change the tile cell size. Command-driven. */
  setTileSize(tileSize: number): void {
    const prev = useDocumentStore.getState().meta;
    useDocumentStore.getState().setMeta({ ...prev, tileSize });
    this.emitter.emit({ kind: 'document:meta' });
  }

  /** Change the map dimensions (pixel size). Command-driven. */
  setMapSize(mapSize: { readonly width: number; readonly height: number }): void {
    const prev = useDocumentStore.getState().meta;
    useDocumentStore.getState().setMeta({ ...prev, mapSize });
    this.emitter.emit({ kind: 'document:meta' });
  }

  // ── tile ops ────────────────────────────────────────────────────────────

  /**
   * Set the tile at (`layerId`, `coord`) to `tile` (or remove it when
   * `tile` is `null`). Used by Place/Erase commands' `do` and `undo`.
   */
  setTile(layerId: LayerId, coord: TileCoord, tile: TileLayerEntry | null): void {
    useDocumentStore.getState().setTile(layerId, coord, tile);
    this.emitter.emit({ kind: 'tile:set', layerId, coord });
  }

  /** Read the current placed tile (if any) at (`layerId`, `coord`). */
  getTile(layerId: LayerId, coord: TileCoord): TileLayerEntry | null {
    return useDocumentStore.getState().getTile(layerId, coord);
  }

  // ── layer ops ───────────────────────────────────────────────────────────

  addLayer(layer: Layer, makeActive: boolean): void {
    // Layer is always prepended (insert at index 0); `atIndex` is here so
    // the event payload documents that contract instead of guessing.
    useDocumentStore.getState().addLayer(layer, makeActive);
    this.emitter.emit({ kind: 'layer:add', layer, atIndex: 0 });
  }

  removeLayer(id: LayerId): Layer | null {
    const removed = useDocumentStore.getState().removeLayer(id);
    if (removed) this.emitter.emit({ kind: 'layer:remove', layerId: id });
    return removed;
  }

  setLayerVisible(id: LayerId, visible: boolean): void {
    useDocumentStore.getState().setLayerVisible(id, visible);
    this.emitter.emit({ kind: 'layer:visible', layerId: id, visible });
  }

  setLayerLocked(id: LayerId, locked: boolean): void {
    useDocumentStore.getState().setLayerLocked(id, locked);
    this.emitter.emit({ kind: 'layer:locked', layerId: id, locked });
  }

  /**
   * Insert `layer` at the given index. Used by MoveLayerCommand.
   * Pass the layer with its current content (this method does not
   * snapshot tiles — it just reorders the layer entries).
   */
  reorderLayer(id: LayerId, toIndex: number): void {
    useDocumentStore.getState().reorderLayer(id, toIndex);
    this.emitter.emit({ kind: 'layer:reorder', layerId: id, toIndex });
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
    this.emitter.emit({ kind: 'entity:add', entity });
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
    this.emitter.emit({ kind: 'entity:remove', entityId: id });
    return removed;
  }

  /** Replace an existing entity. No-op if the id is unknown. */
  setEntity(entity: Entity): void {
    if (!useDocumentStore.getState().getEntity(entity.id)) return;
    useDocumentStore.getState().setEntity(entity);
    this.emitter.emit({ kind: 'entity:set', entity });
  }

  /** Read the current entity (if any) for an id. */
  getEntity(id: EntityId): Entity | null {
    return useDocumentStore.getState().getEntity(id);
  }

  /** Append an entity to an Object layer's `entityOrder`. */
  appendToObjectLayer(layerId: LayerId, entityId: EntityId): boolean {
    const ok = useDocumentStore.getState().appendToObjectLayer(layerId, entityId);
    if (ok) this.emitter.emit({ kind: 'objectLayer:append', layerId, entityId });
    return ok;
  }

  /** Remove an entity from an Object layer's `entityOrder`. */
  removeFromObjectLayer(layerId: LayerId, entityId: EntityId): boolean {
    const ok = useDocumentStore.getState().removeFromObjectLayer(layerId, entityId);
    if (ok) this.emitter.emit({ kind: 'objectLayer:remove', layerId, entityId });
    return ok;
  }

  // ── collider + CollisionLayer.colliderOrder ops ───────────────────────

  /** Add a collider to the colliders table. */
  addCollider(collider: Collider): void {
    useDocumentStore.getState().addCollider(collider);
    this.emitter.emit({ kind: 'collider:add', collider });
  }

  /**
   * Remove a collider from the colliders table AND from every
   * Collision layer's `colliderOrder` (orphan cleanup is automatic).
   */
  removeCollider(id: ColliderId): Collider | null {
    const state = useDocumentStore.getState();
    const removed = state.removeCollider(id);
    if (!removed) return null;
    for (const layer of state.layers) {
      if (layer.type === 'collision' && layer.data.colliderOrder.includes(id)) {
        state.removeFromCollisionLayer(layer.id, id);
      }
    }
    this.emitter.emit({ kind: 'collider:remove', colliderId: id });
    return removed;
  }

  setCollider(collider: Collider): void {
    if (!useDocumentStore.getState().getCollider(collider.id)) return;
    useDocumentStore.getState().setCollider(collider);
    this.emitter.emit({ kind: 'collider:set', collider });
  }

  getCollider(id: ColliderId): Collider | null {
    return useDocumentStore.getState().getCollider(id);
  }

  appendToCollisionLayer(layerId: LayerId, colliderId: ColliderId): boolean {
    const ok = useDocumentStore.getState().appendToCollisionLayer(layerId, colliderId);
    if (ok) this.emitter.emit({ kind: 'collisionLayer:append', layerId, colliderId });
    return ok;
  }

  removeFromCollisionLayer(layerId: LayerId, colliderId: ColliderId): boolean {
    const ok = useDocumentStore.getState().removeFromCollisionLayer(layerId, colliderId);
    if (ok) this.emitter.emit({ kind: 'collisionLayer:remove', layerId, colliderId });
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
