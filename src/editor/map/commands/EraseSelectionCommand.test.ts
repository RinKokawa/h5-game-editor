/**
 * EraseSelectionCommand — unit tests.
 *
 * Tile-only by design. The Command:
 *   - reads the current tile selection
 *   - captures each selected cell's entry
 *   - dispatches an EraseTileCommand for each cell
 *   - clears the selection
 *
 * undo restores every captured cell and re-selects them so the user
 * can see what came back.
 *
 * Non-tile selections (entity / collider) are a no-op; `isEmpty()`
 * lets callers (SelectionShortcuts) skip dispatching.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { DocumentService } from '@core/document/DocumentService';
import { asLayerId } from '@editor/map/schema/ids';
import { useDocumentStore } from '@state/documentStore';
import { useSelectionStore } from '@state/selectionStore';

import { EraseSelectionCommand } from './EraseSelectionCommand';

import type { TileLayerEntry } from '@core/document/DocumentService';

const resetStore = (): void => {
  useDocumentStore.getState().reset();
  useSelectionStore.setState({ selection: null, marquee: null });
};

const seedTileLayerId = (): ReturnType<typeof asLayerId> => {
  const layer = useDocumentStore.getState().layers.find((l) => l.type === 'tile');
  if (!layer) throw new Error('seed tile layer missing');
  return layer.id;
};

const tileEntry = (id = 1): TileLayerEntry => ({
  tilesetId: 'placeholder',
  tileId: id as never,
  rotation: 0,
  flipX: false,
  flipY: false,
});

describe('EraseSelectionCommand', () => {
  beforeEach(resetStore);

  it('isEmpty() returns true when there is no selection', () => {
    const cmd = new EraseSelectionCommand();
    expect(cmd.isEmpty()).toBe(true);
  });

  it('isEmpty() returns true for a non-tile selection', () => {
    useSelectionStore
      .getState()
      .setEntitySelection('entity.e1' as never, asLayerId('layer.object.1'));
    const cmd = new EraseSelectionCommand();
    expect(cmd.isEmpty()).toBe(true);
  });

  it('isEmpty() returns false for a non-empty tile selection', () => {
    const layerId = seedTileLayerId();
    useSelectionStore.getState().setTileSelection(layerId, [{ x: 1, y: 1 }]);
    const cmd = new EraseSelectionCommand();
    expect(cmd.isEmpty()).toBe(false);
  });

  it('do erases every captured tile and clears the selection; undo restores both', () => {
    const service = new DocumentService();
    const layerId = seedTileLayerId();
    service.setTile(layerId, { x: 1, y: 1 }, tileEntry(10));
    service.setTile(layerId, { x: 2, y: 1 }, tileEntry(20));
    useSelectionStore.getState().setTileSelection(layerId, [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);

    const cmd = new EraseSelectionCommand();
    cmd.do(service);

    expect(service.getTile(layerId, { x: 1, y: 1 })).toBeNull();
    expect(service.getTile(layerId, { x: 2, y: 1 })).toBeNull();
    expect(useSelectionStore.getState().selection).toBeNull();

    cmd.undo(service);

    expect(service.getTile(layerId, { x: 1, y: 1 })?.tileId).toBe(10);
    expect(service.getTile(layerId, { x: 2, y: 1 })?.tileId).toBe(20);
    const sel = useSelectionStore.getState().selection;
    expect(sel?.kind).toBe('tiles');
    if (sel?.kind === 'tiles') {
      expect(sel.layerId).toBe(layerId);
      expect(sel.cells.size).toBe(2);
    }
  });

  it('skips cells that are empty in the document (no entry to capture)', () => {
    const service = new DocumentService();
    const layerId = seedTileLayerId();
    // Only set one of the two selected cells.
    service.setTile(layerId, { x: 1, y: 1 }, tileEntry(10));
    useSelectionStore.getState().setTileSelection(layerId, [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);

    const cmd = new EraseSelectionCommand();
    cmd.do(service);
    // Cell 1 was erased, cell 2 had no entry.
    expect(service.getTile(layerId, { x: 1, y: 1 })).toBeNull();
    expect(service.getTile(layerId, { x: 2, y: 2 })).toBeNull();

    cmd.undo(service);
    // Only the captured cell is restored; the empty one stays empty.
    expect(service.getTile(layerId, { x: 1, y: 1 })?.tileId).toBe(10);
    expect(service.getTile(layerId, { x: 2, y: 2 })).toBeNull();
  });

  it('non-tile selection at do() is a no-op (no capture, no undo state)', () => {
    const service = new DocumentService();
    const layerId = seedTileLayerId();
    service.setTile(layerId, { x: 1, y: 1 }, tileEntry(10));
    useSelectionStore
      .getState()
      .setEntitySelection('entity.e1' as never, asLayerId('layer.object.1'));

    const cmd = new EraseSelectionCommand();
    expect(() => cmd.do(service)).not.toThrow();
    // The tile stays untouched.
    expect(service.getTile(layerId, { x: 1, y: 1 })?.tileId).toBe(10);

    expect(() => cmd.undo(service)).not.toThrow();
    // Still untouched.
    expect(service.getTile(layerId, { x: 1, y: 1 })?.tileId).toBe(10);
  });

  it('kind is selection:erase', () => {
    const cmd = new EraseSelectionCommand();
    expect(cmd.kind).toBe('selection:erase');
  });
});