/**
 * Map editor schema — public surface.
 *
 * All TypeScript types describing the Map editor's persistent Document.
 * Imports should prefer `@local-types` (re-exported below) over deep paths
 * to keep coupling to this directory explicit.
 */

export type {
  DocumentId,
  MapId,
  TilesetId,
  TileId,
  LayerId,
  EntityId,
  ColliderId,
  TileCoordKey,
} from './ids';
export {
  asDocumentId,
  asMapId,
  asTilesetId,
  asLayerId,
  asEntityId,
  asColliderId,
  asTileId,
} from './ids';

export type { Point, WorldPoint, ScreenPoint, TileCoord, Size, Rect, Color } from './geometry';

export type { PropertyValue, PropertyBag } from './property';

export type { AssetKind, AssetRef } from './asset';

export type { PlacedTile, TileRotation, TileLayerData } from './tile';
export { encodeTileCoord, decodeTileCoord } from './tile';

export type { Tileset } from './tileset';

export type { Entity } from './entity';

export type {
  Collider,
  ColliderKind,
  BoxCollider,
  CircleCollider,
  PolygonCollider,
} from './collider';

export type {
  Layer,
  LayerType,
  TileLayer,
  ObjectLayer,
  CollisionLayer,
  ObjectLayerData,
  CollisionLayerData,
} from './layer';

export type { MapData, MapMetadata } from './map';

export type { Document, DocumentKind, SchemaVersion } from './document';

export type { DocumentChange } from './events';
