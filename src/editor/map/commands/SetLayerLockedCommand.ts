/**
 * SetLayerLockedCommand — toggle a Layer's locked flag.
 *
 * The caller passes both the previous and next value (see
 * {@link SetLayerVisibleCommand} for the same rationale).
 */

import type { Command } from '@core/command/Command';
import type { LayerId } from '@editor/map/schema/ids';

interface LayerOps {
  readonly setLayerLocked: (id: LayerId, locked: boolean) => void;
}

export class SetLayerLockedCommand implements Command {
  readonly kind = 'layer:locked';

  constructor(
    private readonly layerId: LayerId,
    private readonly prev: boolean,
    private readonly next: boolean,
  ) {}

  do(service: LayerOps): void {
    service.setLayerLocked(this.layerId, this.next);
  }

  undo(service: LayerOps): void {
    service.setLayerLocked(this.layerId, this.prev);
  }
}

export const toggleLayerLocked = (
  layerId: LayerId,
  currentLocked: boolean,
): SetLayerLockedCommand => new SetLayerLockedCommand(layerId, currentLocked, !currentLocked);
