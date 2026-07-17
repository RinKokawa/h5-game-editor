/**
 * SelectionShortcuts — keyboard shortcuts for selection editing.
 *
 *   Delete / Backspace → erase the current selection:
 *                          - tile selection: EraseSelectionCommand
 *                          - entity selection: RemoveEntityCommand
 *                          - collider selection: RemoveColliderCommand
 *   Escape             → clear the current selection (any kind)
 *
 * Step 25 lifts these into declarative {@link Shortcut} values.
 * The run() callbacks call `event.preventDefault()` after the
 * registry dispatches, so the handler must receive the original
 * event.
 */

import { commandBus } from '@core/command/commandBusSingleton';
import {
  EraseSelectionCommand,
  RemoveColliderCommand,
  RemoveEntityCommand,
} from '@editor/map/commands/index';
import { useSelectionStore } from '@state/selectionStore';

import type { Shortcut } from './Shortcut';

const handleDelete = (event: KeyboardEvent): void => {
  const sel = useSelectionStore.getState().selection;
  if (!sel) return;
  event.preventDefault();

  switch (sel.kind) {
    case 'entity':
      commandBus.execute(new RemoveEntityCommand(sel.entityId));
      useSelectionStore.getState().clear();
      return;
    case 'collider':
      commandBus.execute(new RemoveColliderCommand(sel.colliderId));
      useSelectionStore.getState().clear();
      return;
    case 'tiles':
      commandBus.execute(new EraseSelectionCommand());
      return;
    default: {
      const _exhaustive: never = sel;
      return void _exhaustive;
    }
  }
};

const handleEscape = (event: KeyboardEvent): void => {
  const sel = useSelectionStore.getState().selection;
  const marquee = useSelectionStore.getState().marquee;
  if (sel === null && marquee === null) return;
  event.preventDefault();
  useSelectionStore.getState().clear();
};

export const selectionShortcuts: readonly Shortcut[] = [
  {
    id: 'selection.delete',
    binding: { kind: 'key', key: 'Delete' },
    run: handleDelete,
  },
  {
    id: 'selection.backspace',
    binding: { kind: 'key', key: 'Backspace' },
    run: handleDelete,
  },
  {
    id: 'selection.escape',
    binding: { kind: 'key', key: 'Escape' },
    run: handleEscape,
  },
];