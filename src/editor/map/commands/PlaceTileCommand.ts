/**
 * PlaceTileCommand — set a tile at (`layerId`, `coord`).
 *
 * Captures the previous entry (if any) via `DocumentService.getTile`
 * during `do` so `undo` can restore it. If the cell was empty,
 * undo removes the newly-placed entry.
 */

import type { Command } from '@core/command/Command';
import type { DocumentService } from '@core/document/DocumentService';
import type { TileLayerEntry } from '@core/document/DocumentService';
import type { TileCoord } from '@editor/map/schema/geometry';
import type { LayerId, TileId, TilesetId } from '@editor/map/schema/ids';

export class PlaceTileCommand implements Command {
  readonly kind = 'tile:place';

  private prev: TileLayerEntry | null = null;

  constructor(
    private readonly layerId: LayerId,
    private readonly coord: TileCoord,
    private readonly entry: TileLayerEntry,
  ) {}

  do(service: DocumentService): void {
    this.prev = service.getTile(this.layerId, this.coord);
    service.setTile(this.layerId, this.coord, this.entry);
  }

  undo(service: DocumentService): void {
    service.setTile(this.layerId, this.coord, this.prev);
  }
}

/** Convenience constructor for the common case of "place a tile id". */
export const placeTile = (
  layerId: LayerId,
  coord: TileCoord,
  tilesetId: TilesetId,
  tileId: TileId,
): PlaceTileCommand =>
  new PlaceTileCommand(layerId, coord, {
    tilesetId,
    tileId,
    rotation: 0,
    flipX: false,
    flipY: false,
  });
