/**
 * EraseTileCommand — remove a tile at (`layerId`, `coord`).
 *
 * Captures the previous entry (if any) so `undo` can restore it.
 * If the cell was already empty, `do` is a no-op (and `undo` will
 * also be a no-op since `prev` is `null`). This keeps erase calls
 * safe to fire on any cell.
 */

import type { Command } from '@core/command/Command';
import type { DocumentService } from '@core/document/DocumentService';
import type { TileLayerEntry } from '@core/document/DocumentService';
import type { TileCoord } from '@editor/map/schema/geometry';
import type { LayerId } from '@editor/map/schema/ids';

export class EraseTileCommand implements Command {
  readonly kind = 'tile:erase';

  private prev: TileLayerEntry | null = null;

  constructor(
    private readonly layerId: LayerId,
    private readonly coord: TileCoord,
  ) {}

  do(service: DocumentService): void {
    this.prev = service.getTile(this.layerId, this.coord);
    if (this.prev !== null) {
      service.setTile(this.layerId, this.coord, null);
    }
  }

  undo(service: DocumentService): void {
    if (this.prev !== null) {
      service.setTile(this.layerId, this.coord, this.prev);
    }
  }
}
