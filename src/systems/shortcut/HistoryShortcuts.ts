/**
 * HistoryShortcuts — keyboard shortcuts for undo / redo.
 *
 *   Ctrl/Cmd + Z      → undo
 *   Ctrl/Cmd + Y      → redo
 *   Ctrl/Cmd + Shift + Z → redo (alternative binding)
 *
 * Listens on `window` (not the canvas) so the shortcut works
 * regardless of which panel has focus, but ignores key events that
 * originate inside form controls.
 */

import { commandBus } from '@core/command/commandBusSingleton';

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

export class HistoryShortcuts {
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (isEditableTarget(event.target)) return;
    if (!event.ctrlKey && !event.metaKey) return;

    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) {
      event.preventDefault();
      commandBus.undo();
      return;
    }
    if ((key === 'z' && event.shiftKey) || (key === 'y' && !event.shiftKey)) {
      event.preventDefault();
      commandBus.redo();
    }
  };

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
