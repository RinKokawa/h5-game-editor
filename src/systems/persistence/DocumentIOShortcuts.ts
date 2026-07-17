/**
 * DocumentIOShortcuts — Ctrl/Cmd+S to save, Ctrl/Cmd+O to load.
 *
 * Save always overwrites the saved document. Load always replaces
 * the current document and clears the undo/redo stack (loading is
 * not itself undoable).
 *
 * Step 25 lifts these into declarative {@link Shortcut} values so
 * they share the registry with the history / selection / tool
 * shortcuts. Outcomes are still reported via the console (a future
 * step can wire them to the StatusBar).
 */

import { loadDocument, saveDocument } from './documentIO';

import type { Shortcut } from '@systems/shortcut/Shortcut';

export const documentIOShortcuts: readonly Shortcut[] = [
  {
    id: 'documentio.save',
    binding: { kind: 'ctrlKey', key: 's' },
    run: (event: KeyboardEvent) => {
      event.preventDefault();
      void saveDocument().then((outcome) => {
        if (outcome.ok) console.info(`[DocumentIO] saved (${outcome.bytes} bytes)`);
        else console.error('[DocumentIO] save failed:', outcome.error);
      });
    },
  },
  {
    id: 'documentio.load',
    binding: { kind: 'ctrlKey', key: 'o' },
    run: (event: KeyboardEvent) => {
      event.preventDefault();
      void loadDocument().then((outcome) => {
        if (outcome.ok) console.info(`[DocumentIO] loaded (${outcome.layerCount} layers)`);
        else console.warn('[DocumentIO] load failed:', outcome.error);
      });
    },
  },
];