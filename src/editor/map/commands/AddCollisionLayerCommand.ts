/**
 * AddCollisionLayerCommand — prepend a new CollisionLayer to the Document.
 *
 * Thin wrapper around {@link AddLayerCommand}. Mirrors
 * {@link AddObjectLayerCommand} / {@link AddTileLayerCommand}.
 */

import { AddLayerCommand } from './AddLayerCommand';

import type { CollisionLayer } from '@editor/map/schema/layer';

export class AddCollisionLayerCommand extends AddLayerCommand {
  constructor(layer: CollisionLayer, makeActive: boolean) {
    super('layer:add-collision', layer, makeActive);
  }
}