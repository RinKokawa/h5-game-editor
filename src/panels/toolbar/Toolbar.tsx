/**
 * Toolbar — quick-access buttons for the active tool and Undo/Redo.
 *
 * Tools are bound to `toolStore.activeToolId`. Clicking a tool
 * button dispatches `setActiveTool(<id>)`. Undo/Redo read
 * `historyStore.canUndo` / `canRedo` so they disable themselves
 * when the corresponding stack is empty. Save/Load live in the
 * File menu (see MenuBar) so this panel doesn't have to depend on
 * the persistence system.
 */

import { useHistoryStore } from '@state/historyStore';
import { useToolStore } from '@state/toolStore';

import styles from './Toolbar.module.css';

import type { ToolId } from '@state/toolStore';

interface ToolButton {
  readonly id: ToolId | 'placeholder';
  readonly label: string;
  readonly shortcut?: string;
  readonly enabled: boolean;
}

const TOOLS: readonly ToolButton[] = [
  { id: 'select', label: 'Select', shortcut: 'V', enabled: true },
  { id: 'pan', label: 'Pan', shortcut: 'H', enabled: true },
  { id: 'brush', label: 'Brush', shortcut: 'B', enabled: true },
  { id: 'eraser', label: 'Eraser', shortcut: 'E', enabled: true },
  { id: 'placeholder', label: 'Fill', shortcut: 'F', enabled: false },
  { id: 'placeholder', label: 'Rect', shortcut: 'R', enabled: false },
];

export function Toolbar() {
  const activeToolId = useToolStore((s) => s.activeToolId);
  const setActiveTool = useToolStore((s) => s.setActiveTool);

  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  return (
    <nav className={styles.toolbar} aria-label="Tools">
      <div className={styles.group}>
        {TOOLS.map((tool) => {
          const isActive = tool.enabled && tool.id === activeToolId;
          const onClick = tool.enabled ? () => setActiveTool(tool.id as ToolId) : undefined;
          return (
            <button
              key={tool.id + ':' + tool.label}
              type="button"
              className={styles.toolButton}
              data-active={isActive}
              disabled={!tool.enabled}
              onClick={onClick}
              title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
            >
              {tool.label}
            </button>
          );
        })}
      </div>
      <div className={styles.spacer} />
      <div className={styles.group}>
        <button
          type="button"
          className={styles.actionButton}
          title="Undo (Ctrl+Z)"
          disabled={!canUndo}
          onClick={undo}
        >
          Undo
        </button>
        <button
          type="button"
          className={styles.actionButton}
          title="Redo (Ctrl+Y)"
          disabled={!canRedo}
          onClick={redo}
        >
          Redo
        </button>
      </div>
    </nav>
  );
}
