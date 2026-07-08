/**
 * AddCollisionLayerCommand — prepend a new CollisionLayer to the Document.
 *
 * Mirrors {@link AddTileLayerCommand} and {@link AddObjectLayerCommand}.
 */

import type { Command } from '@core/command/Command';
import type { DocumentService } from '@core/document/DocumentService';
import type { CollisionLayer } from '@editor/map/schema/layer';

export class AddCollisionLayerCommand implements Command {
  readonly kind = 'layer:add-collision';

  constructor(
    private readonly layer: CollisionLayer,
    private readonly makeActive: boolean,
  ) {}

  do(service: DocumentService): void {
    service.addLayer(this.layer, this.makeActive);
  }

  undo(service: DocumentService): void {
    service.removeLayer(this.layer.id);
  }
}
