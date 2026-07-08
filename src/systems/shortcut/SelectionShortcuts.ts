/**
 * SelectionShortcuts — keyboard shortcuts for selection editing.
 *
 *   Delete / Backspace → erase all tiles in the selection (one
 *                        CompositeCommand-style Command, undoable)
 *   Escape             → clear the current selection
 *
 * Listens on `window`, ignores key events from form controls so
 * typing in inputs doesn't accidentally erase the user's work.
 */

import { commandBus } from '@core/command/commandBusSingleton';
import { EraseSelectionCommand } from '@editor/map/commands/index';
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
      const cmd = new EraseSelectionCommand();
      if (cmd.isEmpty()) return;
      event.preventDefault();
      commandBus.execute(cmd);
      return;
    }
    if (event.key === 'Escape') {
      const s = useSelectionStore.getState();
      if (s.layerId === null && s.cells.size === 0 && s.marquee === null) return;
      event.preventDefault();
      s.clear();
    }
  };

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
