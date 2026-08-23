/**
 * Layout store — column geometry, panel stack order, dock states, and
 * floating panel geometry.
 *
 * Three kinds of UI-only state live here:
 *  - column geometry (side widths, bottom height) driven by the edge
 *    splitters in EditorShell;
 *  - per-panel layout (stack order per side, body height, collapsed flag)
 *    driven by PanelStack;
 *  - floating panel layout (per-panel state 'docked' | 'floating' |
 *    'minimized', position rect, z-order) driven by FloatingPanel /
 *    the panel detach button on PanelDock.
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
 *
 * Step 30-B: `panelDockState` + `floatingPosition` + `floatingZ` +
 * `topZ` carry the detachable-panel state. Phase 3 (workspace presets)
 * is planned but not implemented — see
 * `memory/project_detachable_panels_plan.md`.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { moveItem } from '@utils/index';

/** Identifier of a dockable panel. Stack membership is declared by EditorShell. */
export type PanelId =
  | 'palette'
  | 'assets'
  | 'layers'
  | 'inspector'
  | 'properties'
  | 'console';

export type PanelSide = 'left' | 'right';

/**
 * Per-panel dock state. `docked` = lives in the side stack;
 * `floating` = absolute-positioned window over the canvas;
 * `minimized` = floating but collapsed to header-only.
 *
 * Step 30-B. The state transitions are driven by the PanelDock
 * detach button (→ `floating`) and the FloatingPanel close (→
 * `docked`) / minimize (→ `minimized`).
 */
export type PanelDockState = 'docked' | 'floating' | 'minimized';

/** Position / size for a floating panel (px, viewport-relative). */
export interface FloatingRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * A saved layout snapshot. Captures every layout-affecting field so
 * `applyPreset` can restore the editor to a known state — Unity's
 * `Window > Layouts` behavior.
 *
 * Step 30-B Phase 2B. The field set is intentionally broad (any
 * future layout knob that the user expects to come back when
 * switching layouts should be added here). The `presets` field
 * itself is NOT included — that would create a recursion.
 */
export interface Preset {
  readonly name: string;
  readonly leftWidth: number;
  readonly rightWidth: number;
  readonly bottomHeight: number;
  readonly leftCollapsed: boolean;
  readonly rightCollapsed: boolean;
  readonly bottomCollapsed: boolean;
  readonly leftPanelOrder: ReadonlyArray<PanelId>;
  readonly rightPanelOrder: ReadonlyArray<PanelId>;
  readonly panelHeights: Readonly<Record<PanelId, number>>;
  readonly panelCollapsed: Readonly<Record<PanelId, boolean>>;
  readonly panelDockState: Readonly<Record<PanelId, PanelDockState>>;
  readonly floatingPosition: Readonly<Record<PanelId, FloatingRect>>;
  readonly floatingZ: Readonly<Record<PanelId, number>>;
  readonly topZ: number;
  readonly panelHidden: Readonly<Record<PanelId, boolean>>;
}

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

  // ── Detachable panels (Step 30-B) ─────────────────────────────────────────
  readonly panelDockState: Readonly<Record<PanelId, PanelDockState>>;
  /** Floating panel position / size. Only meaningful when state is 'floating' or 'minimized'. */
  readonly floatingPosition: Readonly<Record<PanelId, FloatingRect>>;
  /** Z-index per panel — higher values are drawn on top. */
  readonly floatingZ: Readonly<Record<PanelId, number>>;
  /** Monotonic counter for `raisePanel`; the next raise uses this value. */
  readonly topZ: number;
  /**
   * Step 30-B. When `true` the panel is hidden from the layout —
   * PanelStack and FloatingPanelsLayer both skip rendering it. The
   * Window menu toggles this. `panelDockState` is preserved, so a
   * floating panel that's hidden stays floating in memory and
   * re-appears at its last position when re-shown.
   */
  readonly panelHidden: Readonly<Record<PanelId, boolean>>;

  readonly setLeftWidth: (px: number) => void;
  readonly setRightWidth: (px: number) => void;
  readonly setBottomHeight: (px: number) => void;
  readonly toggleLeftCollapsed: () => void;
  readonly toggleRightCollapsed: () => void;
  readonly toggleBottomCollapsed: () => void;
  readonly setPanelOrder: (side: PanelSide, order: PanelId[]) => void;
  readonly setPanelHeight: (id: PanelId, px: number) => void;
  readonly togglePanelCollapsed: (id: PanelId) => void;

  /**
   * Step 30-B cross-column drag. Move `panelId` from `sourceSide` to
   * `targetSide`, inserting at `targetIndex` (an index into the
   * target order list **before** the source panel is removed). When
   * `sourceSide === targetSide` this is a within-column reorder.
   */
  readonly movePanelToSide: (
    panelId: PanelId,
    sourceSide: PanelSide,
    targetSide: PanelSide,
    targetIndex: number,
  ) => void;

  // ── Detachable panel actions ─────────────────────────────────────────────
  /** Switch a panel between docked / floating / minimized. When transitioning
   *  to `floating` for the first time, seeds a default position near the
   *  top-right of the canvas. */
  readonly setPanelDockState: (id: PanelId, state: PanelDockState) => void;
  /** Update the floating position / size for a panel. Caller is responsible
   *  for clamping to viewport bounds. */
  readonly setFloatingPosition: (id: PanelId, rect: FloatingRect) => void;
  /** Bring a floating panel to the front by assigning it the next z value. */
  readonly raisePanel: (id: PanelId) => void;
  /** Hide / show a panel. Hidden panels are filtered out by PanelStack and
   *  FloatingPanelsLayer; `panelDockState` is preserved. */
  readonly togglePanelHidden: (id: PanelId) => void;

  // ── Preset actions ──────────────────────────────────────────────────────────
  /** Capture the current layout under `name`. If a preset with the same
   *  name already exists it is overwritten (no error). */
  readonly savePreset: (name: string) => void;
  /** Restore every layout field from the named preset. No-op if the
   *  preset doesn't exist. */
  readonly applyPreset: (name: string) => void;
  /** Remove the named preset. No-op if it doesn't exist. */
  readonly deletePreset: (name: string) => void;
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

/** Default size for a newly-floated panel. */
export const DEFAULT_FLOATING_W = 320;
export const DEFAULT_FLOATING_H = 320;

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
const DEFAULT_PANEL_DOCK_STATE: Readonly<Record<PanelId, PanelDockState>> = {
  palette: 'docked',
  assets: 'docked',
  layers: 'docked',
  inspector: 'docked',
  properties: 'docked',
  console: 'docked',
};
const DEFAULT_FLOATING_POSITION: Readonly<Record<PanelId, FloatingRect>> = {
  palette: { x: 80, y: 80, w: DEFAULT_FLOATING_W, h: DEFAULT_FLOATING_H },
  assets: { x: 120, y: 120, w: DEFAULT_FLOATING_W, h: DEFAULT_FLOATING_H },
  layers: { x: 160, y: 160, w: DEFAULT_FLOATING_W, h: DEFAULT_FLOATING_H },
  inspector: { x: 200, y: 80, w: DEFAULT_FLOATING_W, h: DEFAULT_FLOATING_H },
  properties: { x: 240, y: 120, w: DEFAULT_FLOATING_W, h: DEFAULT_FLOATING_H },
  console: { x: 80, y: 200, w: DEFAULT_FLOATING_W, h: DEFAULT_FLOATING_H },
};
const DEFAULT_FLOATING_Z: Readonly<Record<PanelId, number>> = {
  palette: 0,
  assets: 0,
  layers: 0,
  inspector: 0,
  properties: 0,
  console: 0,
};
const DEFAULT_PANEL_HIDDEN: Readonly<Record<PanelId, boolean>> = {
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
      panelDockState: DEFAULT_PANEL_DOCK_STATE,
      floatingPosition: DEFAULT_FLOATING_POSITION,
      floatingZ: DEFAULT_FLOATING_Z,
      topZ: 0,
      panelHidden: DEFAULT_PANEL_HIDDEN,
      presets: {},

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

      movePanelToSide: (panelId, sourceSide, targetSide, targetIndex) =>
        set((s) => {
          if (sourceSide === targetSide) {
            // Within-column reorder — defer to the existing math.
            const order = sourceSide === 'left' ? s.leftPanelOrder : s.rightPanelOrder;
            const from = order.indexOf(panelId);
            if (from < 0) return s;
            const adjustedTo = from < targetIndex ? targetIndex - 1 : targetIndex;
            const newOrder = moveItem(order, from, adjustedTo);
            return sourceSide === 'left'
              ? { leftPanelOrder: newOrder }
              : { rightPanelOrder: newOrder };
          }
          // Cross-column: remove from source, insert into target.
          const sourceOrder = (sourceSide === 'left' ? s.leftPanelOrder : s.rightPanelOrder).filter(
            (id) => id !== panelId,
          );
          const targetOrder = targetSide === 'left' ? s.leftPanelOrder : s.rightPanelOrder;
          const clampedIndex = Math.max(0, Math.min(targetIndex, targetOrder.length));
          const newTargetOrder = [
            ...targetOrder.slice(0, clampedIndex),
            panelId,
            ...targetOrder.slice(clampedIndex),
          ];
          return sourceSide === 'left'
            ? { leftPanelOrder: sourceOrder, rightPanelOrder: newTargetOrder }
            : { rightPanelOrder: sourceOrder, leftPanelOrder: newTargetOrder };
        }),

      // ── Detachable panel actions ─────────────────────────────────────────

      setPanelDockState: (id, state) =>
        set((s) => {
          // When transitioning to floating for the first time, ensure a
          // position exists; reuse the existing one if it does.
          const pos = s.floatingPosition[id] ?? DEFAULT_FLOATING_POSITION[id];
          return {
            panelDockState: { ...s.panelDockState, [id]: state },
            floatingPosition: { ...s.floatingPosition, [id]: pos },
          };
        }),

      setFloatingPosition: (id, rect) =>
        set((s) => ({
          floatingPosition: { ...s.floatingPosition, [id]: rect },
        })),

      raisePanel: (id) =>
        set((s) => {
          const nextZ = s.topZ + 1;
          return {
            topZ: nextZ,
            floatingZ: { ...s.floatingZ, [id]: nextZ },
          };
        }),

      togglePanelHidden: (id) =>
        set((s) => ({
          panelHidden: { ...s.panelHidden, [id]: !(s.panelHidden[id] ?? false) },
        })),

      // ── Preset actions ────────────────────────────────────────────────────

      savePreset: (name) =>
        set((s) => {
          if (name.length === 0) return s;
          const preset: Preset = {
            name,
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
            panelDockState: s.panelDockState,
            floatingPosition: s.floatingPosition,
            floatingZ: s.floatingZ,
            topZ: s.topZ,
            panelHidden: s.panelHidden,
          };
          return { presets: { ...s.presets, [name]: preset } };
        }),

      applyPreset: (name) =>
        set((s) => {
          const preset = s.presets[name];
          if (!preset) return s;
          return {
            leftWidth: preset.leftWidth,
            rightWidth: preset.rightWidth,
            bottomHeight: preset.bottomHeight,
            leftCollapsed: preset.leftCollapsed,
            rightCollapsed: preset.rightCollapsed,
            bottomCollapsed: preset.bottomCollapsed,
            leftPanelOrder: [...preset.leftPanelOrder],
            rightPanelOrder: [...preset.rightPanelOrder],
            panelHeights: { ...preset.panelHeights },
            panelCollapsed: { ...preset.panelCollapsed },
            panelDockState: { ...preset.panelDockState },
            floatingPosition: { ...preset.floatingPosition },
            floatingZ: { ...preset.floatingZ },
            topZ: preset.topZ,
            panelHidden: { ...preset.panelHidden },
          };
        }),

      deletePreset: (name) =>
        set((s) => {
          if (!(name in s.presets)) return s;
          const next = { ...s.presets };
          delete next[name];
          return { presets: next };
        }),
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
        panelDockState: s.panelDockState,
        floatingPosition: s.floatingPosition,
        floatingZ: s.floatingZ,
        topZ: s.topZ,
        panelHidden: s.panelHidden,
        presets: s.presets,
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