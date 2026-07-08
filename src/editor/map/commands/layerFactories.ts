/**
 * Factory helpers for building common Layer values.
 *
 * Used by AddTileLayerCommand — the panel calls into here to mint
 * a fresh TileLayer with a unique id and a sensible default name.
 */

import { asLayerId } from '@editor/map/schema/ids';

import type { LayerId } from '@editor/map/schema/ids';
import type { TileCoordKey } from '@editor/map/schema/ids';
import type { Layer, TileLayer } from '@editor/map/schema/layer';
import type { PlacedTile } from '@editor/map/schema/tile';

const newLayerId = (): LayerId =>
  asLayerId(`layer.tile.${Math.random().toString(36).slice(2, 10)}`);

const newLayerName = (existing: ReadonlyArray<Layer>): string => {
  let n = existing.length + 1;
  while (existing.some((l) => l.name === `Layer ${n}`)) n++;
  return `Layer ${n}`;
};

export const createTileLayer = (existing: ReadonlyArray<Layer>, name?: string): TileLayer => ({
  id: newLayerId(),
  type: 'tile',
  name: name ?? newLayerName(existing),
  visible: true,
  locked: false,
  opacity: 1,
  properties: { entries: new Map() },
  data: { tiles: new Map<TileCoordKey, PlacedTile>() },
});
