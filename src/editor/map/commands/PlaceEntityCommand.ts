/**
 * PlaceEntityCommand — add an Entity to the entities table and append
 * its id to the given Object layer's `entityOrder`.
 *
 * v0.1 simplification: the id is always fresh (mint via
 * {@link placeEntity}). The Command assumes the entity does not
 * already exist and the id is not already in the layer's order, so
 * `do` is unconditional and `undo` is unconditional removal.
 *
 * If a future caller re-uses an existing id, `do` will overwrite the
 * existing entity and `undo` will leave the new entity in place —
 * don't do that. New ids only.
 */

import { asEntityId } from '@editor/map/schema/ids';

import type { Command } from '@core/command/Command';
import type { DocumentService } from '@core/document/DocumentService';
import type { Entity } from '@editor/map/schema/entity';
import type { LayerId } from '@editor/map/schema/ids';

export class PlaceEntityCommand implements Command {
  readonly kind = 'entity:place';

  constructor(
    private readonly layerId: LayerId,
    private readonly entity: Entity,
  ) {}

  /** The entity this command will place. Exposed for tests / inspectors. */
  get placedEntity(): Entity {
    return this.entity;
  }

  do(service: DocumentService): void {
    service.addEntity(this.entity);
    service.appendToObjectLayer(this.layerId, this.entity.id);
  }

  undo(service: DocumentService): void {
    service.removeFromObjectLayer(this.layerId, this.entity.id);
    service.removeEntity(this.entity.id);
  }
}

/** Convenience constructor — generates a fresh entity id for the caller. */
export const placeEntity = (layerId: LayerId, fields: Omit<Entity, 'id'>): PlaceEntityCommand => {
  const id = asEntityId(`entity.${Math.random().toString(36).slice(2, 10)}`);
  return new PlaceEntityCommand(layerId, { id, ...fields });
};
