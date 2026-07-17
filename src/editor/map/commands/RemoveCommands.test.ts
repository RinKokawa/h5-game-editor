/**
 * RemoveEntityCommand / RemoveColliderCommand — unit tests.
 *
 * Both commands do the same shape:
 *   do   — capture the entity / collider + every layer reference,
 *          delegate the removal to DocumentService (which already
 *          strips dangling layer references).
 *   undo — re-insert the entity / collider and re-append the id to
 *          each captured layer.
 *
 * They must also be safe on stale ids (entity / collider already gone)
 * so a Delete keypress against a removed item doesn't throw.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { DocumentService } from '@core/document/DocumentService';
import { asColliderId, asEntityId } from '@editor/map/schema/ids';
import { useDocumentStore } from '@state/documentStore';

import {
  createCollisionLayer,
  createObjectLayer,
} from './layerFactories';
import { RemoveColliderCommand } from './RemoveColliderCommand';
import { RemoveEntityCommand } from './RemoveEntityCommand';

import type { Collider } from '@editor/map/schema/collider';
import type { Entity } from '@editor/map/schema/entity';
import type { LayerId } from '@editor/map/schema/ids';
import type { Layer } from '@editor/map/schema/layer';

const resetStore = (): void => {
  useDocumentStore.getState().reset();
};

const makeEntity = (id: string, x = 0): Entity => ({
  id: asEntityId(id),
  type: 'sprite',
  name: `Entity ${id}`,
  position: { x, y: 0 },
  size: { width: 16, height: 16 },
  rotation: 0,
  properties: { entries: new Map() },
});

const makeBox = (id: string): Collider => ({
  id: asColliderId(id),
  type: 'box',
  kind: 'solid',
  name: `Collider ${id}`,
  position: { x: 0, y: 0 },
  size: { width: 10, height: 10 },
  rotation: 0,
  properties: { entries: new Map() },
});

const entityOrderFor = (
  layers: ReadonlyArray<Layer>,
  id: LayerId,
): readonly string[] => {
  const layer = layers.find((l) => l.id === id);
  if (!layer || layer.type !== 'object') return [];
  return layer.data.entityOrder;
};

const colliderOrderFor = (
  layers: ReadonlyArray<Layer>,
  id: LayerId,
): readonly string[] => {
  const layer = layers.find((l) => l.id === id);
  if (!layer || layer.type !== 'collision') return [];
  return layer.data.colliderOrder;
};

describe('RemoveEntityCommand', () => {
  beforeEach(resetStore);

  it('do removes from the entity table; undo restores it', () => {
    const service = new DocumentService();
    const entity = makeEntity('e1');
    service.addEntity(entity);

    const cmd = new RemoveEntityCommand(entity.id);
    cmd.do(service);
    expect(service.getEntity(entity.id)).toBeNull();

    cmd.undo(service);
    expect(service.getEntity(entity.id)?.id).toBe(entity.id);
  });

  it('undo restores the entity to every layer that referenced it', () => {
    const service = new DocumentService();
    const objA = createObjectLayer(useDocumentStore.getState().layers, 'A');
    const objB = createObjectLayer([objA, ...useDocumentStore.getState().layers], 'B');
    service.addLayer(objA, false);
    service.addLayer(objB, false);

    const entity = makeEntity('shared');
    service.addEntity(entity);
    service.appendToObjectLayer(objA.id, entity.id);
    service.appendToObjectLayer(objB.id, entity.id);

    const cmd = new RemoveEntityCommand(entity.id);
    cmd.do(service);
    expect(entityOrderFor(useDocumentStore.getState().layers, objA.id)).not.toContain(entity.id);
    expect(entityOrderFor(useDocumentStore.getState().layers, objB.id)).not.toContain(entity.id);

    cmd.undo(service);
    expect(service.getEntity(entity.id)?.id).toBe(entity.id);
    expect(entityOrderFor(useDocumentStore.getState().layers, objA.id)).toContain(entity.id);
    expect(entityOrderFor(useDocumentStore.getState().layers, objB.id)).toContain(entity.id);
  });

  it('is a no-op when the entity is already missing', () => {
    const service = new DocumentService();
    const cmd = new RemoveEntityCommand(asEntityId('ghost'));
    expect(() => cmd.do(service)).not.toThrow();
    expect(() => cmd.undo(service)).not.toThrow();
    expect(service.getEntity(asEntityId('ghost'))).toBeNull();
  });

  it('kind is entity:remove', () => {
    const cmd = new RemoveEntityCommand(asEntityId('e1'));
    expect(cmd.kind).toBe('entity:remove');
  });
});

describe('RemoveColliderCommand', () => {
  beforeEach(resetStore);

  it('do removes from the collider table; undo restores it', () => {
    const service = new DocumentService();
    const c = makeBox('c1');
    service.addCollider(c);

    const cmd = new RemoveColliderCommand(c.id);
    cmd.do(service);
    expect(service.getCollider(c.id)).toBeNull();

    cmd.undo(service);
    expect(service.getCollider(c.id)?.id).toBe(c.id);
  });

  it('undo restores the collider to every layer that referenced it', () => {
    const service = new DocumentService();
    const colA = createCollisionLayer(useDocumentStore.getState().layers, 'A');
    const colB = createCollisionLayer([colA, ...useDocumentStore.getState().layers], 'B');
    service.addLayer(colA, false);
    service.addLayer(colB, false);

    const c = makeBox('shared');
    service.addCollider(c);
    service.appendToCollisionLayer(colA.id, c.id);
    service.appendToCollisionLayer(colB.id, c.id);

    const cmd = new RemoveColliderCommand(c.id);
    cmd.do(service);
    expect(colliderOrderFor(useDocumentStore.getState().layers, colA.id)).not.toContain(c.id);
    expect(colliderOrderFor(useDocumentStore.getState().layers, colB.id)).not.toContain(c.id);

    cmd.undo(service);
    expect(service.getCollider(c.id)?.id).toBe(c.id);
    expect(colliderOrderFor(useDocumentStore.getState().layers, colA.id)).toContain(c.id);
    expect(colliderOrderFor(useDocumentStore.getState().layers, colB.id)).toContain(c.id);
  });

  it('is a no-op when the collider is already missing', () => {
    const service = new DocumentService();
    const cmd = new RemoveColliderCommand(asColliderId('ghost'));
    expect(() => cmd.do(service)).not.toThrow();
    expect(() => cmd.undo(service)).not.toThrow();
    expect(service.getCollider(asColliderId('ghost'))).toBeNull();
  });

  it('kind is collider:remove', () => {
    const cmd = new RemoveColliderCommand(asColliderId('c1'));
    expect(cmd.kind).toBe('collider:remove');
  });
});