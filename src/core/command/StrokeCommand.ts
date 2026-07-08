/**
 * StrokeCommand — a composite whose children have already been
 * `do()`'d by the tool that produced them.
 *
 * Used by BrushTool (and any other tool that needs paint-on-drag
 * semantics): each child Command is run live against the Document
 * during pointermove so the user sees tiles appear as they drag,
 * while the whole stroke is still a single Ctrl+Z undo entry.
 *
 * `do()` is a no-op: the children's effects are already in the
 * Document. `undo()` walks children in reverse and restores each
 * one's pre-stroke state (e.g. the empty cell or the previous tile
 * captured by `PlaceTileCommand.do`).
 *
 * If you need a composite of NOT-yet-executed Commands, use
 * {@link CompositeCommand} instead — that one calls each child's
 * `do()` itself.
 */

import type { Command } from './Command';
import type { DocumentService } from '@core/document/DocumentService';

export class StrokeCommand implements Command {
  readonly kind = 'composite';

  constructor(private readonly children: readonly Command[]) {
    if (children.length === 0) {
      throw new Error('StrokeCommand requires at least one child');
    }
  }

  do(_service: DocumentService): void {
    // Children were already executed live; re-running would corrupt
    // their captured `prev` state (e.g. PlaceTileCommand would read
    // back its own just-placed tile as the previous one).
  }

  undo(service: DocumentService): void {
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (child) child.undo(service);
    }
  }
}
