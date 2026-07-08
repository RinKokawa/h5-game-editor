/**
 * SelectionShortcuts — keyboard shortcuts for selection editing.
 *
 *   Delete / Backspace → erase the current selection:
 *                          - tile selection: EraseSelectionCommand
 *                          - entity selection: RemoveEntityCommand
 *                          - collider selection: RemoveColliderCommand
 *   Escape             → clear the current selection (any kind)
 *
 * Listens on `window`, ignores key events from form controls so
 * typing in inputs doesn't accidentally erase the user's work.
 */

import { commandBus } from '@core/command/commandBusSingleton';
import {
  EraseSelectionCommand,
  RemoveColliderCommand,
  RemoveEntityCommand,
} from '@editor/map/commands/index';
import { useSelectionStore } from '@state/selectionStore';

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

export class SelectionShortcuts {
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (isEditableTarget(event.target)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === 'Delete' || event.key === 'Backspace') {
      this.handleDelete(event);
      return;
    }
    if (event.key === 'Escape') {
      const sel = useSelectionStore.getState().selection;
      const marquee = useSelectionStore.getState().marquee;
      if (sel === null && marquee === null) return;
      event.preventDefault();
      useSelectionStore.getState().clear();
    }
  };

  private handleDelete(event: KeyboardEvent): void {
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
      case 'tiles': {
        const cmd = new EraseSelectionCommand();
        commandBus.execute(cmd);
        return;
      }
      default: {
        // exhaustive
        const _exhaustive: never = sel;
        return void _exhaustive;
      }
    }
  }

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
