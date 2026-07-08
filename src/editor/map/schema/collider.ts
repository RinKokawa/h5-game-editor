/**
 * Colliders.
 *
 * Colliders describe the physical shape of the map for the runtime
 * collision system. They live in {@link MapData.colliders} and are
 * referenced by Collision layers via {@link CollisionLayerData.colliderOrder}.
 *
 * The schema supports box, circle, and polygon shapes via a discriminated
 * union. New shape types are added by extending {@link Collider}.
 */

import type { Size, WorldPoint } from './geometry';
import type { ColliderId } from './ids';
import type { PropertyBag } from './property';

export type ColliderKind = 'solid' | 'trigger' | 'platform';

interface ColliderBase {
  readonly id: ColliderId;
  readonly name: string;
  readonly kind: ColliderKind;
  readonly properties: PropertyBag;
}

export interface BoxCollider extends ColliderBase {
  readonly type: 'box';
  readonly position: WorldPoint;
  readonly size: Size;
  /** Rotation in radians (counter-clockwise). */
  readonly rotation: number;
}

export interface CircleCollider extends ColliderBase {
  readonly type: 'circle';
  readonly position: WorldPoint;
  readonly radius: number;
}

export interface PolygonCollider extends ColliderBase {
  readonly type: 'polygon';
  readonly position: WorldPoint;
  /** Local-space vertices, counter-clockwise. */
  readonly vertices: readonly WorldPoint[];
}

export type Collider = BoxCollider | CircleCollider | PolygonCollider;
