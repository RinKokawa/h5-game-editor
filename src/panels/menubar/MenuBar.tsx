/**
 * MenuBar — top-level menu.
 *
 * Static labels in v0.1. Future versions add dropdowns and command wiring
 * via the Extension Registry (menubar items register the same way panels
 * do).
 */

import styles from './MenuBar.module.css';

interface MenuItem {
  readonly label: string;
  readonly shortcut?: string;
}

const MENUS: readonly MenuItem[] = [
  { label: 'File' },
  { label: 'Edit' },
  { label: 'View' },
  { label: 'Tools' },
  { label: 'Window' },
  { label: 'Help' },
];

export function MenuBar() {
  return (
    <header className={styles.menuBar} role="menubar">
      <div className={styles.left}>
        {MENUS.map((menu) => (
          <button key={menu.label} type="button" className={styles.menuButton} role="menuitem">
            {menu.label}
          </button>
        ))}
      </div>
      <div className={styles.center} aria-hidden="true">
        Untitled Project
      </div>
      <div className={styles.right} aria-hidden="true">
        v0.1.0
      </div>
    </header>
  );
}
