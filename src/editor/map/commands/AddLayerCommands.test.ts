/**
 * Add*LayerCommand — unit tests.
 *
 * All three (tile / object / collision) share the same shape: do
 * adds the layer (optionally making it active), undo removes it.
 * The test asserts the round-trip plus the `makeActive` branch and
 * the `kind` discriminator.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { DocumentService } from '@core/document/DocumentService';
import { useDocumentStore } from '@state/documentStore';

import { AddCollisionLayerCommand } from './AddCollisionLayerCommand';
import { AddObjectLayerCommand } from './AddObjectLayerCommand';
import { AddTileLayerCommand } from './AddTileLayerCommand';
import {
  createCollisionLayer,
  createObjectLayer,
  createTileLayer,
} from './layerFactories';

import type { CollisionLayer, ObjectLayer, TileLayer } from '@editor/map/schema/layer';

describe('AddTileLayerCommand', () => {
  beforeEach(() => {
    useDocumentStore.getState().reset();
  });

  it('do prepends the layer; undo removes it', () => {
    const service = new DocumentService();
    const layer: TileLayer = createTileLayer(useDocumentStore.getState().layers);

    const cmd = new AddTileLayerCommand(layer, true);
    cmd.do(service);

    expect(service.findLayerIndex(layer.id)).toBe(0);
    expect(useDocumentStore.getState().activeLayerId).toBe(layer.id);

    cmd.undo(service);
    expect(service.findLayerIndex(layer.id)).toBe(-1);
  });

  it('does not move activeLayerId when makeActive is false', () => {
    const service = new DocumentService();
    const before = useDocumentStore.getState().activeLayerId;
    const layer: TileLayer = createTileLayer(useDocumentStore.getState().layers);

    new AddTileLayerCommand(layer, false).do(service);
    expect(useDocumentStore.getState().activeLayerId).toBe(before);
  });

  it('kind is layer:add', () => {
    const cmd = new AddTileLayerCommand(createTileLayer([]), false);
    expect(cmd.kind).toBe('layer:add');
  });
});

describe('AddObjectLayerCommand', () => {
  beforeEach(() => {
    useDocumentStore.getState().reset();
  });

  it('do prepends the layer; undo removes it', () => {
    const service = new DocumentService();
    const layer: ObjectLayer = createObjectLayer(useDocumentStore.getState().layers);

    const cmd = new AddObjectLayerCommand(layer, true);
    cmd.do(service);

    expect(service.findLayerIndex(layer.id)).toBe(0);
    expect(useDocumentStore.getState().activeLayerId).toBe(layer.id);

    cmd.undo(service);
    expect(service.findLayerIndex(layer.id)).toBe(-1);
  });

  it('does not move activeLayerId when makeActive is false', () => {
    const service = new DocumentService();
    const before = useDocumentStore.getState().activeLayerId;
    const layer: ObjectLayer = createObjectLayer(useDocumentStore.getState().layers);

    new AddObjectLayerCommand(layer, false).do(service);
    expect(useDocumentStore.getState().activeLayerId).toBe(before);
  });

  it('kind is layer:add-object', () => {
    const cmd = new AddObjectLayerCommand(createObjectLayer([]), false);
    expect(cmd.kind).toBe('layer:add-object');
  });
});

describe('AddCollisionLayerCommand', () => {
  beforeEach(() => {
    useDocumentStore.getState().reset();
  });

  it('do prepends the layer; undo removes it', () => {
    const service = new DocumentService();
    const layer: CollisionLayer = createCollisionLayer(useDocumentStore.getState().layers);

    const cmd = new AddCollisionLayerCommand(layer, true);
    cmd.do(service);

    expect(service.findLayerIndex(layer.id)).toBe(0);
    expect(useDocumentStore.getState().activeLayerId).toBe(layer.id);

    cmd.undo(service);
    expect(service.findLayerIndex(layer.id)).toBe(-1);
  });

  it('does not move activeLayerId when makeActive is false', () => {
    const service = new DocumentService();
    const before = useDocumentStore.getState().activeLayerId;
    const layer: CollisionLayer = createCollisionLayer(useDocumentStore.getState().layers);

    new AddCollisionLayerCommand(layer, false).do(service);
    expect(useDocumentStore.getState().activeLayerId).toBe(before);
  });

  it('kind is layer:add-collision', () => {
    const cmd = new AddCollisionLayerCommand(createCollisionLayer([]), false);
    expect(cmd.kind).toBe('layer:add-collision');
  });

  it('undo leaves the seed tile layer intact (it is the last layer)', () => {
    const service = new DocumentService();
    const layer = createCollisionLayer(useDocumentStore.getState().layers);

    const cmd = new AddCollisionLayerCommand(layer, true);
    cmd.do(service);
    cmd.undo(service);

    expect(service.layerCount()).toBe(1);
    expect(useDocumentStore.getState().layers[0]?.type).toBe('tile');
  });
});

describe('cross-command behavior', () => {
  beforeEach(() => {
    useDocumentStore.getState().reset();
  });

  it('undo of three Add*LayerCommands reduces to the seed tile layer', () => {
    const service = new DocumentService();

    const tileLayer = createTileLayer(useDocumentStore.getState().layers);
    const objectLayer = createObjectLayer([tileLayer]);
    const collisionLayer = createCollisionLayer([tileLayer, objectLayer]);

    const a = new AddTileLayerCommand(tileLayer, true);
    const b = new AddObjectLayerCommand(objectLayer, true);
    const c = new AddCollisionLayerCommand(collisionLayer, true);

    a.do(service);
    b.do(service);
    c.do(service);
    // Layers are prepended so the seed tile layer is at the END of
    // the array, not at index 0.
    const order = useDocumentStore.getState().layers.map((l) => l.id);
    const seed = useDocumentStore.getState().layers.find((l) => l.type === 'tile' && l.id !== tileLayer.id);
    expect(order).toEqual([collisionLayer.id, objectLayer.id, tileLayer.id, seed?.id]);

    c.undo(service);
    b.undo(service);
    a.undo(service);
    expect(service.layerCount()).toBe(1);
  });
});