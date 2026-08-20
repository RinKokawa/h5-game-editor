/**
 * PanelStack — a reorderable, resizable vertical stack of PanelDocks.
 *
 * One stack fills each side column. Layout comes from the layout store
 * (order / body heights / collapsed flags); this component only measures
 * the available column height and turns gestures into store writes:
 *
 *  - Resize: a Splitter below every expanded non-fill dock drags that
 *    dock's body height (clamped by panelStackMath); the last expanded
 *    dock ("fill") stretches to whatever height is left.
 *  - Reorder: HTML5 drag on a dock header; dropping on the top/bottom
 *    half of another header inserts before/after it (accent line shows
 *    the landing slot).
 *  - No clipping: docks are never squeezed by flexbox — when the stored
 *    heights exceed the column, the stack itself scrolls.
 *
 * Splitter handlers read the store via `getState()` on every move so a
 * drag started on one render never applies deltas to stale heights.
 */

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react';

import {
  MIN_PANEL_BODY,
  useLayoutStore,
  type PanelId,
  type PanelSide,
} from '@state/layoutStore';

import { PanelDock } from './PanelDock';
import styles from './PanelStack.module.css';
import { computeStackGeometry, moveItem, nextBodyHeight } from './panelStackMath';
import { Splitter } from './Splitter';

/** One dockable panel as declared by EditorShell. */
export interface PanelSpec {
  readonly id: PanelId;
  readonly title: string;
  readonly render: () => ReactNode;
}

export interface PanelStackProps {
  readonly side: PanelSide;
  readonly panels: readonly PanelSpec[];
}

interface DropHint {
  readonly targetId: PanelId;
  readonly position: 'above' | 'below';
}

/**
 * The persisted order may reference panels that no longer exist (or miss
 * newly registered ones): keep known ids in their stored order, append
 * the rest, so a stale localStorage entry can never break the stack.
 */
function normalizeOrder(
  order: readonly PanelId[],
  panels: readonly PanelSpec[],
): PanelId[] {
  const specIds = panels.map((p) => p.id);
  const known = order.filter((id) => specIds.includes(id));
  const missing = specIds.filter((id) => !known.includes(id));
  return [...known, ...missing];
}

export function PanelStack({ side, panels }: PanelStackProps) {
  const order = useLayoutStore((s) => (side === 'left' ? s.leftPanelOrder : s.rightPanelOrder));
  const heights = useLayoutStore((s) => s.panelHeights);
  const collapsedMap = useLayoutStore((s) => s.panelCollapsed);
  const setPanelOrder = useLayoutStore((s) => s.setPanelOrder);
  const setPanelHeight = useLayoutStore((s) => s.setPanelHeight);
  const togglePanelCollapsed = useLayoutStore((s) => s.togglePanelCollapsed);

  const stackRef = useRef<HTMLDivElement | null>(null);
  // Mirror of `available` readable from event handlers without stale closures.
  const availableRef = useRef(0);
  const [available, setAvailable] = useState(0);
  const [draggingId, setDraggingId] = useState<PanelId | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);

  const specById = new Map(panels.map((p) => [p.id, p] as const));
  const ordered = normalizeOrder(order, panels);
  const geometry = computeStackGeometry(ordered, heights, collapsedMap, available);

  useEffect(() => {
    const el = stackRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 0;
      if (height <= 0 || Math.abs(height - availableRef.current) < 1) return;
      availableRef.current = height;
      setAvailable(height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Keep the fill dock's stored height equal to its measured size so a
  // later reorder (which may un-fill it) does not jump to a stale value.
  useEffect(() => {
    const fillId = geometry.fillId;
    if (fillId === null || available <= 0) return;
    const stored = heights[fillId];
    if (stored === undefined || Math.abs(stored - geometry.fillHeight) < 1) return;
    setPanelHeight(fillId, geometry.fillHeight);
  }, [geometry.fillId, geometry.fillHeight, available, heights, setPanelHeight]);

  const handleSplitterResize = (id: PanelId) => (delta: number): void => {
    const s = useLayoutStore.getState();
    const orderNow = normalizeOrder(
      side === 'left' ? s.leftPanelOrder : s.rightPanelOrder,
      panels,
    );
    const geometryNow = computeStackGeometry(
      orderNow,
      s.panelHeights,
      s.panelCollapsed,
      availableRef.current,
    );
    s.setPanelHeight(id, nextBodyHeight(geometryNow, id, s.panelHeights, delta));
  };

  const clearDrag = (): void => {
    setDraggingId(null);
    setDropHint(null);
  };

  const handleDragStart = (id: PanelId) => (event: DragEvent<HTMLElement>): void => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    setDraggingId(id);
  };

  const handleDragOver = (id: PanelId) => (event: DragEvent<HTMLElement>): void => {
    if (draggingId === null || draggingId === id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const rect = event.currentTarget.getBoundingClientRect();
    const position: 'above' | 'below' =
      event.clientY < rect.top + rect.height / 2 ? 'above' : 'below';
    setDropHint((prev) =>
      prev !== null && prev.targetId === id && prev.position === position
        ? prev
        : { targetId: id, position },
    );
  };

  const handleDrop = (targetId: PanelId) => (event: DragEvent<HTMLElement>): void => {
    event.preventDefault();
    const draggedSpec = panels.find((p) => p.id === event.dataTransfer.getData('text/plain'));
    if (!draggedSpec || draggedSpec.id === targetId) {
      clearDrag();
      return;
    }
    const from = ordered.indexOf(draggedSpec.id);
    const targetIndex = ordered.indexOf(targetId);
    if (from < 0 || targetIndex < 0) {
      clearDrag();
      return;
    }
    const insertAt =
      dropHint !== null && dropHint.targetId === targetId && dropHint.position === 'below'
        ? targetIndex + 1
        : targetIndex;
    const to = from < insertAt ? insertAt - 1 : insertAt;
    setPanelOrder(side, moveItem(ordered, from, to));
    clearDrag();
  };

  const nodes: ReactNode[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const id = ordered[i];
    if (id === undefined) continue;
    if (i > 0) {
      const prev = ordered[i - 1];
      // A splitter below an expanded non-fill dock resizes that dock; the
      // fill dock (and collapsed docks) have nothing to resize below them.
      if (prev !== undefined && !(collapsedMap[prev] ?? false) && prev !== geometry.fillId) {
        nodes.push(
          <Splitter
            key={`splitter-${prev}`}
            direction="horizontal"
            onResize={handleSplitterResize(prev)}
            ariaLabel={`Resize ${specById.get(prev)?.title ?? prev} panel`}
          />,
        );
      }
    }
    const spec = specById.get(id);
    if (!spec) continue;
    const isCollapsed = collapsedMap[id] ?? false;
    const isFill = !isCollapsed && geometry.fillId === id;
    nodes.push(
      <PanelDock
        key={id}
        title={spec.title}
        collapsed={isCollapsed}
        onToggle={() => togglePanelCollapsed(id)}
        variant={isFill ? 'fill' : 'fixed'}
        bodyHeight={isFill ? undefined : (heights[id] ?? MIN_PANEL_BODY)}
        headerDraggable
        headerDragging={draggingId === id}
        headerDropHint={dropHint !== null && dropHint.targetId === id ? dropHint.position : null}
        onHeaderDragStart={handleDragStart(id)}
        onHeaderDragOver={handleDragOver(id)}
        onHeaderDrop={handleDrop(id)}
        onHeaderDragEnd={clearDrag}
      >
        {spec.render()}
      </PanelDock>,
    );
  }

  return (
    <div ref={stackRef} className={styles.stack} data-side={side}>
      {nodes}
    </div>
  );
}
