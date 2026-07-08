/**
 * Selection store — unit tests for the discriminated-union model.
 *
 * Verifies:
 *   - tile selection (set / toggle / add / clear) preserves the layer
 *   - entity selection
 *   - collider selection
 *   - marquee starts a tile selection and lands it on endMarquee
 *   - cancelMarquee clears tile selection but leaves non-tile alone
 *   - clear() resets every field including hover
 */

import { describe, expect, it, beforeEach } from 'vitest';

import { asColliderId, asEntityId, asLayerId } from '@editor/map/schema/ids';
import { useSelectionStore } from '@state/selectionStore';

const resetStore = (): void => {
  useSelectionStore.setState({
    selection: null,
    marquee: null,
    hover: null,
  });
};

describe('selectionStore — tile selection', () => {
  beforeEach(() => {
    resetStore();
  });

  it('setTileSelection stores cells on the given layer', () => {
    const layerId = asLayerId('layer.tile.1');
    useSelectionStore.getState().setTileSelection(layerId, [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]);
    const sel = useSelectionStore.getState().selection;
    expect(sel?.kind).toBe('tiles');
    if (sel?.kind !== 'tiles') return;
    expect(sel.layerId).toBe(layerId);
    expect(sel.cells.size).toBe(3);
  });

  it('toggleTileCell adds when empty', () => {
    const layerId = asLayerId('layer.tile.1');
    useSelectionStore.getState().toggleTileCell(layerId, { x: 5, y: 5 });
    const sel = useSelectionStore.getState().selection;
    expect(sel?.kind).toBe('tiles');
    if (sel?.kind !== 'tiles') return;
    expect(sel.cells.size).toBe(1);
  });

  it('toggleTileCell adds then removes', () => {
    const layerId = asLayerId('layer.tile.1');
    const sel = useSelectionStore.getState();
    sel.toggleTileCell(layerId, { x: 5, y: 5 });
    sel.toggleTileCell(layerId, { x: 5, y: 5 });
    expect(useSelectionStore.getState().selection).toBeNull();
  });

  it('toggleTileCell switches layers and replaces the cells', () => {
    const a = asLayerId('layer.tile.a');
    const b = asLayerId('layer.tile.b');
    const sel = useSelectionStore.getState();
    sel.toggleTileCell(a, { x: 1, y: 1 });
    sel.toggleTileCell(b, { x: 2, y: 2 });
    const out = useSelectionStore.getState().selection;
    expect(out?.kind).toBe('tiles');
    if (out?.kind !== 'tiles') return;
    expect(out.layerId).toBe(b);
    expect(out.cells.size).toBe(1);
  });

  it('addTileCell is additive within the same layer', () => {
    const layerId = asLayerId('layer.tile.1');
    const sel = useSelectionStore.getState();
    sel.setTileSelection(layerId, [{ x: 0, y: 0 }]);
    sel.addTileCell(layerId, { x: 1, y: 0 });
    sel.addTileCell(layerId, { x: 1, y: 0 });
    const out = useSelectionStore.getState().selection;
    if (out?.kind !== 'tiles') throw new Error('expected tiles');
    expect(out.cells.size).toBe(2);
  });
});

describe('selectionStore — non-tile selection', () => {
  beforeEach(() => {
    resetStore();
  });

  it('setEntitySelection sets kind=entity', () => {
    const layerId = asLayerId('layer.object.1');
    const entityId = asEntityId('entity.1');
    useSelectionStore.getState().setEntitySelection(entityId, layerId);
    const sel = useSelectionStore.getState().selection;
    expect(sel?.kind).toBe('entity');
    if (sel?.kind !== 'entity') return;
    expect(sel.layerId).toBe(layerId);
    expect(sel.entityId).toBe(entityId);
  });

  it('setColliderSelection sets kind=collider', () => {
    const layerId = asLayerId('layer.collision.1');
    const colliderId = asColliderId('collider.1');
    useSelectionStore.getState().setColliderSelection(colliderId, layerId);
    const sel = useSelectionStore.getState().selection;
    expect(sel?.kind).toBe('collider');
    if (sel?.kind !== 'collider') return;
    expect(sel.layerId).toBe(layerId);
    expect(sel.colliderId).toBe(colliderId);
  });

  it('setting entity selection replaces a prior tile selection', () => {
    const tileLayer = asLayerId('layer.tile.1');
    const objectLayer = asLayerId('layer.object.1');
    const sel = useSelectionStore.getState();
    sel.setTileSelection(tileLayer, [{ x: 0, y: 0 }]);
    sel.setEntitySelection(asEntityId('entity.1'), objectLayer);
    const out = useSelectionStore.getState().selection;
    expect(out?.kind).toBe('entity');
  });
});

describe('selectionStore — marquee lifecycle', () => {
  beforeEach(() => {
    resetStore();
  });

  it('beginMarquee seeds a tile selection; endMarquee lands the rect', () => {
    const layerId = asLayerId('layer.tile.1');
    const sel = useSelectionStore.getState();
    sel.beginMarquee(layerId, { x: 1, y: 1 });
    sel.updateMarquee({ x: 3, y: 2 });
    const cells = sel.endMarquee();
    expect(cells.size).toBe(6); // 3 × 2 inclusive
    const out = useSelectionStore.getState().selection;
    if (out?.kind !== 'tiles') throw new Error('expected tiles');
    expect(out.layerId).toBe(layerId);
    expect(out.cells.size).toBe(6);
    expect(useSelectionStore.getState().marquee).toBeNull();
  });

  it('cancelMarquee clears tile selection but keeps non-tile (no marquee in flight)', () => {
    const objectLayer = asLayerId('layer.object.1');
    const sel = useSelectionStore.getState();
    sel.setEntitySelection(asEntityId('entity.1'), objectLayer);
    sel.cancelMarquee();
    const out = useSelectionStore.getState().selection;
    expect(out?.kind).toBe('entity');
    expect(useSelectionStore.getState().marquee).toBeNull();
  });
});

describe('selectionStore — clear()', () => {
  beforeEach(() => {
    resetStore();
  });

  it('clears tile selection, marquee, and hover', () => {
    const layerId = asLayerId('layer.tile.1');
    const sel = useSelectionStore.getState();
    sel.beginMarquee(layerId, { x: 0, y: 0 });
    sel.setHover({ x: 5, y: 5 });
    sel.endMarquee();
    sel.setHover({ x: 5, y: 5 });
    sel.clear();
    const out = useSelectionStore.getState();
    expect(out.selection).toBeNull();
    expect(out.marquee).toBeNull();
    expect(out.hover).toBeNull();
  });
});
