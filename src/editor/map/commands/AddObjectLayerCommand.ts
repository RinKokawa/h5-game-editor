/**
 * AddObjectLayerCommand — prepend a new ObjectLayer to the Document.
 *
 * Mirrors {@link AddTileLayerCommand}. The caller (LayerPanel) builds
 * the ObjectLayer via {@link createObjectLayer}; this command just
 * inserts and removes.
 */

import type { Command } from '@core/command/Command';
import type { DocumentService } from '@core/document/DocumentService';
import type { ObjectLayer } from '@editor/map/schema/layer';

export class AddObjectLayerCommand implements Command {
  readonly kind = 'layer:add-object';

  constructor(
    private readonly layer: ObjectLayer,
    private readonly makeActive: boolean,
  ) {}

  do(service: DocumentService): void {
    service.addLayer(this.layer, this.makeActive);
  }

  undo(service: DocumentService): void {
    service.removeLayer(this.layer.id);
  }
}
