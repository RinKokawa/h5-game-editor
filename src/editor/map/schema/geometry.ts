/**
 * Map editor geometry types.
 *
 * Cross-cutting geometric primitives (Point, Size, Rect, Color) are
 * defined globally under `@local-types` and re-exported here for caller
 * convenience. The Map-specific grid coordinate lives here because
 * tile grids are a map-editor concept, not a generic canvas concept.
 */

export type { Point, WorldPoint, ScreenPoint, Size, Rect, Color } from '@local-types/index';

/** Integer grid coordinate. Always non-negative. */
export interface TileCoord {
  readonly x: number;
  readonly y: number;
}
