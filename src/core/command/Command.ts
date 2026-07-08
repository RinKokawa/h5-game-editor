/**
 * Command — reversible Document mutation.
 *
 * Every Command carries enough state to both `do` and `undo` itself
 * through a {@link DocumentService}. The `kind` tag is for debugging
 * and grouping; coalescing across commands of the same kind is the
 * CompositeCommand's job.
 */

import type { DocumentService } from '@core/document/DocumentService';

export interface Command {
  /** Stable identifier for debugging / coalescing hints. */
  readonly kind: string;

  /** Apply this command's effect. Idempotency is not required. */
  do(service: DocumentService): void;

  /** Reverse this command's effect. Must restore the pre-`do` state. */
  undo(service: DocumentService): void;
}
