/**
 * PanelDock — a single docked panel with a collapsible title bar.
 *
 * Two operating modes:
 *  - standalone (default): the dock manages its own open/closed state
 *    (`defaultOpen`), which is what the bottom Console slot uses;
 *  - stacked (driven by PanelStack): `collapsed` / `onToggle` control the
 *    state from the layout store, `variant` + `bodyHeight` give the dock
 *    an explicit size, and the header drag hooks wire reordering.
 *
 * The header stays interactive: the title button toggles the body, the
 * optional `actions` slot hosts small buttons (e.g. the layer "+" menu).
 */

import { useState, type DragEvent, type ReactNode } from 'react';

import styles from './PanelDock.module.css';
import { PANEL_HEADER_H } from './panelStackMath';

export interface PanelDockProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly defaultOpen?: boolean;
  /** Optional secondary action shown in the title bar (e.g. "+" menu). */
  readonly actions?: ReactNode;
  /** Controlled collapsed state. Omitted → the dock manages its own state. */
  readonly collapsed?: boolean;
  readonly onToggle?: () => void;
  /** 'fixed' sizes the dock to header + bodyHeight; 'fill' stretches to the remaining column height. */
  readonly variant?: 'fixed' | 'fill';
  /** Explicit body height in px (only used with variant 'fixed'). */
  readonly bodyHeight?: number;
  /** When true the header acts as a drag handle for reordering (PanelStack). */
  readonly headerDraggable?: boolean;
  readonly onHeaderDragStart?: (event: DragEvent<HTMLElement>) => void;
  readonly onHeaderDragOver?: (event: DragEvent<HTMLElement>) => void;
  readonly onHeaderDrop?: (event: DragEvent<HTMLElement>) => void;
  readonly onHeaderDragEnd?: () => void;
  /** Where the dragged dock would land if dropped on this header. */
  readonly headerDropHint?: 'above' | 'below' | null;
  readonly headerDragging?: boolean;
  /**
   * Step 30-B. When provided, the dock renders a "detach" button in
   * the header actions slot that flips the panel to floating state.
   * PanelStack passes this only for panels whose current state is
   * 'docked'.
   */
  readonly onDetach?: () => void;
}

export function PanelDock({
  title,
  children,
  defaultOpen = true,
  actions,
  collapsed,
  onToggle,
  variant = 'fixed',
  bodyHeight,
  headerDraggable = false,
  onHeaderDragStart,
  onHeaderDragOver,
  onHeaderDrop,
  onHeaderDragEnd,
  headerDropHint = null,
  headerDragging = false,
  onDetach,
}: PanelDockProps) {
  const [openState, setOpenState] = useState(defaultOpen);
  const isControlled = collapsed !== undefined;
  const open = isControlled ? !collapsed : openState;
  const bodyId = `panel-${title.replace(/\s+/g, '-').toLowerCase()}`;

  const dockClasses = [styles.dock, variant === 'fill' ? styles.dockFill : styles.dockFixed]
    .filter(Boolean)
    .join(' ');
  // Explicit height only applies to an expanded fixed dock — a collapsed
  // dock is header-only and the fill dock stretches via flex.
  const dockStyle =
    variant === 'fixed' && open && bodyHeight !== undefined
      ? { height: `${PANEL_HEADER_H + bodyHeight}px` }
      : undefined;

  return (
    <section
      className={dockClasses}
      data-collapsed={!open}
      data-drop-hint={headerDropHint ?? undefined}
      data-dragging={headerDragging ? 'true' : undefined}
      style={dockStyle}
    >
      <header
        className={styles.header}
        data-draggable={headerDraggable ? 'true' : undefined}
        draggable={headerDraggable}
        onDragStart={onHeaderDragStart}
        onDragOver={onHeaderDragOver}
        onDrop={onHeaderDrop}
        onDragEnd={onHeaderDragEnd}
      >
        <button
          type="button"
          className={styles.titleButton}
          onClick={() => (onToggle ? onToggle() : setOpenState(!openState))}
          aria-expanded={open}
          aria-controls={bodyId}
        >
          <span className={styles.caret} aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6l6-6" />
            </svg>
          </span>
          <span className={styles.title}>{title}</span>
        </button>
        {(actions || onDetach) && (
          <div className={styles.actions}>
            {actions}
            {onDetach && (
              <button
                type="button"
                className={styles.detachButton}
                aria-label={`Detach ${title} panel`}
                title="Detach as floating window"
                onClick={onDetach}
              >
                ⇗
              </button>
            )}
          </div>
        )}
      </header>
      {open && (
        <div className={styles.body} id={bodyId}>
          {children}
        </div>
      )}
    </section>
  );
}
