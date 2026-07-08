/**
 * Branded ID types.
 *
 * Every persistent object in the Document is identified by a branded string
 * (UUIDs at the application layer). Branded types prevent passing a
 * `LayerId` where an `EntityId` is expected, at zero runtime cost.
 *
 * Constructors are unchecked casts — ID validity is enforced at the boundary
 * (deserialization, command construction) rather than on every use.
 */

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type DocumentId = Brand<string, 'DocumentId'>;
export type MapId = Brand<string, 'MapId'>;
export type TilesetId = Brand<string, 'TilesetId'>;
export type LayerId = Brand<string, 'LayerId'>;
export type EntityId = Brand<string, 'EntityId'>;
export type ColliderId = Brand<string, 'ColliderId'>;

/** Numeric index into a tileset. Distinct from arbitrary numbers. */
export type TileId = Brand<number, 'TileId'>;

/**
 * Sparse-storage key for a tile coordinate, encoded as `${x},${y}`.
 * Use {@link encodeTileCoord} / {@link decodeTileCoord} to convert.
 */
export type TileCoordKey = Brand<string, 'TileCoordKey'>;

export const asDocumentId = (s: string): DocumentId => s as DocumentId;
export const asMapId = (s: string): MapId => s as MapId;
export const asTilesetId = (s: string): TilesetId => s as TilesetId;
export const asLayerId = (s: string): LayerId => s as LayerId;
export const asEntityId = (s: string): EntityId => s as EntityId;
export const asColliderId = (s: string): ColliderId => s as ColliderId;
export const asTileId = (n: number): TileId => n as TileId;
