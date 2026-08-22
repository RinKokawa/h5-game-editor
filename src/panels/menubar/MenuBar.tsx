/**
 * MenuBar — top-level menu.
 *
 * v0.1 wires File → Save / Load and View → Language. The remaining
 * menus (Edit, Tools, Window, Help) are placeholders for future
 * dropdowns / Extension Registry wiring.
 *
 * Save / Load callbacks are passed in as props so this panel
 * doesn't have to depend on the persistence system directly. The
 * app layer wires the real handlers.
 *
 * File dropdown items use `labelKey` (a bundle key) instead of a
 * pre-translated `label` so MenuBar owns all UI strings and can
 * re-render when the locale flips. Shortcuts stay as platform
 * identifiers.
 *
 * The language switcher uses a literal `label` (the language's own
 * native name) instead of a bundle key — the convention is to
 * always show language names in their native script.
 *
 * Dropdown UX: click-to-open (not hover), click-outside / Escape to
 * close, single menu open at a time. Native desktop menus follow
 * the same pattern; hover-to-open is too eager on a touchpad and
 * surprises users who mouse past the bar.
 */

import { useEffect, useRef, useState } from 'react';

import { AVAILABLE_LOCALES, NATIVE_NAMES, setLocale, useLocale, useT } from '@core/i18n';
import { useWorkspaceStore } from '@state/workspaceStore';

import styles from './MenuBar.module.css';

import type { Locale } from '@core/i18n';

interface FileAction {
  readonly labelKey: string;
  readonly shortcut?: string;
  readonly onClick: () => void;
}

export interface MenuBarProps {
  readonly fileActions: ReadonlyArray<FileAction>;
}

interface MenuItem {
  readonly labelKey?: string;
  readonly label?: string;
  readonly shortcut?: string;
  readonly onClick?: () => void;
  readonly checkMark?: boolean;
}

interface MenuDef {
  readonly labelKey: string;
  readonly items: ReadonlyArray<MenuItem>;
}

export function MenuBar({ fileActions }: MenuBarProps) {
  const t = useT();
  const currentLocale = useLocale();
  // EditorShell only mounts MenuBar in the editor phase, where
  // `current` is guaranteed non-null — the `t('project.untitled')`
  // fallback is purely defensive (e.g. a future state where MenuBar
  // mounts during a transition).
  const projectName = useWorkspaceStore((s) => s.current?.name) ?? t('project.untitled');

  // Which dropdown is currently open, or `null` if none. Single-
  // open at a time matches native menu bars — opening File
  // automatically closes View if it was up.
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLElement | null>(null);

  // Outside-click + Escape close. We attach listeners only while a
  // menu is open so we don't pay for them the rest of the time
  // (and so we don't leak handlers between mounts). `mousedown`
  // (not `click`) catches the gesture before any menu item's
  // `onClick` fires, so an outside tap closes first then does
  // nothing else.
  useEffect(() => {
    if (openMenuKey === null) return;
    const handleMouseDown = (e: MouseEvent): void => {
      const target = e.target as Node | null;
      if (target && menuBarRef.current && !menuBarRef.current.contains(target)) {
        setOpenMenuKey(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpenMenuKey(null);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuKey]);

  const toggleMenu = (key: string): void => {
    setOpenMenuKey((prev) => (prev === key ? null : key));
  };

  // Hybrid click-to-open + hover-to-switch: opening a menu is a
  // deliberate gesture (click) so we don't pop dropdowns when the
  // cursor merely passes over the bar. But once a menu IS open,
  // moving the cursor to a sibling top-level item should switch
  // to that menu without a second click — that's the native
  // macOS / Windows pattern and it's the difference between a
  // menu bar that feels responsive and one that feels like every
  // click is a separate decision. We only react to `mouseenter`
  // while a menu is already open, so the click-to-open guarantee
  // from the bug fix above is preserved.
  const handleMouseEnter = (key: string): void => {
    setOpenMenuKey((prev) => (prev !== null && prev !== key ? key : prev));
  };

  const handleItemClick = (item: MenuItem): void => {
    if (item.onClick) item.onClick();
    setOpenMenuKey(null);
  };

  const fileItems: ReadonlyArray<MenuItem> = fileActions.map((a) => ({
    labelKey: a.labelKey,
    shortcut: a.shortcut,
    onClick: a.onClick,
  }));

  const languageItems: ReadonlyArray<MenuItem> = AVAILABLE_LOCALES.map((localeId: Locale) => ({
    label: NATIVE_NAMES[localeId],
    onClick: () => setLocale(localeId),
    checkMark: localeId === currentLocale,
  }));

  const menus: ReadonlyArray<MenuDef> = [
    { labelKey: 'menu.file', items: fileItems },
    { labelKey: 'menu.edit', items: [] },
    { labelKey: 'menu.view', items: languageItems },
    { labelKey: 'menu.tools', items: [] },
    { labelKey: 'menu.window', items: [] },
    { labelKey: 'menu.help', items: [] },
  ];

  const renderLabel = (item: MenuItem): string => {
    if (item.label !== undefined) return item.label;
    if (item.labelKey !== undefined) return t(item.labelKey);
    return '';
  };

  return (
    <header ref={menuBarRef} className={styles.menuBar} role="menubar">
      <div className={styles.left}>
        {menus.map((menu) => {
          const menuLabel = t(menu.labelKey);
          const hasItems = menu.items.length > 0;
          const isOpen = openMenuKey === menu.labelKey;
          return (
            <div key={menu.labelKey} className={styles.menuGroup}>
              <button
                type="button"
                className={isOpen ? `${styles.menuButton} ${styles.menuButtonActive}` : styles.menuButton}
                role="menuitem"
                aria-haspopup={hasItems ? 'menu' : undefined}
                aria-expanded={hasItems ? isOpen : undefined}
                onClick={() => {
                  if (hasItems) toggleMenu(menu.labelKey);
                }}
                onMouseEnter={() => {
                  if (hasItems) handleMouseEnter(menu.labelKey);
                }}
              >
                {menuLabel}
              </button>
              {hasItems && (
                <div
                  className={styles.dropdown}
                  role="menu"
                  style={{ display: isOpen ? 'block' : 'none' }}
                >
                  {menu.items.map((item, idx) => {
                    const itemKey = item.labelKey ?? item.label ?? String(idx);
                    return (
                      <button
                        key={itemKey}
                        type="button"
                        className={styles.dropdownItem}
                        role="menuitem"
                        onClick={() => {
                          handleItemClick(item);
                        }}
                      >
                        <span>
                          {item.checkMark !== undefined && (
                            <span className={styles.checkMark} aria-hidden="true">
                              {item.checkMark ? (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M5 12l5 5L20 7" />
                                </svg>
                              ) : null}
                            </span>
                          )}
                          {renderLabel(item)}
                        </span>
                        {item.shortcut !== undefined && (
                          <span className={styles.shortcut}>{item.shortcut}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className={styles.projectName} aria-hidden="true">
        {projectName}
      </div>
      <div className={styles.right} aria-hidden="true">
        v0.1.0
      </div>
    </header>
  );
}
