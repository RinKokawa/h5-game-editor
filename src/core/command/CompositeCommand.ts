/**
 * CompositeCommand — bundle several Commands into a single undo unit.
 *
 * Used by BrushTool so that one drag-stroke (which may place dozens of
 * tiles) is a single Ctrl+Z, not dozens.
 *
 * `do` runs children in array order; `undo` runs them in reverse so a
 * partially-applied set leaves the Document in a consistent state.
 */

import type { Command } from './Command';
import type { DocumentService } from '@core/document/DocumentService';

export class CompositeCommand implements Command {
  readonly kind = 'composite';

  constructor(private readonly commands: readonly Command[]) {
    if (commands.length === 0) {
      throw new Error('CompositeCommand requires at least one child');
    }
  }

  do(service: DocumentService): void {
    for (const cmd of this.commands) {
      cmd.do(service);
    }
  }

  undo(service: DocumentService): void {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      const cmd = this.commands[i];
      if (cmd) cmd.undo(service);
    }
  }
}
