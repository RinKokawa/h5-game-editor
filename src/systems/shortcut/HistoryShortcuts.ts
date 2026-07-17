/**
 * HistoryShortcuts — undo / redo keybindings.
 *
 *   Ctrl/Cmd + Z            → undo
 *   Ctrl/Cmd + Y            → redo
 *   Ctrl/Cmd + Shift + Z    → redo (alternative binding)
 *
 * Step 25 lifts these into declarative {@link Shortcut} values so
 * they all flow through the same {@link ShortcutRegistry}.
 */

import { commandBus } from '@core/command/commandBusSingleton';

import type { Shortcut } from './Shortcut';

export const historyShortcuts: readonly Shortcut[] = [
  {
    id: 'history.undo',
    binding: { kind: 'ctrlKey', key: 'z' },
    run: () => {
      commandBus.undo();
    },
  },
  {
    id: 'history.redo.y',
    binding: { kind: 'ctrlKey', key: 'y' },
    run: () => {
      commandBus.redo();
    },
  },
  {
    id: 'history.redo.shiftZ',
    binding: { kind: 'ctrlShiftKey', key: 'z' },
    run: () => {
      commandBus.redo();
    },
  },
];