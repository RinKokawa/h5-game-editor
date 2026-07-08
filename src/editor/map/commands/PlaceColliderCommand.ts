/**
 * PlaceColliderCommand — add a Collider to the colliders table and
 * append its id to the given Collision layer's `colliderOrder`.
 *
 * v0.1 simplification: the id is always fresh (mint via
 * {@link placeCollider}). The Command assumes the collider does not
 * already exist and the id is not already in the layer's order.
 * Same pattern as {@link PlaceEntityCommand}.
 *
 * v0.1 supports box colliders only — circle / polygon land with
 * future steps. The Command takes a `BoxCollider` value; future
 * variants can widen the type.
 */

import { asColliderId } from '@editor/map/schema/ids';

import type { Command } from '@core/command/Command';
import type { DocumentService } from '@core/document/DocumentService';
import type { BoxCollider } from '@editor/map/schema/collider';
import type { LayerId } from '@editor/map/schema/ids';

export class PlaceColliderCommand implements Command {
  readonly kind = 'collider:place';

  constructor(
    private readonly layerId: LayerId,
    private readonly collider: BoxCollider,
  ) {}

  get placedCollider(): BoxCollider {
    return this.collider;
  }

  do(service: DocumentService): void {
    service.addCollider(this.collider);
    service.appendToCollisionLayer(this.layerId, this.collider.id);
  }

  undo(service: DocumentService): void {
    service.removeFromCollisionLayer(this.layerId, this.collider.id);
    service.removeCollider(this.collider.id);
  }
}

/** Convenience constructor — generates a fresh collider id. */
export const placeCollider = (
  layerId: LayerId,
  fields: Omit<BoxCollider, 'id'>,
): PlaceColliderCommand => {
  const id = asColliderId(`collider.${Math.random().toString(36).slice(2, 10)}`);
  return new PlaceColliderCommand(layerId, { id, ...fields });
};
