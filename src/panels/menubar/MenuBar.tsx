/**
 * MenuBar — top-level menu.
 *
 * v0.1 wires the File menu to Save / Load (also Ctrl+S, Ctrl+O).
 * The remaining labels (Edit, View, Tools, Window, Help) are
 * placeholders for future dropdowns / Extension Registry wiring.
 *
 * Save / Load callbacks are passed in as props so this panel
 * doesn't have to depend on the persistence system directly. The
 * app layer wires the real handlers.
 */

import styles from './MenuBar.module.css';

interface MenuAction {
  readonly label: string;
  readonly shortcut?: string;
  readonly onClick: () => void;
}

export interface MenuBarProps {
  readonly fileActions: ReadonlyArray<MenuAction>;
}

const STATIC_MENUS: readonly { label: string }[] = [
  { label: 'File' },
  { label: 'Edit' },
  { label: 'View' },
  { label: 'Tools' },
  { label: 'Window' },
  { label: 'Help' },
];

export function MenuBar({ fileActions }: MenuBarProps) {
  return (
    <header className={styles.menuBar} role="menubar">
      <div className={styles.left}>
        {STATIC_MENUS.map((menu) => (
          <div key={menu.label} className={styles.menuGroup}>
            <button type="button" className={styles.menuButton} role="menuitem">
              {menu.label}
            </button>
            {menu.label === 'File' && fileActions.length > 0 && (
              <div className={styles.dropdown} role="menu">
                {fileActions.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className={styles.dropdownItem}
                    role="menuitem"
                    onClick={item.onClick}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <span className={styles.shortcut}>{item.shortcut}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
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
