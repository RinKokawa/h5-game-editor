/**
 * AddTileLayerCommand — prepend a new TileLayer to the Document.
 *
 * `do` adds it (optionally making it active); `undo` removes it.
 * The caller is responsible for constructing the Layer value — the
 * Command just inserts and removes.
 */

import type { Command } from '@core/command/Command';
import type { DocumentService } from '@core/document/DocumentService';
import type { Layer } from '@editor/map/schema/layer';

export class AddTileLayerCommand implements Command {
  readonly kind = 'layer:add';

  constructor(
    private readonly layer: Layer,
    private readonly makeActive: boolean,
  ) {}

  do(service: DocumentService): void {
    service.addLayer(this.layer, this.makeActive);
  }

  undo(service: DocumentService): void {
    service.removeLayer(this.layer.id);
  }
}
