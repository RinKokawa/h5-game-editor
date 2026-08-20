/**
 * Layout store — column geometry, panel stack order, and dock states.
 *
 * Two kinds of UI-only state live here:
 *  - column geometry (side widths, bottom height) driven by the edge
 *    splitters in EditorShell;
 *  - per-panel layout (stack order per side, body height, collapsed flag)
 *    driven by PanelStack.
 *
 * The Document, selection, and tool state belong to their own stores.
 *
 * Layout is persisted to localStorage (UI data only — the Document is never
 * affected; see `partialize`). This supersedes the earlier v0.1
 * "no persistence" rule: the persist middleware no-ops when storage is
 * unavailable, so the framework still boots without localStorage.
 *
 * PanelStack normalizes the persisted orders against the panels actually
 * registered in EditorShell, so stale ids (panels renamed / removed) are
 * dropped and new ids fall back to the end of the stack.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Identifier of a dockable panel. Stack membership is declared by EditorShell. */
export type PanelId =
  | 'palette'
  | 'assets'
  | 'layers'
  | 'inspector'
  | 'properties'
  | 'console';

export type PanelSide = 'left' | 'right';

export interface LayoutState {
  readonly leftWidth: number;
  readonly rightWidth: number;
  readonly bottomHeight: number;
  readonly leftCollapsed: boolean;
  readonly rightCollapsed: boolean;
  readonly bottomCollapsed: boolean;
  /** Stack order per side; PanelStack keeps this a permutation of the registered ids. */
  readonly leftPanelOrder: PanelId[];
  readonly rightPanelOrder: PanelId[];
  /** Explicit body height (content area below the header) per panel. */
  readonly panelHeights: Readonly<Record<PanelId, number>>;
  readonly panelCollapsed: Readonly<Record<PanelId, boolean>>;

  readonly setLeftWidth: (px: number) => void;
  readonly setRightWidth: (px: number) => void;
  readonly setBottomHeight: (px: number) => void;
  readonly toggleLeftCollapsed: () => void;
  readonly toggleRightCollapsed: () => void;
  readonly toggleBottomCollapsed: () => void;
  readonly setPanelOrder: (side: PanelSide, order: PanelId[]) => void;
  readonly setPanelHeight: (id: PanelId, px: number) => void;
  readonly togglePanelCollapsed: (id: PanelId) => void;
}

const MIN_LEFT = 200;
const MIN_RIGHT = 240;
const MIN_BOTTOM = 120;
const MAX_LEFT = 600;
const MAX_RIGHT = 600;
const MAX_BOTTOM = 480;

/** Smallest usable panel body (the header is chrome on top of this). */
export const MIN_PANEL_BODY = 72;
export const MAX_PANEL_BODY = 4096;

const DEFAULT_LEFT_ORDER: PanelId[] = ['palette', 'assets', 'layers'];
const DEFAULT_RIGHT_ORDER: PanelId[] = ['inspector', 'properties'];
// The last expanded panel in a stack stretches to fill the column; its
// stored height is synced to the measured size by PanelStack, so these
// defaults only matter before the first measure.
const DEFAULT_PANEL_HEIGHTS: Readonly<Record<PanelId, number>> = {
  palette: 320,
  assets: 200,
  layers: 280,
  inspector: 300,
  properties: 300,
  console: 200,
};
const DEFAULT_PANEL_COLLAPSED: Readonly<Record<PanelId, boolean>> = {
  palette: false,
  assets: false,
  layers: false,
  inspector: false,
  properties: false,
  console: false,
};

const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      leftWidth: 280,
      rightWidth: 320,
      bottomHeight: 200,
      leftCollapsed: false,
      rightCollapsed: false,
      bottomCollapsed: false,
      leftPanelOrder: DEFAULT_LEFT_ORDER,
      rightPanelOrder: DEFAULT_RIGHT_ORDER,
      panelHeights: DEFAULT_PANEL_HEIGHTS,
      panelCollapsed: DEFAULT_PANEL_COLLAPSED,

      setLeftWidth: (px) => set({ leftWidth: clamp(px, MIN_LEFT, MAX_LEFT) }),
      setRightWidth: (px) => set({ rightWidth: clamp(px, MIN_RIGHT, MAX_RIGHT) }),
      setBottomHeight: (px) => set({ bottomHeight: clamp(px, MIN_BOTTOM, MAX_BOTTOM) }),

      toggleLeftCollapsed: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
      toggleRightCollapsed: () => set((s) => ({ rightCollapsed: !s.rightCollapsed })),
      toggleBottomCollapsed: () => set((s) => ({ bottomCollapsed: !s.bottomCollapsed })),

      setPanelOrder: (side, order) =>
        set(side === 'left' ? { leftPanelOrder: order } : { rightPanelOrder: order }),
      setPanelHeight: (id, px) =>
        set((s) => ({
          panelHeights: { ...s.panelHeights, [id]: clamp(px, MIN_PANEL_BODY, MAX_PANEL_BODY) },
        })),
      togglePanelCollapsed: (id) =>
        set((s) => ({
          panelCollapsed: { ...s.panelCollapsed, [id]: !(s.panelCollapsed[id] ?? false) },
        })),
    }),
    {
      name: 'h5-editor-layout',
      version: 1,
      partialize: (s) => ({
        leftWidth: s.leftWidth,
        rightWidth: s.rightWidth,
        bottomHeight: s.bottomHeight,
        leftCollapsed: s.leftCollapsed,
        rightCollapsed: s.rightCollapsed,
        bottomCollapsed: s.bottomCollapsed,
        leftPanelOrder: s.leftPanelOrder,
        rightPanelOrder: s.rightPanelOrder,
        panelHeights: s.panelHeights,
        panelCollapsed: s.panelCollapsed,
      }),
    },
  ),
);

export const LAYOUT_LIMITS = {
  MIN_LEFT,
  MIN_RIGHT,
  MIN_BOTTOM,
  MAX_LEFT,
  MAX_RIGHT,
  MAX_BOTTOM,
  MIN_PANEL_BODY,
  MAX_PANEL_BODY,
} as const;
