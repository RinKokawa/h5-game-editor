/**
 * Geometric primitives — cross-cutting types.
 *
 * Lifted out of the Map schema so non-editor modules (canvas, state,
 * shared) can use them without depending on `@editor/map/schema`. The
 * Map editor re-exports these from its own geometry module for caller
 * convenience.
 *
 * Convention:
 *   - screen: pixels from the canvas top-left (positive y = down)
 *   - world:  pixels in the document's coordinate system
 *   - tile coords are NOT defined here — they live in the Map schema
 *     because they are map-specific (grids are a map concept, not a
 *     generic canvas concept).
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Alias of {@link Point} for readability at world-coordinate call sites. */
export type WorldPoint = Point;

/** Alias of {@link Point} for readability at viewport-coordinate call sites. */
export type ScreenPoint = Point;

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** RGBA. Channels r/g/b are 0..255 integers, a is 0..1. */
export interface Color {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}
