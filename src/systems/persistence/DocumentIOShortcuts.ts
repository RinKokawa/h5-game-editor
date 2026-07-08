/**
 * DocumentIOShortcuts — Ctrl/Cmd+S to save, Ctrl/Cmd+O to load.
 *
 * Save always overwrites the saved document. Load always replaces
 * the current document and clears the undo/redo stack (loading is
 * not itself undoable).
 *
 * Saves / loads are reported via console (and could be wired to a
 * toast / status-bar readout later).
 */

import { loadDocument, saveDocument } from './documentIO';

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

export class DocumentIOShortcuts {
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (isEditableTarget(event.target)) return;
    if (!event.ctrlKey && !event.metaKey) return;

    const key = event.key.toLowerCase();
    if (key === 's') {
      event.preventDefault();
      const outcome = saveDocument();
      if (outcome.ok) console.info(`[DocumentIO] saved (${outcome.bytes} bytes)`);
      else console.error('[DocumentIO] save failed:', outcome.error);
      return;
    }
    if (key === 'o') {
      event.preventDefault();
      const outcome = loadDocument();
      if (outcome.ok) console.info(`[DocumentIO] loaded (${outcome.layerCount} layers)`);
      else console.warn('[DocumentIO] load failed:', outcome.error);
    }
  };

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
