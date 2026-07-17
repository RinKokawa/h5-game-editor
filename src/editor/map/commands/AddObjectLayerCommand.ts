/**
 * AddObjectLayerCommand — prepend a new ObjectLayer to the Document.
 *
 * Thin wrapper around {@link AddLayerCommand}. Mirrors
 * {@link AddTileLayerCommand}; the caller (LayerPanel) builds the
 * ObjectLayer via {@link createObjectLayer}.
 */

import { AddLayerCommand } from './AddLayerCommand';

import type { ObjectLayer } from '@editor/map/schema/layer';

export class AddObjectLayerCommand extends AddLayerCommand {
  constructor(layer: ObjectLayer, makeActive: boolean) {
    super('layer:add-object', layer, makeActive);
  }
}