/**
 * ToolShortcuts — keyboard shortcuts for switching the active tool.
 *
 *   V → Select
 *   H → Pan
 *   B → Brush
 *   E → Eraser
 *   O → Entity
 *   C → Collider
 *
 * Plain single-letter keys (no Ctrl/Alt/Shift). Listens on `window`
 * so the shortcut works regardless of which panel has focus, but
 * ignores key events that originate inside form controls — otherwise
 * typing "v" into the palette search would flip the tool mid-keystroke.
 *
 * Space+left already triggers a temporary pan via Camera + BrushTool
 * coordination; binding H to PanTool here gives a *persistent* pan
 * mode (toolbar Pan button highlights) that coexists with the
 * temporary one. The user picks whichever fits the moment.
 */

import { useToolStore } from '@state/toolStore';

import type { ToolId } from '@state/toolStore';

const SHORTCUTS: Readonly<Record<string, ToolId>> = {
  v: 'select',
  h: 'pan',
  b: 'brush',
  e: 'eraser',
  o: 'entity',
  c: 'collider',
};

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

export class ToolShortcuts {
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (isEditableTarget(event.target)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.shiftKey) return;
    if (event.repeat) return;

    // event.key reflects the produced character; event.code is
    // layout-independent. We use event.key so an AZERTY layout maps
    // to the right tool by the letter, matching what the toolbar
    // tooltip advertises.
    const key = event.key.toLowerCase();
    const target = SHORTCUTS[key];
    if (!target) return;

    event.preventDefault();
    useToolStore.getState().setActiveTool(target);
  };

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
