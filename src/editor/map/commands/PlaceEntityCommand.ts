/**
 * PlaceEntityCommand — add an Entity to the entities table and append
 * its id to the given Object layer's `entityOrder`.
 *
 * Thin wrapper around {@link PlacePlacedObjectCommand}. The id is
 * always fresh (mint via {@link placeEntity}). The Command assumes
 * the entity does not already exist and the id is not already in the
 * layer's order, so `do` is unconditional and `undo` is unconditional
 * removal.
 *
 * If a future caller re-uses an existing id, `do` will overwrite the
 * existing entity and `undo` will leave the new entity in place —
 * don't do that. New ids only.
 */

import { asEntityId } from '@editor/map/schema/ids';

import { PlacePlacedObjectCommand } from './PlacePlacedObjectCommand';

import type { DocumentService } from '@core/document/DocumentService';
import type { Entity } from '@editor/map/schema/entity';
import type { EntityId, LayerId } from '@editor/map/schema/ids';

const entityOps = {
  add: (service: DocumentService, e: Entity): void => {
    service.addEntity(e);
  },
  appendToLayer: (service: DocumentService, layerId: LayerId, id: EntityId): void => {
    service.appendToObjectLayer(layerId, id);
  },
  removeFromLayer: (service: DocumentService, layerId: LayerId, id: EntityId): void => {
    service.removeFromObjectLayer(layerId, id);
  },
  remove: (service: DocumentService, id: EntityId): void => {
    service.removeEntity(id);
  },
};

export class PlaceEntityCommand extends PlacePlacedObjectCommand<LayerId, EntityId, Entity> {
  constructor(layerId: LayerId, entity: Entity) {
    super('entity:place', layerId, entity, entityOps);
  }

  /** The entity this command will place. Exposed for tests / inspectors. */
  get placedEntity(): Entity {
    return this.placed;
  }
}

/** Convenience constructor — generates a fresh entity id for the caller. */
export const placeEntity = (layerId: LayerId, fields: Omit<Entity, 'id'>): PlaceEntityCommand => {
  const id = asEntityId(`entity.${Math.random().toString(36).slice(2, 10)}`);
  return new PlaceEntityCommand(layerId, { id, ...fields });
};