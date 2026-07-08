/**
 * RemoveColliderCommand — delete a Collider from the Document.
 *
 * Captures the removed Collider and the ids of every Collision layer
 * whose `colliderOrder` referenced it. `undo` re-inserts the Collider
 * and re-appends the id to each layer.
 *
 * `service.removeCollider` already cleans up layer references; we
 * capture them in `do` so `undo` is exact.
 */

import type { Command } from '@core/command/Command';
import type { DocumentService } from '@core/document/DocumentService';
import type { Collider } from '@editor/map/schema/collider';
import type { ColliderId, LayerId } from '@editor/map/schema/ids';

interface CapturedRef {
  readonly layerId: LayerId;
  readonly index: number;
}

export class RemoveColliderCommand implements Command {
  readonly kind = 'collider:remove';

  private removed: Collider | null = null;
  private refs: CapturedRef[] = [];

  constructor(private readonly colliderId: ColliderId) {}

  do(service: DocumentService): void {
    const snapshot = service.snapshot();
    this.removed = snapshot.colliders.get(this.colliderId) ?? null;
    if (!this.removed) return;

    this.refs = [];
    for (const layer of snapshot.layers) {
      if (layer.type !== 'collision') continue;
      const idx = layer.data.colliderOrder.indexOf(this.colliderId);
      if (idx === -1) continue;
      this.refs.push({ layerId: layer.id, index: idx });
    }

    service.removeCollider(this.colliderId);
  }

  undo(service: DocumentService): void {
    if (!this.removed) return;
    service.addCollider(this.removed);
    for (const ref of this.refs) {
      service.appendToCollisionLayer(ref.layerId, this.colliderId);
    }
  }
}
