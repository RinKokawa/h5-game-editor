/**
 * PlacePlacedObjectCommand — shared base for placing an entity or
 * collider onto its layer.
 *
 * Concrete subclasses (PlaceEntityCommand / PlaceColliderCommand)
 * supply the right pair of `addX` / `appendToXLayer` /
 * `removeFromXLayer` / `removeX` primitives. The base class never
 * names Entity or Collider directly — it's generic over the
 * `{ id }` payload and the bundle of four `(service) => void`
 * operations that the subclass binds to the right primitive.
 *
 * The two id slots (layerId vs payload.id) live in different brand
 * namespaces (LayerId vs EntityId/ColliderId), so the ops are typed
 * with three type parameters rather than one. Most callers write
 * the ops inline once and pass them through.
 *
 * v0.1 simplification: the id is always fresh (minted by the
 * `placeEntity` / `placeCollider` convenience constructors). The
 * Command assumes the entity / collider does not already exist and
 * the id is not already in the layer's order, so `do` is
 * unconditional and `undo` is unconditional removal.
 */

import type { Command } from '@core/command/Command';
import type { DocumentService } from '@core/document/DocumentService';

interface PlacedOps<TLayerId extends string, TItemId extends string, TPayload> {
  readonly add: (service: DocumentService, payload: TPayload) => void;
  readonly appendToLayer: (service: DocumentService, layerId: TLayerId, id: TItemId) => void;
  readonly removeFromLayer: (service: DocumentService, layerId: TLayerId, id: TItemId) => void;
  readonly remove: (service: DocumentService, id: TItemId) => void;
}

export class PlacePlacedObjectCommand<
  TLayerId extends string,
  TItemId extends string,
  TPayload extends { id: TItemId },
> implements Command
{
  readonly kind: string;

  constructor(
    kind: string,
    private readonly layerId: TLayerId,
    private readonly payload: TPayload,
    private readonly ops: PlacedOps<TLayerId, TItemId, TPayload>,
  ) {
    this.kind = kind;
  }

  get placed(): TPayload {
    return this.payload;
  }

  do(service: DocumentService): void {
    this.ops.add(service, this.payload);
    this.ops.appendToLayer(service, this.layerId, this.payload.id);
  }

  undo(service: DocumentService): void {
    this.ops.removeFromLayer(service, this.layerId, this.payload.id);
    this.ops.remove(service, this.payload.id);
  }
}