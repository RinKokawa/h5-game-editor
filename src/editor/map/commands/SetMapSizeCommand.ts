/**
 * SetMapSizeCommand — change the project-level map dimensions.
 *
 * Carries both `prev` and `next` at construction so `do`/`undo` are
 * symmetric without needing a Document lookup. Wire it through
 * `commandBus.execute` to land in the History stack.
 *
 * Step 21: mapSize is project data (CLAUDE.md §3 invariant 1) and
 * must NOT be mutated by view code directly. This Command is the
 * only legal mutation path.
 */

import type { Command } from '@core/command/Command';
import type { DocumentService } from '@core/document/DocumentService';

export class SetMapSizeCommand implements Command {
  readonly kind = 'document:map-size';

  constructor(
    private readonly prev: { readonly width: number; readonly height: number },
    private readonly next: { readonly width: number; readonly height: number },
  ) {
    if (!Number.isFinite(next.width) || next.width <= 0) {
      throw new Error(`SetMapSizeCommand: width must be > 0, got ${next.width}`);
    }
    if (!Number.isFinite(next.height) || next.height <= 0) {
      throw new Error(`SetMapSizeCommand: height must be > 0, got ${next.height}`);
    }
  }

  do(service: DocumentService): void {
    service.setMapSize(this.next);
  }

  undo(service: DocumentService): void {
    service.setMapSize(this.prev);
  }
}

/**
 * Convenience: build a Command that switches to the next map
 * dimensions. Caller passes the current value to avoid a Document
 * read here; Command inputs stay stateless.
 */
export const setMapSize = (
  prev: { readonly width: number; readonly height: number },
  next: { readonly width: number; readonly height: number },
): SetMapSizeCommand => new SetMapSizeCommand(prev, next);
