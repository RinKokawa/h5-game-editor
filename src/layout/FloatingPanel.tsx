/**
 * FloatingPanel — absolutely-positioned panel container.
 *
 * Step 30-B. Renders one panel's content outside the EditorShell
 * grid as an overlapping window. Position / size / z-order live on
 * `useLayoutStore.floatingPosition[id]` and `floatingZ[id]`; the
 * header is the drag handle (pointer events, no react-draggable
 * dependency).
 *
 * Lifecycle:
 *  - User clicks the "detach" button on PanelDock → store flips the
 *    panel's state to 'floating' → FloatingPanel mounts.
 *  - User drags the header → store updates floatingPosition.
 *  - User clicks the title bar (not a button) → `raisePanel(id)`.
 *  - User clicks the minimize button → state → 'minimized' (header
 *    only, no body).
 *  - User clicks the close (×) button → state → 'docked' (FloatingPanel
 *    unmounts; PanelStack picks the panel back up).
 *
 * Phase 2 will add drag-out-of-dock (instead of the explicit button)
 * and snap-to-edge. Phase 3 (Tab mode) is out of scope; see
 * `memory/project_detachable_panels_plan.md`.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

import {
  useLayoutStore,
  type FloatingRect,
  type PanelDockState,
  type PanelId,
} from '@state/layoutStore';

import styles from './FloatingPanel.module.css';

const Z_BASE = 100; // floating panels layer above the EditorShell grid

export interface FloatingPanelProps {
  readonly id: PanelId;
  readonly title: string;
  readonly state: PanelDockState;
  /** Render-prop for the panel body. */
  readonly children: ReactNode;
}

export function FloatingPanel({ id, title, state, children }: FloatingPanelProps) {
  const rect = useLayoutStore((s) => s.floatingPosition[id]);
  const z = useLayoutStore((s) => s.floatingZ[id] ?? 0);
  const setFloatingPosition = useLayoutStore((s) => s.setFloatingPosition);
  const setPanelDockState = useLayoutStore((s) => s.setPanelDockState);
  const raisePanel = useLayoutStore((s) => s.raisePanel);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);

  // Raise on mount so a freshly detached panel isn't stuck behind
  // others with the same default z.
  useEffect(() => {
    raisePanel(id);
  }, [id, raisePanel]);

  const handleHeaderPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // Ignore drags initiated on the title / minimize / close buttons.
      const target = event.target as HTMLElement;
      if (target.closest(`.${styles.headerButton}`)) return;
      if (event.button !== 0) return;

      const panel = panelRef.current;
      if (!panel) return;
      const currentRect = useLayoutStore.getState().floatingPosition[id];
      if (!currentRect) return;

      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        origX: currentRect.x,
        origY: currentRect.y,
      };
      setIsDragging(true);
      raisePanel(id);

      // Capture so the drag survives the cursor leaving the header.
      try {
        (event.target as Element).setPointerCapture(event.pointerId);
      } catch {
        // Some elements refuse capture; the document-level listeners
        // below still work.
      }
      event.preventDefault();
    },
    [id, raisePanel],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      const current = useLayoutStore.getState().floatingPosition[id];
      if (!current) return;
      const next: FloatingRect = {
        x: Math.max(0, drag.origX + dx),
        y: Math.max(0, drag.origY + dy),
        w: current.w,
        h: current.h,
      };
      setFloatingPosition(id, next);
    };

    const handlePointerUp = () => {
      dragRef.current = null;
      setIsDragging(false);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, id, setFloatingPosition]);

  const handleMinimize = useCallback(() => {
    setPanelDockState(id, 'minimized');
  }, [id, setPanelDockState]);

  const handleDock = useCallback(() => {
    setPanelDockState(id, 'docked');
  }, [id, setPanelDockState]);

  const handlePanelMouseDown = useCallback(() => {
    raisePanel(id);
  }, [id, raisePanel]);

  const isMinimized = state === 'minimized';

  if (!rect) return null;

  return (
    <div
      ref={panelRef}
      className={`${styles.panel} ${isMinimized ? styles.panelMinimized : ''}`}
      style={{
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.w}px`,
        height: isMinimized ? undefined : `${rect.h}px`,
        zIndex: Z_BASE + z,
      }}
      data-panel-id={id}
      data-dragging={isDragging ? 'true' : undefined}
      onMouseDown={handlePanelMouseDown}
    >
      <div className={styles.header} onPointerDown={handleHeaderPointerDown}>
        <span className={styles.title}>{title}</span>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.headerButton}
            aria-label={isMinimized ? 'Restore panel' : 'Minimize panel'}
            onClick={isMinimized ? () => setPanelDockState(id, 'floating') : handleMinimize}
          >
            {isMinimized ? '▢' : '─'}
          </button>
          <button
            type="button"
            className={styles.headerButton}
            aria-label="Dock panel back"
            title="Dock back"
            onClick={handleDock}
          >
            ×
          </button>
        </div>
      </div>
      {!isMinimized && <div className={styles.body}>{children}</div>}
    </div>
  );
}