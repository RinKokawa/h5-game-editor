/**
 * AddLayerCommand — shared base for adding a Layer to the Document.
 *
 * `do` calls `service.addLayer(layer, makeActive)`; `undo` calls
 * `service.removeLayer(layer.id)`. The three concrete wrappers
 * (AddTileLayerCommand / AddObjectLayerCommand /
 * AddCollisionLayerCommand) only differ in the `kind` string —
 * a thinner surface than repeating the same shape three times.
 *
 * The base class is intentionally non-exported from the index:
 * callers should pick the typed wrapper that matches the layer
 * kind they're working with. The CommandBus happily accepts the
 * concrete subclasses because they extend this implementation.
 */

import type { Command } from '@core/command/Command';
import type { DocumentService } from '@core/document/DocumentService';
import type { Layer } from '@editor/map/schema/layer';

export class AddLayerCommand implements Command {
  constructor(
    public readonly kind: string,
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