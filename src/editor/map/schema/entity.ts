/**
 * Entity.
 *
 * Entities are the placeable, identity-bearing objects on the map (NPCs,
 * spawn points, doors, pickups, ...). They live in {@link MapData.entities}
 * and are referenced by Object layers via {@link ObjectLayerData.entityOrder}.
 *
 * Position is in world pixels, not tile coordinates — entities are not
 * snapped to the tile grid by default.
 */

import type { Size, WorldPoint } from './geometry';
import type { EntityId } from './ids';
import type { PropertyBag } from './property';

export interface Entity {
  readonly id: EntityId;
  /**
   * Discriminator used by plugins to render a custom visual and supply
   * custom inspector fields. Built-in kinds: 'sprite', 'spawn-point'.
   */
  readonly type: string;
  readonly name: string;
  readonly position: WorldPoint;
  readonly size: Size;
  /** Rotation in radians (counter-clockwise). */
  readonly rotation: number;
  readonly properties: PropertyBag;
}
