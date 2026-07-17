/**
 * PlaceColliderCommand — add a Collider to the colliders table and
 * append its id to the given Collision layer's `colliderOrder`.
 *
 * Thin wrapper around {@link PlacePlacedObjectCommand}. The id is
 * always fresh (mint via {@link placeCollider}). Same shape as
 * {@link PlaceEntityCommand}.
 *
 * v0.1 supports box colliders only — circle / polygon land with
 * future steps. The Command takes a `BoxCollider` value; future
 * variants can widen the type.
 */

import { asColliderId } from '@editor/map/schema/ids';

import { PlacePlacedObjectCommand } from './PlacePlacedObjectCommand';

import type { DocumentService } from '@core/document/DocumentService';
import type { BoxCollider } from '@editor/map/schema/collider';
import type { ColliderId, LayerId } from '@editor/map/schema/ids';

const colliderOps = {
  add: (service: DocumentService, c: BoxCollider): void => {
    service.addCollider(c);
  },
  appendToLayer: (service: DocumentService, layerId: LayerId, id: ColliderId): void => {
    service.appendToCollisionLayer(layerId, id);
  },
  removeFromLayer: (service: DocumentService, layerId: LayerId, id: ColliderId): void => {
    service.removeFromCollisionLayer(layerId, id);
  },
  remove: (service: DocumentService, id: ColliderId): void => {
    service.removeCollider(id);
  },
};

export class PlaceColliderCommand extends PlacePlacedObjectCommand<LayerId, ColliderId, BoxCollider> {
  constructor(layerId: LayerId, collider: BoxCollider) {
    super('collider:place', layerId, collider, colliderOps);
  }

  get placedCollider(): BoxCollider {
    return this.placed;
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