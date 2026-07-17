/**
 * documentSerializer — round-trip and error-path coverage.
 *
 * Serializer is pure (no Document store mutation), so these tests
 * construct minimal `Layer` / `Entity` / `Collider` values directly
 * rather than going through Commands. Each test asserts both the
 * JSON shape and the in-memory `LoadedDocument` shape that callers
 * (`documentIO.ts` / `workspaceIO.ts`) will pass to `setState`.
 */

import { describe, expect, it } from 'vitest';

import {
  deserializeDocument,
  serializeDocument,
} from '@core/serialization/documentSerializer';
import { asColliderId, asEntityId, asLayerId, asTileId, asTilesetId } from '@editor/map/schema/ids';

import type { BoxCollider } from '@editor/map/schema/collider';
import type { Entity } from '@editor/map/schema/entity';
import type { TileCoordKey } from '@editor/map/schema/ids';
import type { CollisionLayer, ObjectLayer, TileLayer } from '@editor/map/schema/layer';
import type { PlacedTile } from '@editor/map/schema/tile';

const tileLayer = (
  id: string,
  tiles: ReadonlyArray<[TileCoordKey, PlacedTile]>,
): TileLayer => ({
  id: asLayerId(id),
  type: 'tile',
  name: `Tile ${id}`,
  visible: true,
  locked: false,
  opacity: 1,
  properties: { entries: new Map() },
  data: { tiles: new Map(tiles) },
});

const objectLayer = (id: string, order: ReadonlyArray<string>): ObjectLayer => ({
  id: asLayerId(id),
  type: 'object',
  name: `Object ${id}`,
  visible: true,
  locked: false,
  opacity: 1,
  properties: { entries: new Map() },
  data: { entityOrder: order.map(asEntityId) },
});

const collisionLayer = (id: string, order: ReadonlyArray<string>): CollisionLayer => ({
  id: asLayerId(id),
  type: 'collision',
  name: `Collision ${id}`,
  visible: true,
  locked: false,
  opacity: 1,
  properties: { entries: new Map() },
  data: { colliderOrder: order.map(asColliderId) },
});

const makeEntity = (id: string): Entity => ({
  id: asEntityId(id),
  type: 'sprite',
  name: `Entity ${id}`,
  position: { x: 10, y: 20 },
  size: { width: 32, height: 32 },
  rotation: 0,
  properties: { entries: new Map() },
});

const makeCollider = (id: string): BoxCollider => ({
  id: asColliderId(id),
  name: `Collider ${id}`,
  kind: 'solid',
  type: 'box',
  position: { x: 100, y: 200 },
  size: { width: 32, height: 32 },
  rotation: 0,
  properties: { entries: new Map() },
});

describe('documentSerializer — round-trip', () => {
  const meta32 = { tileSize: 32, mapSize: { width: 1920, height: 1080 } };

  it('serializes a tile-only document and round-trips losslessly', () => {
    const placed: PlacedTile = {
      tilesetId: asTilesetId('placeholder'),
      tileId: asTileId(3),
      rotation: 90,
      flipX: false,
      flipY: true,
    };
    const layer = tileLayer('L1', [['1,2' as TileCoordKey, placed]]);
    const entities = new Map([[asEntityId('e1'), makeEntity('e1')]]);
    const colliders = new Map();

    const serialized = serializeDocument({
      meta: meta32,
      layers: [layer],
      entities,
      colliders,
    });

    expect(serialized.version).toBe(1);
    expect(serialized.meta).toEqual(meta32);
    expect(serialized.layers).toHaveLength(1);
    expect(serialized.entities).toEqual([[asEntityId('e1'), makeEntity('e1')]]);

    const loaded = deserializeDocument(JSON.parse(JSON.stringify(serialized)));
    expect(loaded.meta).toEqual(meta32);
    expect(loaded.layers).toHaveLength(1);
    const round = loaded.layers[0];
    expect(round?.type).toBe('tile');
    if (round?.type === 'tile') {
      expect(round.data.tiles.get('1,2' as never)).toEqual(placed);
    }
    expect(loaded.entities.get(asEntityId('e1'))).toEqual(makeEntity('e1'));
    expect(loaded.colliders.size).toBe(0);
  });

  it('serializes an ObjectLayer and preserves entityOrder', () => {
    const layer = objectLayer('O1', ['e1', 'e2']);
    const entities = new Map([
      [asEntityId('e1'), makeEntity('e1')],
      [asEntityId('e2'), makeEntity('e2')],
    ]);
    const serialized = serializeDocument({
      meta: meta32,
      layers: [layer],
      entities,
      colliders: new Map(),
    });
    const obj = serialized.layers[0];
    expect(obj?.type).toBe('object');

    const loaded = deserializeDocument(JSON.parse(JSON.stringify(serialized)));
    const round = loaded.layers[0];
    expect(round?.type).toBe('object');
    if (round?.type === 'object') {
      expect(round.data.entityOrder).toEqual([asEntityId('e1'), asEntityId('e2')]);
    }
  });

  it('serializes a CollisionLayer with a box collider', () => {
    const layer = collisionLayer('C1', ['c1']);
    const colliders = new Map([[asColliderId('c1'), makeCollider('c1')]]);
    const serialized = serializeDocument({
      meta: meta32,
      layers: [layer],
      entities: new Map(),
      colliders,
    });
    const obj = serialized.layers[0];
    expect(obj?.type).toBe('collision');

    const loaded = deserializeDocument(JSON.parse(JSON.stringify(serialized)));
    const round = loaded.layers[0];
    expect(round?.type).toBe('collision');
    if (round?.type === 'collision') {
      expect(round.data.colliderOrder).toEqual([asColliderId('c1')]);
    }
    expect(loaded.colliders.get(asColliderId('c1'))).toEqual(makeCollider('c1'));
  });

  it('handles a mixed document with all three layer kinds', () => {
    const layers = [tileLayer('T', []), objectLayer('O', ['e1']), collisionLayer('C', ['c1'])];
    const entities = new Map([[asEntityId('e1'), makeEntity('e1')]]);
    const colliders = new Map([[asColliderId('c1'), makeCollider('c1')]]);
    const serialized = serializeDocument({
      meta: { tileSize: 16, mapSize: { width: 800, height: 600 } },
      layers,
      entities,
      colliders,
    });
    expect(serialized.layers.map((l) => l.type)).toEqual(['tile', 'object', 'collision']);

    const loaded = deserializeDocument(JSON.parse(JSON.stringify(serialized)));
    expect(loaded.layers.map((l) => l.type)).toEqual(['tile', 'object', 'collision']);
    expect(loaded.entities.size).toBe(1);
    expect(loaded.colliders.size).toBe(1);
  });

  it('defaults activeLayerId to the first layer on load', () => {
    const layers = [tileLayer('first', []), tileLayer('second', [])];
    const loaded = deserializeDocument(
      JSON.parse(
        JSON.stringify(
          serializeDocument({
            meta: { tileSize: 32, mapSize: { width: 100, height: 100 } },
            layers,
            entities: new Map(),
            colliders: new Map(),
          }),
        ),
      ),
    );
    expect(loaded.activeLayerId).toBe(asLayerId('first'));
  });
});

describe('documentSerializer — error paths', () => {
  it('rejects a non-object input', () => {
    expect(() => deserializeDocument(null)).toThrow(/unsupported document/);
    expect(() => deserializeDocument(42)).toThrow(/unsupported document/);
    expect(() => deserializeDocument('hello')).toThrow(/unsupported document/);
  });

  it('rejects a wrong version', () => {
    expect(() => deserializeDocument({ version: 2, tileSize: 32 })).toThrow(
      /unsupported document/,
    );
    expect(() => deserializeDocument({})).toThrow(/unsupported document/);
  });

  it('rejects a missing meta', () => {
    expect(() => deserializeDocument({ version: 1, layers: [{}] })).toThrow(/meta missing/);
  });

  it('rejects a missing meta.mapSize', () => {
    expect(() =>
      deserializeDocument({ version: 1, meta: { tileSize: 32 }, layers: [{}] }),
    ).toThrow(/meta\.mapSize missing/);
  });

  it('rejects a missing layers array', () => {
    expect(() =>
      deserializeDocument({
        version: 1,
        meta: { tileSize: 32, mapSize: { width: 1, height: 1 } },
      }),
    ).toThrow(/layers missing/);
  });

  it('rejects an empty layers array', () => {
    expect(() =>
      deserializeDocument({
        version: 1,
        meta: { tileSize: 32, mapSize: { width: 1, height: 1 } },
        layers: [],
      }),
    ).toThrow(/document has no layers/);
  });

  it('rejects an unknown layer type on load', () => {
    expect(() =>
      deserializeDocument({
        version: 1,
        meta: { tileSize: 32, mapSize: { width: 1, height: 1 } },
        layers: [{ id: 'x', type: 'magic', name: 'X', data: {} }],
      }),
    ).toThrow(/unsupported layer type/);
  });

  it('tolerates a missing entities / colliders table (returns empty Maps)', () => {
    const loaded = deserializeDocument({
      version: 1,
      meta: { tileSize: 32, mapSize: { width: 1, height: 1 } },
      layers: [
        {
          id: 'L1',
          type: 'tile',
          name: 'L1',
          visible: true,
          locked: false,
          opacity: 1,
          properties: { entries: [] },
          data: { tiles: [] },
        },
      ],
    });
    expect(loaded.entities.size).toBe(0);
    expect(loaded.colliders.size).toBe(0);
  });

  it('lifts the legacy flat tileSize/mapSize shape into meta (v1.0 compat)', () => {
    // Pre-Step-21 workspaces (and main.ts-bootstrap folders created
    // before the v1.1 fix) wrote meta fields at the top level. The
    // deserializer accepts that shape and lifts them under `meta`
    // so existing folders are recoverable without manual edits.
    const loaded = deserializeDocument({
      version: 1,
      tileSize: 32,
      mapSize: { width: 1920, height: 1088 },
      layers: [
        {
          id: 'layer.tile.1',
          type: 'tile',
          name: 'Layer 1',
          visible: true,
          locked: false,
          opacity: 1,
          properties: { entries: [] },
          data: { tiles: [] },
        },
      ],
    });
    expect(loaded.meta).toEqual({ tileSize: 32, mapSize: { width: 1920, height: 1088 } });
    expect(loaded.layers).toHaveLength(1);
    expect(loaded.activeLayerId).toBe(asLayerId('layer.tile.1'));
  });
});