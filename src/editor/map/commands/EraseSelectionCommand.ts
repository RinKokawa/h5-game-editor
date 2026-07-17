/**
 * EraseSelectionCommand — wipe every tile in the current selection.
 *
 * At `do` time: snapshot each selected cell's entry, dispatch an
 * erase for each, then clear the selection.
 *
 * At `undo` time: restore each captured entry and re-select the
 * same cells so the user can see what came back.
 *
 * If the selection is empty (or non-tile) at `do`, `isEmpty()`
 * returns true and callers should skip dispatching. Entity / collider
 * selection erase paths live in `RemoveEntityCommand` /
 * `RemoveColliderCommand` — this Command is tile-only on purpose so
 * the SelectionShortcuts can pick the right Command by `kind`.
 */

import { decodeTileCoord } from '@editor/map/schema/tile';
import { useSelectionStore } from '@state/selectionStore';

import { EraseTileCommand } from './EraseTileCommand';

import type { Command } from '@core/command/Command';
import type { DocumentService } from '@core/document/DocumentService';
import type { TileLayerEntry } from '@core/document/DocumentService';
import type { TileCoord } from '@editor/map/schema/geometry';
import type { LayerId } from '@editor/map/schema/ids';

export class EraseSelectionCommand implements Command {
  readonly kind = 'selection:erase';

  private captured: Array<{ layerId: LayerId; coord: TileCoord; entry: TileLayerEntry }> = [];
  private prevLayer: LayerId | null = null;
  private prevCells: TileCoord[] = [];

  isEmpty(): boolean {
    const s = useSelectionStore.getState().selection;
    return s?.kind !== 'tiles' || s.cells.size === 0;
  }

  do(service: DocumentService): void {
    const sel = useSelectionStore.getState().selection;
    if (sel?.kind !== 'tiles') {
      this.prevLayer = null;
      this.prevCells = [];
      return;
    }
    this.prevLayer = sel.layerId;
    this.prevCells = [];
    for (const key of sel.cells) this.prevCells.push(decodeTileCoord(key));

    if (sel.cells.size === 0) return;

    const layerId = sel.layerId;
    this.captured = [];
    for (const key of sel.cells) {
      const coord = decodeTileCoord(key);
      const entry = service.getTile(layerId, coord);
      if (entry === null) continue;
      this.captured.push({ layerId, coord, entry });
      new EraseTileCommand(layerId, coord).do(service);
    }

    useSelectionStore.getState().clear();
  }

  undo(service: DocumentService): void {
    for (let i = this.captured.length - 1; i >= 0; i--) {
      const c = this.captured[i];
      if (!c) continue;
      service.setTile(c.layerId, c.coord, c.entry);
    }
    if (this.prevLayer !== null) {
      useSelectionStore.getState().setTileSelection(this.prevLayer, this.prevCells);
    }
  }
}
