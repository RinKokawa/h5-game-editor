/**
 * Map data.
 *
 * One {@link MapData} per logical map within a Document. The Document can
 * carry multiple maps (the active map is selected via
 * {@link Document.activeMapId}).
 */

import type { Collider } from './collider';
import type { Entity } from './entity';
import type { Color, Size } from './geometry';
import type { ColliderId, EntityId, LayerId, MapId, TilesetId } from './ids';
import type { Layer } from './layer';
import type { PropertyBag } from './property';
import type { Tileset } from './tileset';

export interface MapMetadata {
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly author?: string;
}

export interface MapData {
  readonly id: MapId;
  readonly name: string;
  /** Pixel size of a single tile cell. */
  readonly tileSize: Size;
  /** Grid subdivisions per tile (1,1 = single grid cell per tile). */
  readonly gridSize: Size;
  /** Map dimensions in tile units. */
  readonly width: number;
  /** Map dimensions in tile units. */
  readonly height: number;
  readonly backgroundColor: Color | null;
  /** Ordered list — index drives stacking. */
  readonly layerOrder: readonly LayerId[];
  /** Index for fast lookup. Layers not in {@link MapData.layerOrder} are hidden. */
  readonly layers: ReadonlyMap<LayerId, Layer>;
  readonly entities: ReadonlyMap<EntityId, Entity>;
  readonly colliders: ReadonlyMap<ColliderId, Collider>;
  readonly tilesets: ReadonlyMap<TilesetId, Tileset>;
  readonly properties: PropertyBag;
  readonly metadata: MapMetadata;
}
