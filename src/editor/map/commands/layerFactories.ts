/**
 * Factory helpers for building common Layer values.
 *
 * Used by Add{LayerKind}LayerCommand — the panel calls into here to
 * mint a fresh layer with a unique id and a sensible default name.
 */

import { asLayerId } from '@editor/map/schema/ids';

import type { EntityId, LayerId, TileCoordKey } from '@editor/map/schema/ids';
import type { Layer, ObjectLayer, TileLayer } from '@editor/map/schema/layer';
import type { PlacedTile } from '@editor/map/schema/tile';

const newLayerId = (kind: 'tile' | 'object' | 'collision'): LayerId =>
  asLayerId(`layer.${kind}.${Math.random().toString(36).slice(2, 10)}`);

const newLayerName = (existing: ReadonlyArray<Layer>): string => {
  let n = existing.length + 1;
  while (existing.some((l) => l.name === `Layer ${n}`)) n++;
  return `Layer ${n}`;
};

export const createTileLayer = (existing: ReadonlyArray<Layer>, name?: string): TileLayer => ({
  id: newLayerId('tile'),
  type: 'tile',
  name: name ?? newLayerName(existing),
  visible: true,
  locked: false,
  opacity: 1,
  properties: { entries: new Map() },
  data: { tiles: new Map<TileCoordKey, PlacedTile>() },
});

export const createObjectLayer = (existing: ReadonlyArray<Layer>, name?: string): ObjectLayer => ({
  id: newLayerId('object'),
  type: 'object',
  name: name ?? newLayerName(existing),
  visible: true,
  locked: false,
  opacity: 1,
  properties: { entries: new Map() },
  data: { entityOrder: [] as readonly EntityId[] },
});
