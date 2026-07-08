/**
 * Pure camera transform math.
 *
 * No PixiJS, no DOM, no Document. Used by both the renderer (Camera
 * class) and any UI that needs to project between world and screen
 * coordinates.
 *
 * Convention:
 *   - screen: pixels from the canvas top-left (positive y = down)
 *   - world:  pixels in the map's coordinate system
 *   - camera.position: where world origin appears on screen, in pixels
 *   - camera.zoom:     multiplicative scale (1 = identity)
 */

import type { Point } from '@local-types/index';

export interface CameraState {
  readonly position: Point;
  readonly zoom: number;
}

export const screenToWorld = (screen: Point, camera: CameraState): Point => ({
  x: (screen.x - camera.position.x) / camera.zoom,
  y: (screen.y - camera.position.y) / camera.zoom,
});

export const worldToScreen = (world: Point, camera: CameraState): Point => ({
  x: world.x * camera.zoom + camera.position.x,
  y: world.y * camera.zoom + camera.position.y,
});

/**
 * Compute the camera transform that keeps a given world point fixed under
 * a given screen point after a zoom change. Used for cursor-centered
 * zoom.
 */
export const reframeAroundScreenPoint = (
  camera: CameraState,
  newZoom: number,
  screenPoint: Point,
): CameraState => {
  const worldUnderCursor = screenToWorld(screenPoint, camera);
  return {
    zoom: newZoom,
    position: {
      x: screenPoint.x - worldUnderCursor.x * newZoom,
      y: screenPoint.y - worldUnderCursor.y * newZoom,
    },
  };
};
