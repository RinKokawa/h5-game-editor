/**
 * PlaceColliderCommand — unit tests.
 *
 * Verifies do/undo symmetry: do adds the collider to the table
 * AND appends its id to the layer's `colliderOrder`; undo removes
 * from both.
 */

import { describe, expect, it, beforeEach } from 'vitest';

import { DocumentService } from '@core/document/DocumentService';
import { asColliderId, asLayerId } from '@editor/map/schema/ids';
import { useDocumentStore } from '@state/documentStore';

import { AddCollisionLayerCommand } from './AddCollisionLayerCommand';
import { createCollisionLayer } from './layerFactories';
import { PlaceColliderCommand, placeCollider } from './PlaceColliderCommand';

import type { BoxCollider } from '@editor/map/schema/collider';

const resetStore = (): void => {
  useDocumentStore.setState({
    meta: { tileSize: 32, mapSize: { width: 32 * 60, height: 32 * 34 } },
    layers: [
      {
        id: asLayerId('seed.tile'),
        type: 'tile',
        name: 'Layer 1',
        visible: true,
        locked: false,
        opacity: 1,
        properties: { entries: new Map() },
        data: { tiles: new Map() },
      },
    ],
    activeLayerId: asLayerId('seed.tile'),
    entities: new Map(),
    colliders: new Map(),
  });
};

const makeBox = (id: string): BoxCollider => ({
  id: asColliderId(id),
  type: 'box',
  kind: 'solid',
  name: `Collider ${id}`,
  position: { x: 10, y: 20 },
  size: { width: 32, height: 32 },
  rotation: 0,
  properties: { entries: new Map() },
});

describe('PlaceColliderCommand', () => {
  beforeEach(() => {
    resetStore();
  });

  it('do adds the collider and appends to the layer order; undo removes both', () => {
    const service = new DocumentService();
    const layer = createCollisionLayer(useDocumentStore.getState().layers);
    new AddCollisionLayerCommand(layer, true).do(service);
    useDocumentStore.getState().setActiveLayer(layer.id);

    const collider = makeBox('c1');
    const cmd = new PlaceColliderCommand(layer.id, collider);

    cmd.do(service);
    expect(service.getCollider(collider.id)).toEqual(collider);
    const snap = service.snapshot();
    const collisionLayer = snap.layers.find((l) => l.id === layer.id);
    expect(collisionLayer?.type === 'collision' && collisionLayer.data.colliderOrder).toContain(
      collider.id,
    );

    cmd.undo(service);
    expect(service.getCollider(collider.id)).toBeNull();
    const after = service.snapshot();
    const afterLayer = after.layers.find((l) => l.id === layer.id);
    expect(afterLayer?.type === 'collision' && afterLayer.data.colliderOrder).not.toContain(
      collider.id,
    );
  });

  it('placeCollider generates a fresh id', () => {
    const service = new DocumentService();
    const layer = createCollisionLayer(useDocumentStore.getState().layers);
    new AddCollisionLayerCommand(layer, true).do(service);
    useDocumentStore.getState().setActiveLayer(layer.id);

    const cmd = placeCollider(layer.id, {
      type: 'box',
      kind: 'solid',
      name: 'A',
      position: { x: 0, y: 0 },
      size: { width: 32, height: 32 },
      rotation: 0,
      properties: { entries: new Map() },
    });
    cmd.do(service);
    expect(cmd.placedCollider.id).toMatch(/^collider\./);
    expect(service.getCollider(cmd.placedCollider.id)).not.toBeNull();
  });
});
