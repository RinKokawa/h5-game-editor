/**
 * Tile-layer data.
 *
 * A tile layer is a sparse map: only non-empty cells are stored. The key is
 * a {@link TileCoordKey} produced by {@link encodeTileCoord} so the same
 * `Map` can be serialized to JSON without a custom replacer.
 */

import type { TileCoord } from './geometry';
import type { TilesetId, TileId, TileCoordKey } from './ids';
import type { PropertyBag } from './property';

export type TileRotation = 0 | 90 | 180 | 270;

export interface PlacedTile {
  readonly tilesetId: TilesetId;
  readonly tileId: TileId;
  readonly rotation: TileRotation;
  readonly flipX: boolean;
  readonly flipY: boolean;
}

export interface TileLayerData {
  readonly tiles: Map<TileCoordKey, PlacedTile>;
}

export const encodeTileCoord = (coord: TileCoord): TileCoordKey =>
  `${coord.x},${coord.y}` as TileCoordKey;

export const decodeTileCoord = (key: TileCoordKey): TileCoord => {
  const parts = key.split(',');
  const x = Number(parts[0]);
  const y = Number(parts[1]);
  return { x, y };
};

export type { PropertyBag };
