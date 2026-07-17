/**
 * ShortcutRegistry — unit tests.
 *
 * Covers: binding matching across all three modifier shapes,
 * dispatch order (first match wins), `when()` guard,
 * `event.repeat` suppression, editable-target suppression, and
 * duplicate-id rejection. Drives `dispatch(event)` directly so the
 * tests don't need to fire real keydown events.
 */

import { describe, expect, it, vi } from 'vitest';

import { ShortcutRegistry, matchesBinding } from '@systems/shortcut/index';

import type { Shortcut } from './Shortcut';

const fire = (overrides: Partial<KeyboardEvent>): KeyboardEvent =>
  ({
    key: '',
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    repeat: false,
    preventDefault: () => undefined,
    target: null,
    ...overrides,
  }) as KeyboardEvent;

describe('matchesBinding', () => {
  it("matches a plain 'key' binding exactly", () => {
    expect(matchesBinding({ kind: 'key', key: 'v' }, fire({ key: 'v' }))).toBe(true);
    expect(matchesBinding({ kind: 'key', key: 'v' }, fire({ key: 'V' }))).toBe(true);
    expect(matchesBinding({ kind: 'key', key: 'v' }, fire({ key: 'v', ctrlKey: true }))).toBe(false);
    expect(matchesBinding({ kind: 'key', key: 'v' }, fire({ key: 'v', shiftKey: true }))).toBe(false);
  });

  it("matches 'ctrlKey' against either Ctrl or Meta", () => {
    expect(matchesBinding({ kind: 'ctrlKey', key: 's' }, fire({ key: 's', ctrlKey: true }))).toBe(true);
    expect(matchesBinding({ kind: 'ctrlKey', key: 's' }, fire({ key: 's', metaKey: true }))).toBe(true);
    expect(matchesBinding({ kind: 'ctrlKey', key: 's' }, fire({ key: 's' }))).toBe(false);
    expect(matchesBinding({ kind: 'ctrlKey', key: 's' }, fire({ key: 's', ctrlKey: true, shiftKey: true }))).toBe(false);
  });

  it("matches 'ctrlShiftKey' against Ctrl/Meta + Shift", () => {
    expect(matchesBinding({ kind: 'ctrlShiftKey', key: 'z' }, fire({ key: 'z', ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(matchesBinding({ kind: 'ctrlShiftKey', key: 'z' }, fire({ key: 'z', metaKey: true, shiftKey: true }))).toBe(true);
    expect(matchesBinding({ kind: 'ctrlShiftKey', key: 'z' }, fire({ key: 'z', ctrlKey: true }))).toBe(false);
  });
});

describe('ShortcutRegistry.dispatch', () => {
  const makeShortcut = (overrides: Partial<Shortcut>): Shortcut => ({
    id: 'test',
    binding: { kind: 'key', key: 'a' },
    run: () => undefined,
    ...overrides,
  });

  it('dispatches to the first matching shortcut', () => {
    const reg = new ShortcutRegistry();
    const a = vi.fn();
    const b = vi.fn();
    reg.register(makeShortcut({ id: 'a', run: a }));
    reg.register(makeShortcut({ id: 'b', binding: { kind: 'key', key: 'b' }, run: b }));
    reg.dispatch(fire({ key: 'a' }));
    reg.dispatch(fire({ key: 'b' }));
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('fires only the first match (first-match-wins)', () => {
    const reg = new ShortcutRegistry();
    const a = vi.fn();
    const b = vi.fn();
    reg.register(makeShortcut({ id: 'a', run: a }));
    reg.register(makeShortcut({ id: 'b', run: b }));
    reg.dispatch(fire({ key: 'a' }));
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
  });

  it('honors when() returning false', () => {
    const reg = new ShortcutRegistry();
    const a = vi.fn();
    reg.register(
      makeShortcut({
        id: 'a',
        run: a,
        when: () => false,
      }),
    );
    reg.dispatch(fire({ key: 'a' }));
    expect(a).not.toHaveBeenCalled();
  });

  it('honors when() returning true (default behavior)', () => {
    const reg = new ShortcutRegistry();
    const a = vi.fn();
    reg.register(
      makeShortcut({
        id: 'a',
        run: a,
        when: () => true,
      }),
    );
    reg.dispatch(fire({ key: 'a' }));
    expect(a).toHaveBeenCalledTimes(1);
  });

  it('drops events with repeat=true', () => {
    const reg = new ShortcutRegistry();
    const a = vi.fn();
    reg.register(makeShortcut({ id: 'a', run: a }));
    reg.dispatch(fire({ key: 'a', repeat: true }));
    expect(a).not.toHaveBeenCalled();
  });

  it('drops events whose target is an editable element', () => {
    const reg = new ShortcutRegistry();
    const a = vi.fn();
    reg.register(makeShortcut({ id: 'a', run: a }));
    const input = document.createElement('input');
    document.body.appendChild(input);
    try {
      reg.dispatch(fire({ key: 'a', target: input }));
      expect(a).not.toHaveBeenCalled();
    } finally {
      input.remove();
    }
  });

  it('passes the original KeyboardEvent to run()', () => {
    const reg = new ShortcutRegistry();
    let received: KeyboardEvent | null = null;
    reg.register(makeShortcut({ id: 'a', run: (e) => (received = e) }));
    const ev = fire({ key: 'a' });
    reg.dispatch(ev);
    expect(received).toBe(ev);
  });

  it('throws on duplicate shortcut id', () => {
    const reg = new ShortcutRegistry();
    reg.register(makeShortcut({ id: 'a' }));
    expect(() => reg.register(makeShortcut({ id: 'a' }))).toThrow(/duplicate shortcut id/);
  });

  it('registerAll() preserves insertion order', () => {
    const reg = new ShortcutRegistry();
    reg.registerAll([
      makeShortcut({ id: 'a', binding: { kind: 'key', key: 'a' } }),
      makeShortcut({ id: 'b', binding: { kind: 'key', key: 'b' } }),
    ]);
    expect(reg.list().map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('does not double-attach a listener', () => {
    const reg = new ShortcutRegistry();
    reg.attach();
    reg.attach();
    reg.dispatch(fire({ key: 'a' }));
    // No assertion beyond "doesn't throw"; the implementation must
    // short-circuit the second attach. Behaviorally, only one
    // listener fires for one dispatch.
    reg.detach();
  });
});