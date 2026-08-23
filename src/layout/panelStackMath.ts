/**
 * Panel stack math — pure layout computations for PanelStack.
 *
 * All heights are *body* heights: the scrollable content area below the
 * dock header. PANEL_HEADER_H and SPLITTER_H must stay in sync with
 * PanelDock.module.css (.header height) and Splitter.module.css
 * (flex-basis) — they are duplicated here so the math stays a pure,
 * DOM-free function.
 *
 * Stack model (one column):
 *  - every dock renders its header;
 *  - a dock that is collapsed renders nothing else;
 *  - an expanded dock has an explicit stored body height, EXCEPT the last
 *    expanded dock (the "fill" dock), which stretches to whatever height
 *    the column has left (never below MIN_PANEL_BODY);
 *  - a splitter sits below every expanded non-fill dock and resizes that
 *    dock; the fill dock absorbs the difference;
 *  - when the explicit heights exceed the column, the stack scrolls —
 *    docks are never squeezed by flexbox, which is what made the old
 *    content-based layout clip panels at random sizes.
 */

import { MAX_PANEL_BODY, MIN_PANEL_BODY } from '@state/layoutStore';
import { moveItem } from '@utils/index';

import type { PanelId } from '@state/layoutStore';

/** Keep in sync with .header in PanelDock.module.css. */
export const PANEL_HEADER_H = 28;
/** Keep in sync with the splitter flex-basis in Splitter.module.css. */
export const SPLITTER_H = 4;

export type PanelCollapsedMap = Readonly<Record<PanelId, boolean>>;
export type PanelHeightMap = Readonly<Record<PanelId, number>>;

export interface StackGeometry {
  /** The last expanded panel id, or null when every dock is collapsed. */
  readonly fillId: PanelId | null;
  /** Effective body height of the fill dock (already clamped to MIN_PANEL_BODY). */
  readonly fillHeight: number;
}

// `moveItem` is re-exported for callers that already import it from
// here; the canonical implementation now lives in `@utils/list`.
export { moveItem };

/**
 * Resolve the geometry of a stack: which dock fills the remaining column
 * height, and how tall that dock currently is.
 */
export function computeStackGeometry(
  order: readonly PanelId[],
  heights: PanelHeightMap,
  collapsed: PanelCollapsedMap,
  availableHeight: number,
): StackGeometry {
  const expanded = order.filter((id) => !(collapsed[id] ?? false));
  const fillId = expanded.length > 0 ? expanded[expanded.length - 1] ?? null : null;
  if (fillId === null) return { fillId: null, fillHeight: 0 };

  let used = 0;
  for (const id of order) {
    used += PANEL_HEADER_H;
    const isExpanded = !(collapsed[id] ?? false);
    // Body height for fixed docks + the splitter below every expanded
    // non-fill dock. The fill dock gets whatever `availableHeight` leaves.
    if (isExpanded && id !== fillId) used += (heights[id] ?? MIN_PANEL_BODY) + SPLITTER_H;
  }
  return { fillId, fillHeight: Math.max(MIN_PANEL_BODY, availableHeight - used) };
}

/**
 * Body height for the dock a splitter is dragging, given the move delta.
 * `targetId` is always an expanded non-fill dock (splitters only exist
 * below those). Growth is capped so the fill dock keeps at least
 * MIN_PANEL_BODY; shrink is capped at MIN_PANEL_BODY.
 */
export function nextBodyHeight(
  geometry: StackGeometry,
  targetId: PanelId,
  heights: PanelHeightMap,
  delta: number,
): number {
  const current = heights[targetId] ?? MIN_PANEL_BODY;
  const slack = Math.max(0, geometry.fillHeight - MIN_PANEL_BODY);
  const max = Math.min(MAX_PANEL_BODY, current + slack);
  return Math.max(MIN_PANEL_BODY, Math.min(max, current + delta));
}
