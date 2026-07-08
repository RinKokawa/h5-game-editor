/**
 * Document serializer — Document state ↔ JSON.
 *
 * Format (v1):
 *   {
 *     "version": 1,
 *     "tileSize": number,
 *     "mapSize": { "width": number, "height": number },
 *     "layers": [Layer, ...]
 *   }
 *
 * Layer objects carry an explicit `type` discriminator so loading
 * preserves the union. Placed tiles are encoded as a flat array of
 * [key, tilesetId, tileId, rotation, flipX, flipY] tuples — Maps
 * serialize cleanly through JSON.stringify/parse this way.
 *
 * activeLayerId is NOT serialized: it is view-only state and
 * defaults to the first layer on load.
 */

import type { LayerId, TileCoordKey } from '@editor/map/schema/ids';
import type { Layer, TileLayer } from '@editor/map/schema/layer';
import type { PlacedTile } from '@editor/map/schema/tile';

export interface SerializedDocumentV1 {
  readonly version: 1;
  readonly tileSize: number;
  readonly mapSize: { readonly width: number; readonly height: number };
  readonly layers: ReadonlyArray<unknown>;
}

export interface SerializedLayerBase {
  readonly id: string;
  readonly name: string;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly opacity: number;
  readonly properties: { readonly entries: ReadonlyArray<[string, unknown]> };
}

export interface SerializedTileLayer extends SerializedLayerBase {
  readonly type: 'tile';
  readonly data: {
    readonly tiles: ReadonlyArray<readonly [TileCoordKey, PlacedTile]>;
  };
}

export interface SerializedDocumentInput {
  readonly tileSize: number;
  readonly mapSize: { readonly width: number; readonly height: number };
  readonly layers: ReadonlyArray<Layer>;
}

export interface LoadedDocument {
  readonly tileSize: number;
  readonly mapSize: { readonly width: number; readonly height: number };
  readonly layers: ReadonlyArray<TileLayer>;
  readonly activeLayerId: LayerId;
}

export const serializeDocument = (input: SerializedDocumentInput): SerializedDocumentV1 => ({
  version: 1,
  tileSize: input.tileSize,
  mapSize: { width: input.mapSize.width, height: input.mapSize.height },
  layers: input.layers.map(serializeLayer),
});

const serializeLayer = (layer: Layer): SerializedTileLayer => {
  const base: SerializedLayerBase = {
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    locked: layer.locked,
    opacity: layer.opacity,
    properties: {
      entries: Array.from(layer.properties.entries).map(([k, v]) => [k, v] as const),
    },
  };
  if (layer.type !== 'tile') {
    // ObjectLayer / CollisionLayer land in later steps. Throw so
    // serialize-time errors surface early instead of producing a
    // silent data loss.
    throw new Error(
      `serializeDocument: unsupported layer type "${layer.type}" (id=${base.id}). ` +
        `Serialize object/collision layers when those editors land.`,
    );
  }
  return {
    ...base,
    type: 'tile',
    data: {
      tiles: Array.from(layer.data.tiles.entries()),
    },
  };
};

export const deserializeDocument = (raw: unknown): LoadedDocument => {
  if (!isObject(raw) || raw.version !== 1) {
    throw new Error(
      `deserializeDocument: unsupported document (version=${isObject(raw) ? String(raw['version']) : '?'}).`,
    );
  }
  const tileSize = num(raw['tileSize']);
  const mapSize = raw['mapSize'];
  if (!isObject(mapSize)) throw new Error('deserializeDocument: mapSize missing');
  const width = num(mapSize['width']);
  const height = num(mapSize['height']);
  const layersRaw = raw['layers'];
  if (!Array.isArray(layersRaw)) throw new Error('deserializeDocument: layers missing');

  const layers: TileLayer[] = layersRaw.map(deserializeLayer);
  const first = layers[0];
  if (!first) throw new Error('deserializeDocument: document has no layers');
  return {
    tileSize,
    mapSize: { width, height },
    layers,
    activeLayerId: first.id,
  };
};

const deserializeLayer = (raw: unknown): TileLayer => {
  if (!isObject(raw)) throw new Error('deserializeDocument: layer is not an object');
  if (raw['type'] !== 'tile') {
    throw new Error(
      `deserializeDocument: unsupported layer type "${String(raw['type'])}" on load.`,
    );
  }
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

  // PropertyBag serialization is lossy in v1: we keep the entries as
  // `unknown` until property editors land (Step 17+). For now any
  // round-tripped property is dropped to satisfy the schema's
  // `PropertyValue` discriminator.
  const properties = raw['properties'];
  void properties;

  return {
    id: String(raw['id']) as LayerId,
    type: 'tile',
    name: typeof raw['name'] === 'string' ? raw['name'] : 'Layer',
    visible: Boolean(raw['visible']),
    locked: Boolean(raw['locked']),
    opacity: num(raw['opacity'], 1),
    properties: { entries: new Map() },
    data: { tiles },
  };
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const num = (v: unknown, fallback = 0): number => (typeof v === 'number' ? v : fallback);
