/**
 * Shortcut — declarative key bindings for the editor.
 *
 * Step 25 lifts the four copy-pasted `isEditableTarget` definitions
 * and the per-class `window.addEventListener('keydown', …)` dance
 * into a single registry. Each shortcut is a value, not a class —
 * a `Shortcut` declares a binding, an optional `when(event)` guard,
 * and a `run(event)` handler. The {@link ShortcutRegistry} attaches
 * ONE keydown listener that walks the registered shortcuts and
 * dispatches the first match.
 *
 * Bindings are tagged unions so the registry can match a
 * `KeyboardEvent` against the modifier shape without inspecting
 * booleans directly. `kind: 'key'` is a plain single letter with
 * no modifiers; `kind: 'ctrlKey'` accepts Ctrl or Meta on macOS;
 * `kind: 'ctrlShiftKey'` adds Shift.
 */

export type ShortcutBinding =
  | { readonly kind: 'key'; readonly key: string }
  | { readonly kind: 'ctrlKey'; readonly key: string }
  | { readonly kind: 'ctrlShiftKey'; readonly key: string };

export interface Shortcut {
  readonly id: string;
  readonly binding: ShortcutBinding;
  /** Optional i18n key for menus / tooltips (not consumed today). */
  readonly descriptionKey?: string;
  /**
   * Optional guard run BEFORE the binding is matched. Returning false
   * skips this shortcut and falls through to the next registered one.
   * The default guard already rejects `event.repeat` and any event
   * originating from an editable target (see `defaultShortcutGuard`).
   */
  readonly when?: (event: KeyboardEvent) => boolean;
  readonly run: (event: KeyboardEvent) => void;
}

/**
 * Test-friendly event matcher — given a binding and a
 * KeyboardEvent-like value, returns true if the binding matches.
 * Exposed for the ShortcutRegistry's dispatch loop and for tests.
 */
export const matchesBinding = (
  binding: ShortcutBinding,
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey'>,
): boolean => {
  const key = event.key.toLowerCase();
  if (key !== binding.key.toLowerCase()) return false;
  const cmd = event.ctrlKey || event.metaKey;
  switch (binding.kind) {
    case 'key':
      return !cmd && !event.shiftKey;
    case 'ctrlKey':
      return cmd && !event.shiftKey;
    case 'ctrlShiftKey':
      return cmd && event.shiftKey;
    default: {
      const _exhaustive: never = binding;
      return void _exhaustive, false;
    }
  }
};