/**
 * MoveLayerCommand — shift a Layer one position up or down in the
 * layer stack.
 *
 * `layers[0]` is the visual top. "up" means toward index 0.
 */

import type { Command } from '@core/command/Command';
import type { DocumentService } from '@core/document/DocumentService';
import type { LayerId } from '@editor/map/schema/ids';

export type MoveDirection = 'up' | 'down';

export class MoveLayerCommand implements Command {
  readonly kind = 'layer:move';

  private fromIndex = -1;

  constructor(
    private readonly layerId: LayerId,
    private readonly direction: MoveDirection,
  ) {}

  do(service: DocumentService): void {
    const current = service.findLayerIndex(this.layerId);
    if (current === -1) return;
    const next = this.direction === 'up' ? current - 1 : current + 1;
    if (next < 0) return;
    this.fromIndex = current;
    service.reorderLayer(this.layerId, next);
  }

  undo(service: DocumentService): void {
    if (this.fromIndex === -1) return;
    service.reorderLayer(this.layerId, this.fromIndex);
  }
}
