/**
 * SetLayerVisibleCommand — toggle a Layer's visibility flag.
 *
 * The caller passes both the previous and next value. This keeps
 * the Command stateless at construction time (no Document lookup)
 * and trivially reversible: `undo` just applies `prev`.
 */

import type { Command } from '@core/command/Command';
import type { LayerId } from '@editor/map/schema/ids';

interface LayerOps {
  readonly setLayerVisible: (id: LayerId, visible: boolean) => void;
}

export class SetLayerVisibleCommand implements Command {
  readonly kind = 'layer:visible';

  constructor(
    private readonly layerId: LayerId,
    private readonly prev: boolean,
    private readonly next: boolean,
  ) {}

  do(service: LayerOps): void {
    service.setLayerVisible(this.layerId, this.next);
  }

  undo(service: LayerOps): void {
    service.setLayerVisible(this.layerId, this.prev);
  }
}

/**
 * Convenience: build a Command that flips the current visibility.
 * The caller passes the current value to avoid a Document read here.
 */
export const toggleLayerVisible = (
  layerId: LayerId,
  currentVisible: boolean,
): SetLayerVisibleCommand => new SetLayerVisibleCommand(layerId, currentVisible, !currentVisible);
