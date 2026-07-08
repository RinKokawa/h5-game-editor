/**
 * PanelColumn — vertical stack of PanelDocks sharing a fixed width.
 *
 * Used for the left and right side panels. Width is supplied by the parent
 * (driven by the layout store). The column itself does not manage its own
 * sizing.
 */

import { type ReactNode } from 'react';

import styles from './PanelColumn.module.css';

export interface PanelColumnProps {
  readonly width: number;
  readonly collapsed: boolean;
  readonly children: ReactNode;
  readonly side: 'left' | 'right';
}

export function PanelColumn({ width, collapsed, side, children }: PanelColumnProps) {
  if (collapsed) {
    return (
      <aside className={styles.columnCollapsed} data-side={side}>
        {children}
      </aside>
    );
  }
  return (
    <aside className={styles.column} data-side={side} style={{ width: `${width}px` }}>
      {children}
    </aside>
  );
}
