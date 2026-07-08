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

import { useT } from '@core/i18n';
import { useHistoryStore } from '@state/historyStore';
import { useToolStore } from '@state/toolStore';

import styles from './Toolbar.module.css';

import type { ToolId } from '@state/toolStore';

interface ToolButton {
  readonly id: ToolId | 'placeholder';
  readonly labelKey: string;
  readonly shortcut: string;
  readonly enabled: boolean;
}

const TOOLS: readonly ToolButton[] = [
  { id: 'select', labelKey: 'toolbar.tool.select', shortcut: 'V', enabled: true },
  { id: 'pan', labelKey: 'toolbar.tool.pan', shortcut: 'H', enabled: true },
  { id: 'brush', labelKey: 'toolbar.tool.brush', shortcut: 'B', enabled: true },
  { id: 'eraser', labelKey: 'toolbar.tool.eraser', shortcut: 'E', enabled: true },
  { id: 'placeholder', labelKey: 'toolbar.tool.fill', shortcut: 'F', enabled: false },
  { id: 'placeholder', labelKey: 'toolbar.tool.rect', shortcut: 'R', enabled: false },
];

export function Toolbar() {
  const t = useT();
  const activeToolId = useToolStore((s) => s.activeToolId);
  const setActiveTool = useToolStore((s) => s.setActiveTool);

  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  return (
    <nav className={styles.toolbar} aria-label={t('menu.tools')}>
      <div className={styles.group}>
        {TOOLS.map((tool) => {
          const isActive = tool.enabled && tool.id === activeToolId;
          const onClick = tool.enabled ? () => setActiveTool(tool.id as ToolId) : undefined;
          const label = t(tool.labelKey);
          return (
            <button
              key={tool.id + ':' + tool.labelKey}
              type="button"
              className={styles.toolButton}
              data-active={isActive}
              disabled={!tool.enabled}
              onClick={onClick}
              title={
                tool.shortcut
                  ? t('toolbar.tool.shortcut', { name: label, shortcut: tool.shortcut })
                  : label
              }
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className={styles.spacer} />
      <div className={styles.group}>
        <button
          type="button"
          className={styles.actionButton}
          title={t('toolbar.undo.shortcut', { shortcut: 'Ctrl+Z' })}
          disabled={!canUndo}
          onClick={undo}
        >
          {t('toolbar.undo')}
        </button>
        <button
          type="button"
          className={styles.actionButton}
          title={t('toolbar.redo.shortcut', { shortcut: 'Ctrl+Y' })}
          disabled={!canRedo}
          onClick={redo}
        >
          {t('toolbar.redo')}
        </button>
      </div>
    </nav>
  );
}
