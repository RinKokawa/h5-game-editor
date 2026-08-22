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

import { useT } from '@core/i18n';
import { useLayoutStore } from '@state/layoutStore';
import { useToolStore, type ToolId } from '@state/toolStore';
import { useWorkspaceStore } from '@state/workspaceStore';

import styles from './MenuBar.module.css';

interface FileAction {
  readonly labelKey: string;
  readonly shortcut?: string;
  readonly onClick: () => void;
}

export interface MenuBarProps {
  readonly fileActions: ReadonlyArray<FileAction>;
  /**
   * Opens the project's GitHub repository in the OS default
   * browser. Wired by `EditorShell` (which has the bridge access
   * that `panels/` cannot have per the ESLint boundary).
   */
  readonly onOpenDocs: () => void;
  /**
   * Toggles the About dialog. Wired by `EditorShell` which owns
   * the dialog's mount + state.
   */
  readonly onShowAbout: () => void;
  /**
   * Toggles the Preferences dialog (Edit → Preferences). Wired by
   * `EditorShell` for the same reason as `onShowAbout`.
   */
  readonly onShowPreferences: () => void;
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
  readonly items: ReadonlyArray<MenuItem | { readonly kind: 'separator' }>;
}

// Tool shortcut table mirrors the keys the Toolbar uses. Kept in
// MenuBar (not imported) so the menu stays self-contained and the
// Toolbar can be deleted or renamed without touching this file.
const TOOL_DEFS: ReadonlyArray<{ readonly id: ToolId; readonly shortcut: string }> = [
  { id: 'select', shortcut: 'V' },
  { id: 'pan', shortcut: 'H' },
  { id: 'brush', shortcut: 'B' },
  { id: 'eraser', shortcut: 'E' },
  { id: 'rect', shortcut: 'R' },
  { id: 'entity', shortcut: 'O' },
  { id: 'collider', shortcut: 'C' },
];

export function MenuBar({ fileActions, onOpenDocs, onShowAbout, onShowPreferences }: MenuBarProps) {
  const t = useT();
  // EditorShell only mounts MenuBar in the editor phase, where
  // `current` is guaranteed non-null — the `t('project.untitled')`
  // fallback is purely defensive (e.g. a future state where MenuBar
  // mounts during a transition).
  const projectName = useWorkspaceStore((s) => s.current?.name) ?? t('project.untitled');

  // Subscribe so the Tools / Window checkmarks re-render when
  // state changes (e.g. picking a tool via Toolbar shortcut should
  // move the checkmark in the menu).
  const activeToolId = useToolStore((s) => s.activeToolId);
  const bottomCollapsed = useLayoutStore((s) => s.bottomCollapsed);

  // Which dropdown is currently open, or `null` if none. Single-
  // open at a time matches native menu bars — opening File
  // automatically closes View if it was up.
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLElement | null>(null);

  // Escape closes. We previously also attached a `mousedown`
  // listener on `document` for outside-click close, but PixiJS's
  // canvas swallows some pointer events before they bubble to
  // document, so the listener didn't fire reliably when clicking
  // the canvas area. The fix is to render an invisible full-screen
  // backdrop (`.menuBackdrop`) while a menu is open — z-index
  // layering puts it above the canvas and the side panels but
  // below the dropdown itself, so clicks anywhere except the menu
  // bar / dropdown items land on the backdrop and close.
  useEffect(() => {
    if (openMenuKey === null) return;
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpenMenuKey(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
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

  const languageItems: ReadonlyArray<MenuItem> = []; // moved to Edit → Preferences (Blender convention)

  // Edit items: data ops (visible-but-no-op stubs for now) +
  // `separator` placeholder before the `Preferences` entry, mirroring
  // the Blender / Photoshop / Unity layout (ops on top, app-wide
  // settings below). The separator is rendered as a divider in the
  // dropdown — see `<MenuItem>` renderer below.
  type EditItem = MenuItem | { readonly kind: 'separator' };
  const editItems: ReadonlyArray<EditItem> = [
    { labelKey: 'menu.edit.undo', shortcut: 'Ctrl+Z' },
    { labelKey: 'menu.edit.redo', shortcut: 'Ctrl+Y' },
    { labelKey: 'menu.edit.cut', shortcut: 'Ctrl+X' },
    { labelKey: 'menu.edit.copy', shortcut: 'Ctrl+C' },
    { labelKey: 'menu.edit.paste', shortcut: 'Ctrl+V' },
    { labelKey: 'menu.edit.selectAll', shortcut: 'Ctrl+A' },
    { kind: 'separator' },
    {
      labelKey: 'menu.edit.preferences',
      onClick: () => {
        onShowPreferences();
      },
    },
  ];

  // Tools items wire to setActiveTool — same code path the
  // shortcuts and Toolbar buttons use. Checkmark tracks the active
  // tool so picking via menu reflects in Toolbar and vice versa.
  const toolsItems: ReadonlyArray<MenuItem> = TOOL_DEFS.map((t) => ({
    labelKey: `menu.tools.${t.id}`,
    shortcut: t.shortcut,
    onClick: () => {
      useToolStore.getState().setActiveTool(t.id);
    },
    checkMark: activeToolId === t.id,
  }));

  // Window items toggle panel collapse state. Visible-state check
  // (checkMark) lets the user see the current layout at a glance.
  const windowItems: ReadonlyArray<MenuItem> = [
    {
      labelKey: 'menu.window.toggleConsole',
      onClick: () => {
        useLayoutStore.getState().toggleBottomCollapsed();
      },
      checkMark: !bottomCollapsed,
    },
    {
      labelKey: 'menu.window.toggleLeftPanel',
      onClick: () => {
        useLayoutStore.getState().toggleLeftCollapsed();
      },
    },
    {
      labelKey: 'menu.window.toggleRightPanel',
      onClick: () => {
        useLayoutStore.getState().toggleRightCollapsed();
      },
    },
  ];

  // Help items. About opens the About dialog (mounted by
  // EditorShell — MenuBar only flips the open flag via
  // `onShowAbout`). Documentation fires `onOpenDocs`, which
  // EditorShell routes to `shell.openExternal` through the IPC
  // bridge. `panels/` cannot import `systems/` directly per the
  // ESLint boundary, so neither call lives in this file.
  const helpItems: ReadonlyArray<MenuItem> = [
    {
      labelKey: 'menu.help.about',
      onClick: () => {
        onShowAbout();
      },
    },
    {
      labelKey: 'menu.help.docs',
      onClick: () => {
        onOpenDocs();
      },
    },
  ];

  const menus: ReadonlyArray<MenuDef> = [
    { labelKey: 'menu.file', items: fileItems },
    { labelKey: 'menu.edit', items: editItems },
    { labelKey: 'menu.view', items: languageItems },
    { labelKey: 'menu.tools', items: toolsItems },
    { labelKey: 'menu.window', items: windowItems },
    { labelKey: 'menu.help', items: helpItems },
  ];

  const renderLabel = (item: MenuItem): string => {
    if (item.label !== undefined) return item.label;
    if (item.labelKey !== undefined) return t(item.labelKey);
    return '';
  };

  return (
    <>
      {/* Full-screen backdrop while a menu is open. Renders as a
          sibling of <header> (not inside it) so a click on the
          backdrop is not "inside the menu bar" by `contains`
          checks — its own onClick closes the menu unconditionally.
          z-index: 99 keeps it under the menu bar (100) and the
          dropdown items (101). */}
      {openMenuKey !== null && (
        <div
          className={styles.menuBackdrop}
          onMouseDown={() => {
            setOpenMenuKey(null);
          }}
          aria-hidden="true"
        />
      )}
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
                    // Separator slots visually break a dropdown into
                    // groups (Blender / native pattern). They carry
                    // no action; `handleItemClick` would no-op them
                    // anyway because they have no `onClick`.
                    if ('kind' in item && item.kind === 'separator') {
                      return (
                        <div
                          key={`separator-${idx}`}
                          className={styles.dropdownSeparator}
                          role="separator"
                        />
                      );
                    }
                    const realItem = item as MenuItem;
                    const itemKey = realItem.labelKey ?? realItem.label ?? String(idx);
                    return (
                      <button
                        key={itemKey}
                        type="button"
                        className={styles.dropdownItem}
                        role="menuitem"
                        onClick={() => {
                          handleItemClick(realItem);
                        }}
                      >
                        <span>
                          {realItem.checkMark !== undefined && (
                            <span className={styles.checkMark} aria-hidden="true">
                              {realItem.checkMark ? (
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
                          {renderLabel(realItem)}
                        </span>
                        {realItem.shortcut !== undefined && (
                          <span className={styles.shortcut}>{realItem.shortcut}</span>
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
    </>
  );
}
