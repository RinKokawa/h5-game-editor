/**
 * ShortcutRegistry — single keydown dispatcher for the editor.
 *
 * Step 25. One `keydown` listener is attached to `window`. The
 * listener walks the registered {@link Shortcut} array in
 * registration order, finds the first whose binding matches and
 * whose `when(event)` returns true, and calls its `run(event)`.
 *
 * Duplicate `id` values throw at registration so a refactor can't
 * silently shadow a built-in shortcut. `repeat` events are dropped
 * by the default guard so holding a letter doesn't fire a tool
 * change dozens of times.
 *
 * The registry is intentionally not React-aware — it doesn't
 * subscribe to any store. Shortcuts that need reactive state (the
 * Delete shortcut checks `selection.kind`) read it from Zustand
 * synchronously inside their `run` callback. This keeps the
 * registry purely imperative and testable with fake events.
 */

import { isEditableTarget } from '@utils/index';

import { matchesBinding } from './Shortcut';

import type { Shortcut } from './Shortcut';

export class ShortcutRegistry {
  private readonly shortcuts: Shortcut[] = [];
  private readonly ids = new Set<string>();
  private listener: ((event: KeyboardEvent) => void) | null = null;

  register(shortcut: Shortcut): void {
    if (this.ids.has(shortcut.id)) {
      throw new Error(`ShortcutRegistry: duplicate shortcut id "${shortcut.id}"`);
    }
    this.ids.add(shortcut.id);
    this.shortcuts.push(shortcut);
  }

  registerAll(shortcuts: readonly Shortcut[]): void {
    for (const s of shortcuts) this.register(s);
  }

  list(): readonly Shortcut[] {
    return this.shortcuts;
  }

  attach(): void {
    if (this.listener !== null) return;
    this.listener = (event: KeyboardEvent): void => this.dispatch(event);
    window.addEventListener('keydown', this.listener);
  }

  detach(): void {
    if (this.listener === null) return;
    window.removeEventListener('keydown', this.listener);
    this.listener = null;
  }

  /**
   * Dispatch `event` to the first matching shortcut. Exposed for
   * tests — production code attaches the listener via `attach()`
   * and lets browser events drive the loop.
   */
  dispatch(event: KeyboardEvent): void {
    if (event.repeat) return;
    if (isEditableTarget(event.target)) return;
    for (const shortcut of this.shortcuts) {
      if (!matchesBinding(shortcut.binding, event)) continue;
      if (shortcut.when && !shortcut.when(event)) continue;
      shortcut.run(event);
      return;
    }
  }
}