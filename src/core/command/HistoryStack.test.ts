/**
 * HistoryStack — unit tests.
 *
 * Push invalidates the redo stack; popUndo / popRedo move entries
 * between stacks; clear wipes both. Empty pops return null.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { HistoryStack } from './HistoryStack';

import type { Command } from './Command';

const noopCmd = (tag: string): Command => ({
  kind: tag,
  do: () => undefined,
  undo: () => undefined,
});

describe('HistoryStack', () => {
  let stack: HistoryStack;

  beforeEach(() => {
    stack = new HistoryStack();
  });

  it('starts empty', () => {
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(false);
  });

  it('push records an executed command and clears the redo stack', () => {
    stack.push(noopCmd('a'));
    stack.push(noopCmd('b'));
    expect(stack.canUndo()).toBe(true);
    expect(stack.canRedo()).toBe(false);
  });

  it('popUndo returns the most recent and moves it to redo', () => {
    stack.push(noopCmd('a'));
    stack.push(noopCmd('b'));
    const popped = stack.popUndo();
    expect(popped?.kind).toBe('b');
    expect(stack.canUndo()).toBe(true);
    expect(stack.canRedo()).toBe(true);
  });

  it('popUndo on empty stack returns null', () => {
    expect(stack.popUndo()).toBeNull();
  });

  it('popRedo returns the most recent redo entry and moves it back', () => {
    stack.push(noopCmd('a'));
    stack.popUndo();
    const popped = stack.popRedo();
    expect(popped?.kind).toBe('a');
    expect(stack.canUndo()).toBe(true);
    expect(stack.canRedo()).toBe(false);
  });

  it('popRedo on empty stack returns null', () => {
    expect(stack.popRedo()).toBeNull();
  });

  it('pushing invalidates the redo stack', () => {
    stack.push(noopCmd('a'));
    stack.popUndo();
    expect(stack.canRedo()).toBe(true);
    stack.push(noopCmd('b'));
    expect(stack.canRedo()).toBe(false);
  });

  it('clear wipes both stacks', () => {
    stack.push(noopCmd('a'));
    stack.push(noopCmd('b'));
    stack.popUndo();
    stack.clear();
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(false);
  });

  it('preserves insertion order in popUndo (LIFO)', () => {
    stack.push(noopCmd('a'));
    stack.push(noopCmd('b'));
    stack.push(noopCmd('c'));
    expect(stack.popUndo()?.kind).toBe('c');
    expect(stack.popUndo()?.kind).toBe('b');
    expect(stack.popUndo()?.kind).toBe('a');
    expect(stack.popUndo()).toBeNull();
  });
});