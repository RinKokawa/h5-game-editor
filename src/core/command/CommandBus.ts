/**
 * CommandBus — the single entry point for executing, undoing, and
 * redoing Commands.
 *
 * Every mutation of the Document passes through here. Tools build
 * Commands and call {@link execute}; shortcuts call {@link undo} /
 * {@link redo}; UI panels subscribe via {@link subscribe} to know
 * when the history state changes (e.g. to enable/disable an Undo
 * button).
 *
 * The Bus owns one {@link HistoryStack} and delegates execution to
 * a {@link DocumentService}. Wiring the Bus to a service is done at
 * construction time so call sites never reach into the Document
 * directly.
 */

import { EventEmitter } from '@core/event/EventEmitter';

import { HistoryStack } from './HistoryStack';

import type { Command } from './Command';
import type { DocumentService } from '@core/document/DocumentService';
import type { Unsubscribe } from '@core/event/EventEmitter';

export class CommandBus {
  private readonly history = new HistoryStack();
  private readonly emitter = new EventEmitter<void>();

  constructor(private readonly service: DocumentService) {}

  /**
   * Run `cmd.do` against the Document and push it onto the undo
   * stack (clearing the redo stack).
   */
  execute(cmd: Command): void {
    cmd.do(this.service);
    this.history.push(cmd);
    this.emitter.emit();
  }

  /** Pop the top of the undo stack and run its `undo`. */
  undo(): void {
    const cmd = this.history.popUndo();
    if (!cmd) return;
    cmd.undo(this.service);
    this.emitter.emit();
  }

  /** Pop the top of the redo stack and re-apply it. */
  redo(): void {
    const cmd = this.history.popRedo();
    if (!cmd) return;
    cmd.do(this.service);
    this.emitter.emit();
  }

  canUndo(): boolean {
    return this.history.canUndo();
  }

  canRedo(): boolean {
    return this.history.canRedo();
  }

  /** Subscribe to "history changed" notifications. */
  subscribe(listener: () => void): Unsubscribe {
    return this.emitter.subscribe(listener);
  }

  /** Wipe both stacks. Used when a new Document is loaded. */
  clearHistory(): void {
    this.history.clear();
    this.emitter.emit();
  }
}
