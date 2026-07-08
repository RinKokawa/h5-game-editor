/**
 * Layout store — panel sizes and collapsed states.
 *
 * Only the layout dimensions and which docks are open live here. The
 * Document, selection, and tool state belong to their own stores.
 *
 * Persistence is intentionally not wired in v0.1; the framework must work
 * without localStorage first.
 */

import { create } from 'zustand';

export interface LayoutState {
  readonly leftWidth: number;
  readonly rightWidth: number;
  readonly bottomHeight: number;
  readonly leftCollapsed: boolean;
  readonly rightCollapsed: boolean;
  readonly bottomCollapsed: boolean;

  readonly setLeftWidth: (px: number) => void;
  readonly setRightWidth: (px: number) => void;
  readonly setBottomHeight: (px: number) => void;
  readonly toggleLeftCollapsed: () => void;
  readonly toggleRightCollapsed: () => void;
  readonly toggleBottomCollapsed: () => void;
}

const MIN_LEFT = 200;
const MIN_RIGHT = 240;
const MIN_BOTTOM = 120;
const MAX_LEFT = 600;
const MAX_RIGHT = 600;
const MAX_BOTTOM = 480;

const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));

export const useLayoutStore = create<LayoutState>((set) => ({
  leftWidth: 280,
  rightWidth: 320,
  bottomHeight: 200,
  leftCollapsed: false,
  rightCollapsed: false,
  bottomCollapsed: false,

  setLeftWidth: (px) => set({ leftWidth: clamp(px, MIN_LEFT, MAX_LEFT) }),
  setRightWidth: (px) => set({ rightWidth: clamp(px, MIN_RIGHT, MAX_RIGHT) }),
  setBottomHeight: (px) => set({ bottomHeight: clamp(px, MIN_BOTTOM, MAX_BOTTOM) }),

  toggleLeftCollapsed: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
  toggleRightCollapsed: () => set((s) => ({ rightCollapsed: !s.rightCollapsed })),
  toggleBottomCollapsed: () => set((s) => ({ bottomCollapsed: !s.bottomCollapsed })),
}));

export const LAYOUT_LIMITS = {
  MIN_LEFT,
  MIN_RIGHT,
  MIN_BOTTOM,
  MAX_LEFT,
  MAX_RIGHT,
  MAX_BOTTOM,
} as const;
