/**
 * ToolShortcuts — keyboard shortcuts for switching the active tool.
 *
 *   V → Select
 *   H → Pan
 *   B → Brush
 *   E → Eraser
 *   O → Entity
 *   C → Collider
 *   R → Rect
 *
 * Plain single-letter keys (no Ctrl/Alt/Shift). The shortcut works
 * regardless of which panel has focus, but the registry's default
 * guard rejects events from editable targets — otherwise typing "v"
 * into the palette search would flip the tool mid-keystroke.
 *
 * Step 25: bindings are declarative; the per-tool `when()` is a
 * no-op since the registry already drops `repeat` events.
 */

import { useToolStore } from '@state/toolStore';

import type { Shortcut } from './Shortcut';
import type { ToolId } from '@state/toolStore';

const TOOL_BINDINGS: ReadonlyArray<readonly [string, ToolId]> = [
  ['v', 'select'],
  ['h', 'pan'],
  ['b', 'brush'],
  ['e', 'eraser'],
  ['o', 'entity'],
  ['c', 'collider'],
  ['r', 'rect'],
];

export const toolShortcuts: readonly Shortcut[] = TOOL_BINDINGS.map(([key, id]) => ({
  id: `tool.${id}`,
  binding: { kind: 'key', key },
  run: () => {
    useToolStore.getState().setActiveTool(id);
  },
}));