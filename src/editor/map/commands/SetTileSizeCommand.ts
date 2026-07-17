/**
 * SetTileSizeCommand — change the project-level tile cell size.
 *
 * Carries both `prev` and `next` at construction so `do`/`undo` are
 * symmetric without needing a Document lookup. Wire it through
 * `commandBus.execute` to land in the History stack.
 *
 * Step 21: tileSize is project data (CLAUDE.md §3 invariant 1) and
 * must NOT be mutated by view code directly. This Command is the
 * only legal mutation path.
 */

import type { Command } from '@core/command/Command';
import type { DocumentService } from '@core/document/DocumentService';

export class SetTileSizeCommand implements Command {
  readonly kind = 'document:tile-size';

  constructor(
    private readonly prev: number,
    private readonly next: number,
  ) {
    if (!Number.isFinite(next) || next <= 0) {
      throw new Error(`SetTileSizeCommand: tileSize must be > 0, got ${next}`);
    }
  }

  do(service: DocumentService): void {
    service.setTileSize(this.next);
  }

  undo(service: DocumentService): void {
    service.setTileSize(this.prev);
  }
}

/**
 * Convenience: build a Command that switches to the next tile cell
 * size. Caller passes the current value to avoid a Document read
 * here; Command inputs stay stateless.
 */
export const setTileSize = (prev: number, next: number): SetTileSizeCommand =>
  new SetTileSizeCommand(prev, next);
