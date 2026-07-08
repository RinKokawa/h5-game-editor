/**
 * PanelDock — a single docked panel with a collapsible title bar.
 *
 * Each dock manages its own open/closed state. A parent that needs to
 * control it programmatically can wrap it with a controlled shell (later
 * steps will introduce a "Reset Layout" command, for example).
 */

import { useState, type ReactNode } from 'react';

import styles from './PanelDock.module.css';

export interface PanelDockProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly defaultOpen?: boolean;
  /** Optional secondary action shown in the title bar (e.g. "+" menu). */
  readonly actions?: ReactNode;
}

export function PanelDock({ title, children, defaultOpen = true, actions }: PanelDockProps) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = `panel-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <section className={styles.dock} data-collapsed={!open}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.titleButton}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={bodyId}
        >
          <span className={styles.caret} aria-hidden="true">
            {open ? '▾' : '▸'}
          </span>
          <span className={styles.title}>{title}</span>
        </button>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      {open && (
        <div className={styles.body} id={bodyId}>
          {children}
        </div>
      )}
    </section>
  );
}
