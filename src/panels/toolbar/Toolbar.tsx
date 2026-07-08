/**
 * Toolbar — quick-access buttons for the active tool.
 *
 * Tools are bound to `toolStore.activeToolId`. Clicking a tool button
 * dispatches `setActiveTool(<id>)`. Only tools that exist in
 * `ToolId` are wired; the rest remain visual placeholders.
 */

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
  { id: 'select', label: 'Select', shortcut: 'V', enabled: false },
  { id: 'pan', label: 'Pan', shortcut: 'H', enabled: false },
  { id: 'brush', label: 'Brush', shortcut: 'B', enabled: true },
  { id: 'eraser', label: 'Eraser', shortcut: 'E', enabled: false },
  { id: 'placeholder', label: 'Fill', shortcut: 'F', enabled: false },
  { id: 'placeholder', label: 'Rect', shortcut: 'R', enabled: false },
];

export function Toolbar() {
  const activeToolId = useToolStore((s) => s.activeToolId);
  const setActiveTool = useToolStore((s) => s.setActiveTool);

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
        <button type="button" className={styles.actionButton} title="Save (Ctrl+S)" disabled>
          Save
        </button>
        <button type="button" className={styles.actionButton} title="Undo (Ctrl+Z)" disabled>
          Undo
        </button>
        <button type="button" className={styles.actionButton} title="Redo (Ctrl+Y)" disabled>
          Redo
        </button>
      </div>
    </nav>
  );
}
