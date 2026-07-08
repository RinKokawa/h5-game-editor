/**
 * Tileset.
 *
 * A tileset is a single image split into a regular grid of equal-sized
 * tiles. The renderer slices the image once and caches the resulting
 * textures. Per-tile metadata (custom collision shapes, animations) is
 * stored in {@link Tileset.tileProperties}.
 */

import type { AssetRef } from './asset';
import type { TileId, TilesetId } from './ids';
import type { PropertyBag } from './property';

export interface Tileset {
  readonly id: TilesetId;
  readonly name: string;
  readonly image: AssetRef;
  readonly tileWidth: number;
  readonly tileHeight: number;
  /** Pixel gap between adjacent tiles in the source image. */
  readonly spacing: number;
  /** Pixel inset from the edges of the source image. */
  readonly margin: number;
  /** Number of tiles per row in the source image. */
  readonly columns: number;
  /** Total number of tiles in the set. */
  readonly tileCount: number;
  /** Per-tile metadata (e.g. custom collision, animation hints). */
  readonly tileProperties: ReadonlyMap<TileId, PropertyBag>;
  /** Tileset-wide metadata. */
  readonly properties: PropertyBag;
}
