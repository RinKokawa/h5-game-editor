/**
 * AddTileLayerCommand — prepend a new TileLayer to the Document.
 *
 * Thin wrapper around {@link AddLayerCommand} that fixes the
 * `kind` discriminator. `do` adds it (optionally making it active);
 * `undo` removes it. The caller is responsible for constructing
 * the Layer value — the Command just inserts and removes.
 */

import { AddLayerCommand } from './AddLayerCommand';

import type { Layer } from '@editor/map/schema/layer';

export class AddTileLayerCommand extends AddLayerCommand {
  constructor(layer: Layer, makeActive: boolean) {
    super('layer:add', layer, makeActive);
  }
}