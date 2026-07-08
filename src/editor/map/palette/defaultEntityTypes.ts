/**
 * Default entity types (Step 13 placeholder).
 *
 * Each type describes how an entity of that kind should look before
 * real plugin renderers land. The PalettePanel for entities and the
 * {@link ObjectLayerView} both consult this table; v0.1 ships a small
 * set so users can place something visible.
 *
 * `defaultSize` is in world pixels. `defaultName` is the prefix used
 * when auto-naming a freshly-placed entity (the
 * {@link ObjectLayerView} doesn't care — naming is the Tool's job).
 */

import type { Size } from '@local-types/index';

export type EntityTypeId = 'sprite' | 'spawn-point' | 'door' | 'pickup';

export interface EntityTypeDef {
  readonly id: EntityTypeId;
  readonly labelKey: string;
  /** RGB tint for the placeholder rectangle. */
  readonly color: number;
  readonly defaultSize: Size;
  readonly defaultName: string;
}

export const DEFAULT_ENTITY_TYPES: ReadonlyArray<EntityTypeDef> = [
  {
    id: 'sprite',
    labelKey: 'entity.type.sprite',
    color: 0xb3382c,
    defaultSize: { width: 32, height: 32 },
    defaultName: 'Sprite',
  },
  {
    id: 'spawn-point',
    labelKey: 'entity.type.spawn-point',
    color: 0x6c8eb3,
    defaultSize: { width: 24, height: 24 },
    defaultName: 'Spawn',
  },
  {
    id: 'door',
    labelKey: 'entity.type.door',
    color: 0x82b366,
    defaultSize: { width: 32, height: 48 },
    defaultName: 'Door',
  },
  {
    id: 'pickup',
    labelKey: 'entity.type.pickup',
    color: 0xd6b656,
    defaultSize: { width: 16, height: 16 },
    defaultName: 'Pickup',
  },
];

const BY_ID = new Map<EntityTypeId, EntityTypeDef>(DEFAULT_ENTITY_TYPES.map((t) => [t.id, t]));

/** Look up a type by id. Falls back to the first known type. */
export const getEntityType = (id: string): EntityTypeDef => {
  const t = BY_ID.get(id as EntityTypeId);
  if (t) return t;
  const first = DEFAULT_ENTITY_TYPES[0];
  if (!first) {
    throw new Error('DEFAULT_ENTITY_TYPES is empty');
  }
  return first;
};

export const colorForEntityType = (id: string): number => getEntityType(id).color;

export const isKnownEntityType = (id: string): id is EntityTypeId => BY_ID.has(id as EntityTypeId);
