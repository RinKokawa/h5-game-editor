/**
 * Document serializer — Document state ↔ JSON.
 *
 * Format (v1):
 *   {
 *     "version": 1,
 *     "meta": { "tileSize": number, "mapSize": { width, height } },
 *     "layers": [Layer, ...],
 *     "entities": [[EntityId, Entity], ...],
 *     "colliders": [[ColliderId, Collider], ...]
 *   }
 *
 * Layer objects carry an explicit `type` discriminator so loading
 * preserves the union (tile | object | collision). Placed tiles are
 * encoded as a flat array of [key, tilesetId, tileId, rotation,
 * flipX, flipY] tuples — Maps serialize cleanly through
 * JSON.stringify/parse this way.
 *
 * Entity / Collider tables are similarly serialized as `Array<[Id, T]>`
 * so they round-trip without custom replacers. Property bags remain
 * lossy in v1: we keep them as `Map<string, unknown>` on load
 * because the `PropertyValue` discriminator isn't validated at the
 * serializer boundary (validation lives in a property editor).
 *
 * activeLayerId is NOT serialized: it is view-only state and
 * defaults to the first layer on load.
 *
 * Step 21: `tileSize` and `mapSize` are nested under `meta` to
 * reflect the Document schema.
 */

import type { Collider } from '@editor/map/schema/collider';
import type { DocumentMeta } from '@editor/map/schema/document';
import type { Entity } from '@editor/map/schema/entity';
import type { ColliderId, EntityId, LayerId, TileCoordKey } from '@editor/map/schema/ids';
import type { Layer } from '@editor/map/schema/layer';
import type { PropertyValue } from '@editor/map/schema/property';
import type { PlacedTile } from '@editor/map/schema/tile';

export interface SerializedDocumentV1 {
  readonly version: 1;
  readonly meta: DocumentMeta;
  readonly layers: ReadonlyArray<SerializedLayer>;
  readonly entities: ReadonlyArray<readonly [EntityId, Entity]>;
  readonly colliders: ReadonlyArray<readonly [ColliderId, Collider]>;
}

export interface SerializedLayerBase {
  readonly id: string;
  readonly name: string;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly opacity: number;
  readonly properties: { readonly entries: ReadonlyArray<readonly [string, unknown]> };
}

export interface SerializedTileLayer extends SerializedLayerBase {
  readonly type: 'tile';
  readonly data: {
    readonly tiles: ReadonlyArray<readonly [TileCoordKey, PlacedTile]>;
  };
}

export interface SerializedObjectLayer extends SerializedLayerBase {
  readonly type: 'object';
  readonly data: {
    readonly entityOrder: ReadonlyArray<EntityId>;
  };
}

export interface SerializedCollisionLayer extends SerializedLayerBase {
  readonly type: 'collision';
  readonly data: {
    readonly colliderOrder: ReadonlyArray<ColliderId>;
  };
}

export type SerializedLayer = SerializedTileLayer | SerializedObjectLayer | SerializedCollisionLayer;

export interface SerializedDocumentInput {
  readonly meta: DocumentMeta;
  readonly layers: ReadonlyArray<Layer>;
  readonly entities: ReadonlyMap<EntityId, Entity>;
  readonly colliders: ReadonlyMap<ColliderId, Collider>;
}

export interface LoadedDocument {
  readonly meta: DocumentMeta;
  readonly layers: ReadonlyArray<Layer>;
  readonly entities: ReadonlyMap<EntityId, Entity>;
  readonly colliders: ReadonlyMap<ColliderId, Collider>;
  readonly activeLayerId: LayerId;
}

export const serializeDocument = (input: SerializedDocumentInput): SerializedDocumentV1 => ({
  version: 1,
  meta: {
    tileSize: input.meta.tileSize,
    mapSize: { width: input.meta.mapSize.width, height: input.meta.mapSize.height },
  },
  layers: input.layers.map(serializeLayer),
  entities: Array.from(input.entities.entries()),
  colliders: Array.from(input.colliders.entries()),
});

const serializeLayerBase = (layer: Layer): SerializedLayerBase => ({
  id: layer.id,
  name: layer.name,
  visible: layer.visible,
  locked: layer.locked,
  opacity: layer.opacity,
  properties: {
    entries: Array.from(layer.properties.entries).map(([k, v]) => [k, v] as const),
  },
});

const serializeLayer = (layer: Layer): SerializedLayer => {
  const base = serializeLayerBase(layer);
  switch (layer.type) {
    case 'tile':
      return {
        ...base,
        type: 'tile',
        data: { tiles: Array.from(layer.data.tiles.entries()) },
      };
    case 'object':
      return {
        ...base,
        type: 'object',
        data: { entityOrder: layer.data.entityOrder },
      };
    case 'collision':
      return {
        ...base,
        type: 'collision',
        data: { colliderOrder: layer.data.colliderOrder },
      };
  }
};

export const deserializeDocument = (raw: unknown): LoadedDocument => {
  if (!isObject(raw) || raw.version !== 1) {
    throw new Error(
      `deserializeDocument: unsupported document (version=${isObject(raw) ? String(raw['version']) : '?'}).`,
    );
  }
  // Pre-Step-21 documents (and workspaces bootstrapped by main.ts
  // before it learned the v1.1 shape) carry flat `tileSize` /
  // `mapSize` at the top level instead of under `meta`. Synthesize
  // a `meta` from the legacy fields when none is present so older
  // files still load. The next save goes through `serializeDocument`
  // and writes the canonical `meta` shape, after which this branch
  // is dead. Drop the branch once we're confident no v1.0 files
  // exist in the wild (v0.2 is a safe cutover point).
  const meta =
    raw['meta'] !== undefined
      ? deserializeMeta(raw['meta'])
      : deserializeLegacyMeta(raw);
  const layersRaw = raw['layers'];
  if (!Array.isArray(layersRaw)) throw new Error('deserializeDocument: layers missing');

  const layers: Layer[] = layersRaw.map(deserializeLayer);
  const first = layers[0];
  if (!first) throw new Error('deserializeDocument: document has no layers');

  const entities = deserializeEntityTable(raw['entities']);
  const colliders = deserializeColliderTable(raw['colliders']);

  return {
    meta,
    layers,
    entities,
    colliders,
    activeLayerId: first.id,
  };
};

const deserializeMeta = (raw: unknown): DocumentMeta => {
  if (!isObject(raw)) throw new Error('deserializeDocument: meta missing');
  const tileSize = num(raw['tileSize']);
  const mapSize = raw['mapSize'];
  if (!isObject(mapSize)) throw new Error('deserializeDocument: meta.mapSize missing');
  const width = num(mapSize['width']);
  const height = num(mapSize['height']);
  return {
    tileSize,
    mapSize: { width, height },
  };
};

// v1.0→v1.1 fallback: a document with no `meta` field can still
// carry `tileSize` and `mapSize` flat at the top level (pre-Step-21
// saves, plus main.ts workspaces bootstrapped before its empty-doc
// template was fixed). If neither legacy field exists, the doc
// truly has no meta info and we throw the same "meta missing"
// error as the canonical path so error messages stay consistent.
const deserializeLegacyMeta = (raw: Record<string, unknown>): DocumentMeta => {
  if (raw['tileSize'] === undefined && raw['mapSize'] === undefined) {
    throw new Error('deserializeDocument: meta missing');
  }
  return deserializeMeta({ tileSize: raw['tileSize'], mapSize: raw['mapSize'] });
};

const deserializeLayer = (raw: unknown): Layer => {
  if (!isObject(raw)) throw new Error('deserializeDocument: layer is not an object');
  const base = {
    id: String(raw['id']) as LayerId,
    name: typeof raw['name'] === 'string' ? raw['name'] : 'Layer',
    visible: Boolean(raw['visible']),
    locked: Boolean(raw['locked']),
    opacity: num(raw['opacity'], 1),
    properties: { entries: deserializePropertyEntries(raw['properties']) },
  };

  const type = raw['type'];
  if (type === 'tile') return deserializeTileLayer(raw, base);
  if (type === 'object') return deserializeObjectLayer(raw, base);
  if (type === 'collision') return deserializeCollisionLayer(raw, base);
  throw new Error(`deserializeDocument: unsupported layer type "${String(type)}" on load.`);
};

const deserializePropertyEntries = (raw: unknown): ReadonlyMap<string, PropertyValue> => {
  if (!isObject(raw)) return new Map();
  const entriesRaw = raw['entries'];
  if (!Array.isArray(entriesRaw)) return new Map();
  const out = new Map<string, PropertyValue>();
  for (const entry of entriesRaw) {
    if (!Array.isArray(entry) || entry.length !== 2) continue;
    const [key, value] = entry as [string, PropertyValue];
    if (typeof key === 'string') out.set(key, value);
  }
  return out;
};

const deserializeTileLayer = (
  raw: Record<string, unknown>,
  base: {
    id: LayerId;
    name: string;
    visible: boolean;
    locked: boolean;
    opacity: number;
    properties: { entries: ReadonlyMap<string, PropertyValue> };
  },
): Layer => {
  const data = raw['data'];
  if (!isObject(data)) throw new Error('deserializeDocument: tile layer data missing');
  const tilesRaw = data['tiles'];
  if (!Array.isArray(tilesRaw)) throw new Error('deserializeDocument: tile list missing');

  const tiles = new Map<TileCoordKey, PlacedTile>();
  for (const entry of tilesRaw) {
    if (!Array.isArray(entry) || entry.length !== 2) continue;
    const [key, placed] = entry as [TileCoordKey, PlacedTile];
    tiles.set(key, placed);
  }
  return {
    ...base,
    type: 'tile',
    data: { tiles },
  };
};

const deserializeObjectLayer = (
  raw: Record<string, unknown>,
  base: {
    id: LayerId;
    name: string;
    visible: boolean;
    locked: boolean;
    opacity: number;
    properties: { entries: ReadonlyMap<string, PropertyValue> };
  },
): Layer => {
  const data = raw['data'];
  if (!isObject(data)) throw new Error('deserializeDocument: object layer data missing');
  const entityOrder = data['entityOrder'];
  if (!Array.isArray(entityOrder)) throw new Error('deserializeDocument: entityOrder missing');
  return {
    ...base,
    type: 'object',
    data: { entityOrder: entityOrder as ReadonlyArray<EntityId> },
  };
};

const deserializeCollisionLayer = (
  raw: Record<string, unknown>,
  base: {
    id: LayerId;
    name: string;
    visible: boolean;
    locked: boolean;
    opacity: number;
    properties: { entries: ReadonlyMap<string, PropertyValue> };
  },
): Layer => {
  const data = raw['data'];
  if (!isObject(data)) throw new Error('deserializeDocument: collision layer data missing');
  const colliderOrder = data['colliderOrder'];
  if (!Array.isArray(colliderOrder)) throw new Error('deserializeDocument: colliderOrder missing');
  return {
    ...base,
    type: 'collision',
    data: { colliderOrder: colliderOrder as ReadonlyArray<ColliderId> },
  };
};

const deserializeEntityTable = (raw: unknown): ReadonlyMap<EntityId, Entity> => {
  if (!Array.isArray(raw)) return new Map();
  const out = new Map<EntityId, Entity>();
  for (const entry of raw) {
    if (!Array.isArray(entry) || entry.length !== 2) continue;
    const [id, entity] = entry as [EntityId, Entity];
    if (typeof id !== 'string' || !isObject(entity)) continue;
    out.set(id, normalizeProps(entity));
  }
  return out;
};

const deserializeColliderTable = (raw: unknown): ReadonlyMap<ColliderId, Collider> => {
  if (!Array.isArray(raw)) return new Map();
  const out = new Map<ColliderId, Collider>();
  for (const entry of raw) {
    if (!Array.isArray(entry) || entry.length !== 2) continue;
    const [id, collider] = entry as [ColliderId, Collider];
    if (typeof id !== 'string' || !isObject(collider)) continue;
    out.set(id, normalizeProps(collider));
  }
  return out;
};

/** Re-hydrate `properties.entries` so consumers always see a `Map`. */
const normalizeProps = <T extends { properties: unknown }>(value: T): T => {
  if (!isObject(value.properties)) return value;
  const entries = deserializePropertyEntries(value.properties);
  return {
    ...value,
    properties: { entries },
  };
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const num = (v: unknown, fallback = 0): number => (typeof v === 'number' ? v : fallback);