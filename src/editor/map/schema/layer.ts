/**
 * Layer schema.
 *
 * A map is composed of ordered layers. Each layer has a discriminator
 * {@link Layer.type} which determines what data shape it carries.
 *
 *   'tile'       → sparse grid of placed tiles.
 *   'object'     → ordered list of entity references.
 *   'collision'  → ordered list of collider references.
 *
 * Adding a new layer kind is an additive change: existing layers and
 * serialization paths are untouched.
 */

import type { ColliderId, EntityId, LayerId } from './ids';
import type { PropertyBag } from './property';
import type { TileLayerData } from './tile';

export type LayerType = 'tile' | 'object' | 'collision';

interface LayerBase {
  readonly id: LayerId;
  readonly name: string;
  readonly visible: boolean;
  readonly locked: boolean;
  /** 0..1. */
  readonly opacity: number;
  readonly properties: PropertyBag;
}

export interface TileLayer extends LayerBase {
  readonly type: 'tile';
  readonly data: TileLayerData;
}

export interface ObjectLayerData {
  /** Order is significant (z-stacking within the layer). */
  readonly entityOrder: readonly EntityId[];
}

export interface ObjectLayer extends LayerBase {
  readonly type: 'object';
  readonly data: ObjectLayerData;
}

export interface CollisionLayerData {
  /** Order is significant (priority / z-stacking). */
  readonly colliderOrder: readonly ColliderId[];
}

export interface CollisionLayer extends LayerBase {
  readonly type: 'collision';
  readonly data: CollisionLayerData;
}

export type Layer = TileLayer | ObjectLayer | CollisionLayer;
