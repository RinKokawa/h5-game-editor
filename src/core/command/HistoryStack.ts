/**
 * HistoryStack — bounded undo/redo stacks.
 *
 * Pushes invalidate the redo stack (standard editor semantics).
 * Capacity is unbounded by default; the engine layer can wrap this to
 * enforce a depth limit later without changing call sites.
 */

import type { Command } from './Command';

export class HistoryStack {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  /** Record a freshly-executed command. Clears the redo stack. */
  push(cmd: Command): void {
    this.undoStack.push(cmd);
    this.redoStack = [];
  }

  /** Pop the most recent undo entry. Returns null if empty. */
  popUndo(): Command | null {
    const cmd = this.undoStack.pop();
    if (cmd) this.redoStack.push(cmd);
    return cmd ?? null;
  }

  /** Pop the most recent redo entry. Returns null if empty. */
  popRedo(): Command | null {
    const cmd = this.redoStack.pop();
    if (cmd) this.undoStack.push(cmd);
    return cmd ?? null;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Wipe both stacks. Used when loading a new Document. */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
