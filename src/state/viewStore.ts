/**
 * View store — camera state and live cursor position.
 *
 * This is the single source of truth for the view. The Canvas-side
 * {@link Camera} subscribes to this store and applies changes to its
 * PixiJS Container; UI panels subscribe via React to display readouts.
 *
 * Document data does NOT live here — see the Document schema in
 * editor/map/schema for persistent project state.
 */

import { create } from 'zustand';

import {
  reframeAroundScreenPoint,
  screenToWorld,
  worldToScreen,
  type CameraState,
} from '@shared/math/index';

import type { Point, ScreenPoint, WorldPoint } from '@local-types/index';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
export const DEFAULT_ZOOM = 1;

export interface ViewState {
  readonly zoom: number;
  readonly position: Point;
  /** Mouse position over the canvas, in canvas-relative pixels. */
  readonly cursorScreen: ScreenPoint | null;
  /** Mouse position projected to world coordinates. */
  readonly cursorWorld: WorldPoint | null;

  readonly setZoom: (zoom: number, cursor?: ScreenPoint) => void;
  readonly setPosition: (position: Point) => void;
  readonly panBy: (dx: number, dy: number) => void;
  readonly zoomBy: (factor: number, cursor?: ScreenPoint) => void;
  readonly setCursor: (cursor: ScreenPoint | null) => void;
  readonly resetView: () => void;
}

const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));

const INITIAL: CameraState = {
  position: { x: 0, y: 0 },
  zoom: DEFAULT_ZOOM,
};

export const useViewStore = create<ViewState>((set, get) => ({
  ...INITIAL,
  cursorScreen: null,
  cursorWorld: null,

  setZoom: (zoom, cursor) => {
    const clamped = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    const state = get();
    if (cursor) {
      const next = reframeAroundScreenPoint(state, clamped, cursor);
      set({ zoom: next.zoom, position: next.position });
    } else {
      // Zoom around viewport center
      const center = getViewportCenter();
      const next = reframeAroundScreenPoint(state, clamped, center);
      set({ zoom: next.zoom, position: next.position });
    }
  },

  setPosition: (position) => set({ position }),

  panBy: (dx, dy) => {
    const state = get();
    set({
      position: {
        x: state.position.x + dx,
        y: state.position.y + dy,
      },
    });
  },

  zoomBy: (factor, cursor) => {
    const state = get();
    const target = clamp(state.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    if (target === state.zoom) return;
    const ref = cursor ?? getViewportCenter();
    const next = reframeAroundScreenPoint(state, target, ref);
    set({ zoom: next.zoom, position: next.position });
  },

  setCursor: (cursor) => {
    const state = get();
    if (!cursor) {
      if (state.cursorScreen === null && state.cursorWorld === null) return;
      set({ cursorScreen: null, cursorWorld: null });
      return;
    }
    const world = screenToWorld(cursor, state);
    set({ cursorScreen: cursor, cursorWorld: world });
  },

  resetView: () => set({ ...INITIAL, cursorScreen: null, cursorWorld: null }),
}));

/**
 * Resolve the current viewport center for "zoom around center" operations.
 * Hooks into the Pixi canvas size via the renderer registry below.
 */
let viewportSize: { width: number; height: number } = {
  width: window.innerWidth,
  height: window.innerHeight,
};

export const setViewportSize = (width: number, height: number): void => {
  viewportSize = { width, height };
};

const getViewportCenter = (): ScreenPoint => ({
  x: viewportSize.width / 2,
  y: viewportSize.height / 2,
});

// Re-export so call sites can import types alongside the helper above.
export { worldToScreen };
export type { CameraState };
