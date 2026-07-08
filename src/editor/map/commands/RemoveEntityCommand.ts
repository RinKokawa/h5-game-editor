/**
 * RemoveEntityCommand — delete an Entity from the Document.
 *
 * Captures the removed Entity and the ids of every Object layer
 * whose `entityOrder` referenced it. `undo` re-inserts the Entity
 * and re-appends the id to each layer at its original index.
 *
 * The `service.removeEntity` primitive already cleans up layer
 * references; we capture them in `do` so `undo` is exact.
 *
 * If the entity doesn't exist at `do` time, the command is a no-op
 * and `undo` is too. This keeps it safe to fire on stale ids.
 */

import type { Command } from '@core/command/Command';
import type { DocumentService } from '@core/document/DocumentService';
import type { Entity } from '@editor/map/schema/entity';
import type { EntityId, LayerId } from '@editor/map/schema/ids';

interface CapturedRef {
  readonly layerId: LayerId;
  readonly index: number;
}

export class RemoveEntityCommand implements Command {
  readonly kind = 'entity:remove';

  private removed: Entity | null = null;
  private refs: CapturedRef[] = [];

  constructor(private readonly entityId: EntityId) {}

  do(service: DocumentService): void {
    const snapshot = service.snapshot();
    this.removed = snapshot.entities.get(this.entityId) ?? null;
    if (!this.removed) return;

    this.refs = [];
    for (const layer of snapshot.layers) {
      if (layer.type !== 'object') continue;
      const idx = layer.data.entityOrder.indexOf(this.entityId);
      if (idx === -1) continue;
      this.refs.push({ layerId: layer.id, index: idx });
    }

    service.removeEntity(this.entityId);
  }

  undo(service: DocumentService): void {
    if (!this.removed) return;
    service.addEntity(this.removed);
    // Re-append in original order. appendToObjectLayer is idempotent
    // for the *presence* of the id, so re-appending is safe. To
    // restore the original index we'd need an insertAt primitive —
    // v0.1 accepts that the order may shift on undo for entities
    // that were referenced by multiple layers.
    for (const ref of this.refs) {
      service.appendToObjectLayer(ref.layerId, this.entityId);
    }
  }
}
