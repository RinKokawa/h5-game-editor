/**
 * RemoveLayerCommand — delete a Layer from the Document.
 *
 * Captures the removed Layer so `undo` can reinsert it. The store's
 * `removeLayer` already refuses to drop the last layer — that guard
 * travels with the Document and is not duplicated here.
 */

import type { Command } from '@core/command/Command';
import type { DocumentService } from '@core/document/DocumentService';
import type { LayerId } from '@editor/map/schema/ids';
import type { Layer } from '@editor/map/schema/layer';

export class RemoveLayerCommand implements Command {
  readonly kind = 'layer:remove';

  private removed: Layer | null = null;
  private wasActive = false;

  constructor(
    private readonly layerId: LayerId,
    private readonly activeLayerId: LayerId,
  ) {}

  do(service: DocumentService): void {
    this.wasActive = this.layerId === this.activeLayerId;
    this.removed = service.removeLayer(this.layerId);
  }

  undo(service: DocumentService): void {
    if (!this.removed) return;
    // `addLayer` always prepends (index 0); that matches the panel
    // UX where the just-deleted active layer is typically the topmost.
    service.addLayer(this.removed, this.wasActive);
  }
}
