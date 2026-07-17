/**
 * PlaceEntityCommand — unit tests.
 *
 * Verifies the do/undo symmetry: `do` adds the entity to the table
 * AND appends its id to the layer's `entityOrder`; `undo` removes
 * from both.
 */

import { describe, expect, it, beforeEach } from 'vitest';

import { DocumentService } from '@core/document/DocumentService';
import { asEntityId, asLayerId } from '@editor/map/schema/ids';
import { useDocumentStore } from '@state/documentStore';

import { AddObjectLayerCommand } from './AddObjectLayerCommand';
import { createObjectLayer } from './layerFactories';
import { PlaceEntityCommand, placeEntity } from './PlaceEntityCommand';

import type { Entity } from '@editor/map/schema/entity';

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
  });
};

const makeEntity = (id: string): Entity => ({
  id: asEntityId(id),
  type: 'sprite',
  name: `Entity ${id}`,
  position: { x: 10, y: 20 },
  size: { width: 32, height: 32 },
  rotation: 0,
  properties: { entries: new Map() },
});

describe('PlaceEntityCommand', () => {
  beforeEach(() => {
    resetStore();
  });

  it('do adds the entity and appends to the layer order; undo removes both', () => {
    const service = new DocumentService();
    const layer = createObjectLayer(useDocumentStore.getState().layers);
    new AddObjectLayerCommand(layer, true).do(service);
    // Move active layer to the new object layer (AddObjectLayerCommand
    // doesn't move active when makeActive=true, the store does — but
    // here we drive the command directly, so we set it ourselves).
    useDocumentStore.getState().setActiveLayer(layer.id);

    const entity = makeEntity('e1');
    const cmd = new PlaceEntityCommand(layer.id, entity);

    cmd.do(service);
    expect(service.getEntity(entity.id)).toEqual(entity);
    const snap = service.snapshot();
    const objectLayer = snap.layers.find((l) => l.id === layer.id);
    expect(objectLayer?.type === 'object' && objectLayer.data.entityOrder).toContain(entity.id);

    cmd.undo(service);
    expect(service.getEntity(entity.id)).toBeNull();
    const after = service.snapshot();
    const afterLayer = after.layers.find((l) => l.id === layer.id);
    expect(afterLayer?.type === 'object' && afterLayer.data.entityOrder).not.toContain(entity.id);
  });

  it('placeEntity generates a fresh id', () => {
    const service = new DocumentService();
    const layer = createObjectLayer(useDocumentStore.getState().layers);
    new AddObjectLayerCommand(layer, true).do(service);
    useDocumentStore.getState().setActiveLayer(layer.id);

    const cmd = placeEntity(layer.id, {
      type: 'sprite',
      name: 'A',
      position: { x: 0, y: 0 },
      size: { width: 32, height: 32 },
      rotation: 0,
      properties: { entries: new Map() },
    });
    cmd.do(service);
    expect(cmd.placedEntity.id).toMatch(/^entity\./);
    expect(service.getEntity(cmd.placedEntity.id)).not.toBeNull();
  });
});
