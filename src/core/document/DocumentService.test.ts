/**
 * DocumentService — unit tests.
 *
 * Step 26 lifts `core/` coverage above the 70% line by driving every
 * DocumentService mutator end-to-end against the real documentStore,
 * asserting the DocumentChange payloads the emitter fires, and
 * covering the orphan-cleanup invariants on entity / collider
 * removal across layers.
 *
 * Each test starts from a reset documentStore (reset() rebuilds
 * the seed tile layer) so the suite is order-independent.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { asColliderId, asEntityId, asLayerId } from '@editor/map/schema/ids';
import { useDocumentStore } from '@state/documentStore';

import { DocumentService } from './DocumentService';

import type { DocumentChange } from './DocumentService';
import type { Collider } from '@editor/map/schema/collider';
import type { Entity } from '@editor/map/schema/entity';
import type { ColliderId, EntityId, LayerId } from '@editor/map/schema/ids';
import type { CollisionLayer, ObjectLayer, TileLayer } from '@editor/map/schema/layer';

const entityOrderFor = (
  layers: ReadonlyArray<{ id: LayerId; type: string; data?: unknown }>,
  id: LayerId,
): readonly EntityId[] => {
  const layer = layers.find((l) => l.id === id);
  if (!layer || layer.type !== 'object') return [];
  return (layer.data as { entityOrder: readonly EntityId[] }).entityOrder;
};

const colliderOrderFor = (
  layers: ReadonlyArray<{ id: LayerId; type: string; data?: unknown }>,
  id: LayerId,
): readonly ColliderId[] => {
  const layer = layers.find((l) => l.id === id);
  if (!layer || layer.type !== 'collision') return [];
  return (layer.data as { colliderOrder: readonly ColliderId[] }).colliderOrder;
};

const tileEntry = (id = 1) => ({
  tilesetId: 'placeholder',
  tileId: id as never,
  rotation: 0 as const,
  flipX: false,
  flipY: false,
});

const seedTileLayer = (): TileLayer => {
  // The seed is the first TileLayer in the document; layers are
  // prepended so it lives at the END of the array, not at index 0.
  const layer = useDocumentStore
    .getState()
    .layers.find((l): l is TileLayer => l.type === 'tile');
  if (!layer) throw new Error('seed layer missing');
  return layer;
};

const makeObjectLayer = (id = 'layer.object.1'): ObjectLayer => ({
  id: asLayerId(id),
  type: 'object',
  name: 'Objects',
  visible: true,
  locked: false,
  opacity: 1,
  properties: { entries: new Map() },
  data: { entityOrder: [] },
});

const makeCollisionLayer = (id = 'layer.collision.1'): CollisionLayer => ({
  id: asLayerId(id),
  type: 'collision',
  name: 'Colliders',
  visible: true,
  locked: false,
  opacity: 1,
  properties: { entries: new Map() },
  data: { colliderOrder: [] },
});

const makeEntity = (id: string, x = 0): Entity => ({
  id: asEntityId(id),
  type: 'sprite',
  name: 'E',
  position: { x, y: 0 },
  size: { width: 16, height: 16 },
  rotation: 0,
  properties: { entries: new Map() },
});

const makeBoxCollider = (id: string): Collider => ({
  id: asColliderId(id),
  type: 'box',
  kind: 'solid',
  name: 'C',
  position: { x: 0, y: 0 },
  size: { width: 10, height: 10 },
  rotation: 0,
  properties: { entries: new Map() },
});

describe('DocumentService', () => {
  let svc: DocumentService;
  let events: DocumentChange[];

  beforeEach(() => {
    useDocumentStore.getState().reset();
    svc = new DocumentService();
    events = [];
    svc.subscribe((c) => events.push(c));
  });

  afterEach(() => {
    useDocumentStore.getState().reset();
  });

  describe('meta ops', () => {
    it('setTileSize mutates meta and emits document:meta', () => {
      svc.setTileSize(64);
      expect(useDocumentStore.getState().meta.tileSize).toBe(64);
      expect(events.at(-1)?.kind).toBe('document:meta');
    });

    it('setMapSize mutates meta and emits document:meta', () => {
      svc.setMapSize({ width: 1024, height: 768 });
      expect(useDocumentStore.getState().meta.mapSize).toEqual({ width: 1024, height: 768 });
      expect(events.at(-1)?.kind).toBe('document:meta');
    });

    it('setMeta replaces the whole meta block', () => {
      svc.setMeta({ tileSize: 16, mapSize: { width: 256, height: 256 } });
      expect(useDocumentStore.getState().meta).toEqual({
        tileSize: 16,
        mapSize: { width: 256, height: 256 },
      });
    });

    it('getMeta reads the current meta', () => {
      expect(svc.getMeta().tileSize).toBe(useDocumentStore.getState().meta.tileSize);
    });
  });

  describe('tile ops', () => {
    it('setTile places a tile and emits tile:set with location info', () => {
      const layer = seedTileLayer();
      svc.setTile(layer.id, { x: 1, y: 2 }, tileEntry(7));
      expect(svc.getTile(layer.id, { x: 1, y: 2 })?.tileId).toBe(7);
      const last = events.at(-1);
      expect(last?.kind).toBe('tile:set');
      if (last?.kind === 'tile:set') {
        expect(last.layerId).toBe(layer.id);
        expect(last.coord).toEqual({ x: 1, y: 2 });
      }
    });

    it('setTile with null removes the tile', () => {
      const layer = seedTileLayer();
      svc.setTile(layer.id, { x: 1, y: 2 }, tileEntry(7));
      svc.setTile(layer.id, { x: 1, y: 2 }, null);
      expect(svc.getTile(layer.id, { x: 1, y: 2 })).toBeNull();
    });

    it('setTile on an unknown layer emits no payload mutation (event still fires as a tick)', () => {
      // The service emits `tile:set` unconditionally as a "tick" so
      // Pixi subscribers can opt into re-rendering. Subscribers that
      // need finer-grained dedup compare their own snapshot.
      const before = events.length;
      svc.setTile(asLayerId('layer.tile.missing'), { x: 0, y: 0 }, tileEntry(1));
      expect(events.length).toBe(before + 1);
      expect(svc.getTile(asLayerId('layer.tile.missing'), { x: 0, y: 0 })).toBeNull();
    });
  });

  describe('layer ops', () => {
    it('addLayer prepends and emits layer:add with atIndex=0', () => {
      const layer = makeObjectLayer();
      svc.addLayer(layer, true);
      const last = events.at(-1);
      expect(last?.kind).toBe('layer:add');
      if (last?.kind === 'layer:add') {
        expect(last.atIndex).toBe(0);
        expect(last.layer).toBe(layer);
      }
      expect(useDocumentStore.getState().activeLayerId).toBe(layer.id);
    });

    it('addLayer without makeActive leaves activeLayerId untouched', () => {
      const before = useDocumentStore.getState().activeLayerId;
      const layer = makeObjectLayer();
      svc.addLayer(layer, false);
      expect(useDocumentStore.getState().activeLayerId).toBe(before);
    });

    it('removeLayer returns the layer and emits layer:remove', () => {
      const layer = makeObjectLayer();
      svc.addLayer(layer, false);
      const removed = svc.removeLayer(layer.id);
      expect(removed?.id).toBe(layer.id);
      expect(events.at(-1)?.kind).toBe('layer:remove');
    });

    it('removeLayer on the last layer is a no-op (seed tile layer is preserved)', () => {
      const seed = seedTileLayer();
      const result = svc.removeLayer(seed.id);
      // Seed tile layer IS the last layer, so removal must refuse.
      expect(result).toBeNull();
      expect(useDocumentStore.getState().layers.length).toBe(1);
    });

    it('setLayerVisible mutates and emits layer:visible', () => {
      const layer = makeObjectLayer();
      svc.addLayer(layer, false);
      svc.setLayerVisible(layer.id, false);
      expect(events.at(-1)?.kind).toBe('layer:visible');
      const target = useDocumentStore.getState().layers.find((l) => l.id === layer.id);
      expect(target?.visible).toBe(false);
    });

    it('setLayerLocked mutates and emits layer:locked', () => {
      const layer = makeObjectLayer();
      svc.addLayer(layer, false);
      svc.setLayerLocked(layer.id, true);
      expect(events.at(-1)?.kind).toBe('layer:locked');
      const target = useDocumentStore.getState().layers.find((l) => l.id === layer.id);
      expect(target?.locked).toBe(true);
    });

    it('reorderLayer moves the layer and emits layer:reorder', () => {
      const a = makeObjectLayer('a');
      const b = makeObjectLayer('b');
      svc.addLayer(a, false);
      svc.addLayer(b, false);
      // layers order is now [b, a, seed]
      const seed = seedTileLayer().id;
      svc.reorderLayer(a.id, 2); // move `a` from index 1 → index 2
      const order = useDocumentStore.getState().layers.map((l) => l.id);
      expect(order).toEqual([b.id, seed, a.id]);
      expect(events.at(-1)?.kind).toBe('layer:reorder');
    });

    it('reorderLayer with the same index emits but does not change order', () => {
      const layer = makeObjectLayer();
      svc.addLayer(layer, false);
      const before = useDocumentStore.getState().layers.map((l) => l.id);
      svc.reorderLayer(layer.id, 0);
      const after = useDocumentStore.getState().layers.map((l) => l.id);
      expect(after).toEqual(before);
      expect(events.at(-1)?.kind).toBe('layer:reorder');
    });

    it('layerCount / findLayerIndex return correct values', () => {
      expect(svc.layerCount()).toBe(1);
      const seed = seedTileLayer();
      expect(svc.findLayerIndex(seed.id)).toBe(0);
    });
  });

  describe('entity ops', () => {
    it('addEntity + getEntity round-trip', () => {
      const entity = makeEntity('e1');
      svc.addEntity(entity);
      expect(svc.getEntity(entity.id)?.id).toBe(entity.id);
      expect(events.at(-1)?.kind).toBe('entity:add');
    });

    it('setEntity replaces an existing entity and no-ops on missing', () => {
      const entity = makeEntity('e1');
      svc.addEntity(entity);
      const before = events.length;
      svc.setEntity(makeEntity('unknown')); // unknown id
      expect(events.length).toBe(before);
      svc.setEntity({ ...entity, name: 'Updated' });
      expect(svc.getEntity(entity.id)?.name).toBe('Updated');
      expect(events.at(-1)?.kind).toBe('entity:set');
    });

    it('removeEntity clears the entity AND every layer reference', () => {
      const entity = makeEntity('e1');
      const obj = makeObjectLayer();
      svc.addLayer(obj, false);
      svc.addEntity(entity);
      svc.appendToObjectLayer(obj.id, entity.id);
      const orderBefore = entityOrderFor(useDocumentStore.getState().layers, obj.id);
      expect(orderBefore).toContain(entity.id);

      svc.removeEntity(entity.id);
      expect(svc.getEntity(entity.id)).toBeNull();
      const orderAfter = entityOrderFor(useDocumentStore.getState().layers, obj.id);
      expect(orderAfter).not.toContain(entity.id);
    });

    it('removeEntity strips dangling references AND emits entity:remove', () => {
      const entity = makeEntity('e1');
      const obj = makeObjectLayer();
      svc.addLayer(obj, false);
      svc.addEntity(entity);
      svc.appendToObjectLayer(obj.id, entity.id);
      events.length = 0;
      svc.removeEntity(entity.id);
      const kinds = events.map((e) => e.kind);
      // Orphan cleanup bypasses per-layer events (they're an internal
      // consistency step, not a user-visible mutation). The
      // `entity:remove` event is the one subscribers care about.
      expect(kinds).toContain('entity:remove');
      const order = entityOrderFor(useDocumentStore.getState().layers, obj.id);
      expect(order).not.toContain(entity.id);
    });

    it('appendToObjectLayer emits objectLayer:append and is idempotent', () => {
      const entity = makeEntity('e1');
      const obj = makeObjectLayer();
      svc.addLayer(obj, false);
      svc.addEntity(entity);
      expect(svc.appendToObjectLayer(obj.id, entity.id)).toBe(true);
      expect(svc.appendToObjectLayer(obj.id, entity.id)).toBe(false); // already there
      const last = events.filter((e) => e.kind === 'objectLayer:append').at(-1);
      expect(last?.kind).toBe('objectLayer:append');
    });

    it('removeFromObjectLayer returns false when the id is not present', () => {
      const obj = makeObjectLayer();
      svc.addLayer(obj, false);
      expect(svc.removeFromObjectLayer(obj.id, asEntityId('nope'))).toBe(false);
    });
  });

  describe('collider ops', () => {
    it('addCollider + getCollider round-trip', () => {
      const c = makeBoxCollider('c1');
      svc.addCollider(c);
      expect(svc.getCollider(c.id)?.id).toBe(c.id);
      expect(events.at(-1)?.kind).toBe('collider:add');
    });

    it('removeCollider clears the collider AND every layer reference', () => {
      const c = makeBoxCollider('c1');
      const col = makeCollisionLayer();
      svc.addLayer(col, false);
      svc.addCollider(c);
      svc.appendToCollisionLayer(col.id, c.id);
      svc.removeCollider(c.id);
      expect(svc.getCollider(c.id)).toBeNull();
      const order = colliderOrderFor(useDocumentStore.getState().layers, col.id);
      expect(order).not.toContain(c.id);
    });

    it('removeCollider strips dangling references AND emits collider:remove', () => {
      const c = makeBoxCollider('c1');
      const col = makeCollisionLayer();
      svc.addLayer(col, false);
      svc.addCollider(c);
      svc.appendToCollisionLayer(col.id, c.id);
      events.length = 0;
      svc.removeCollider(c.id);
      const kinds = events.map((e) => e.kind);
      // Orphan cleanup bypasses per-layer events for the same reason
      // as removeEntity above — `collider:remove` is the only event a
      // subscriber acts on.
      expect(kinds).toContain('collider:remove');
      const order = colliderOrderFor(useDocumentStore.getState().layers, col.id);
      expect(order).not.toContain(c.id);
    });

    it('setCollider replaces an existing collider', () => {
      const c = makeBoxCollider('c1');
      svc.addCollider(c);
      const updated: Collider = { ...c, name: 'Renamed' };
      svc.setCollider(updated);
      expect(svc.getCollider(c.id)?.name).toBe('Renamed');
    });

    it('appendToCollisionLayer is idempotent', () => {
      const c = makeBoxCollider('c1');
      const col = makeCollisionLayer();
      svc.addLayer(col, false);
      svc.addCollider(c);
      expect(svc.appendToCollisionLayer(col.id, c.id)).toBe(true);
      expect(svc.appendToCollisionLayer(col.id, c.id)).toBe(false);
    });

    it('removeFromCollisionLayer returns false when id is missing', () => {
      const col = makeCollisionLayer();
      svc.addLayer(col, false);
      expect(svc.removeFromCollisionLayer(col.id, asColliderId('nope'))).toBe(false);
    });
  });

  describe('snapshot', () => {
    it('returns a frozen-shape mirror of the document store', () => {
      const snap = svc.snapshot();
      expect(snap.layers.length).toBe(useDocumentStore.getState().layers.length);
      expect(snap.activeLayerId).toBe(useDocumentStore.getState().activeLayerId);
      expect(snap.meta).toEqual(useDocumentStore.getState().meta);
      expect(snap.entities).toBe(useDocumentStore.getState().entities);
      expect(snap.colliders).toBe(useDocumentStore.getState().colliders);
    });
  });

  describe('subscribe', () => {
    it('returns an unsubscribe function that detaches the listener', () => {
      const calls: DocumentChange[] = [];
      const unsub = svc.subscribe((c) => calls.push(c));
      svc.setTileSize(99);
      expect(calls.length).toBe(1);
      unsub();
      svc.setTileSize(100);
      expect(calls.length).toBe(1);
    });
  });
});