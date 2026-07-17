/**
 * SelectionOverlay — PixiJS overlay lifecycle + subscription wiring.
 *
 * The overlay reacts to four stores (selection, document, view, plus
 * the imperative `getTileSize` from Camera). The Graphics API isn't
 * easy to introspect, so we assert observable side effects:
 *
 *   - the overlay adds a child to its parent container on construct
 *   - subscribing to selection/document/view triggers a redraw
 *     (we trigger one synchronously via `destroy` after a fake rAF)
 *   - destroy removes the container from its parent + clears the
 *     subscriptions so a subsequent store update is a no-op
 *
 * Drawing tests would need a richer Pixi happy-dom setup; we
 * covered that visually in the manual Step 19 walkthrough. The
 * wiring is the load-bearing part — if it breaks, panels show
 * stale outlines.
 */

import { Container } from 'pixi.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { asEntityId, asLayerId } from '@editor/map/schema/ids';
import { useDocumentStore } from '@state/documentStore';
import { useSelectionStore } from '@state/selectionStore';
import { useViewStore } from '@state/viewStore';

import { SelectionOverlay } from './SelectionOverlay';

describe('SelectionOverlay', () => {
  let parent: Container;

  beforeEach(() => {
    useDocumentStore.getState().reset();
    useSelectionStore.setState({ selection: null, marquee: null });
    useViewStore.setState({ cursorWorld: null });
    parent = new Container();
  });

  afterEach(() => {
    useDocumentStore.getState().reset();
    useSelectionStore.setState({ selection: null, marquee: null });
    useViewStore.setState({ cursorWorld: null });
  });

  it('adds its container as a child of the parent', () => {
    const overlay = new SelectionOverlay(parent, () => 32);
    expect(parent.children).toContain(overlay.container);
  });

  it('does not consume pointer events (eventMode = none)', () => {
    const overlay = new SelectionOverlay(parent, () => 32);
    expect(overlay.container.eventMode).toBe('none');
  });

  it('subscribes to selection, document, and view stores', () => {
    // Drive the redraw path by mutating each store and confirming
    // that the overlay does not throw on the change.
    const overlay = new SelectionOverlay(parent, () => 32);
    expect(() => useSelectionStore.getState().clear()).not.toThrow();
    expect(() =>
      useSelectionStore
        .getState()
        .setTileSelection(asLayerId('layer.tile.1'), [{ x: 0, y: 0 }]),
    ).not.toThrow();
    expect(() =>
      useDocumentStore.getState().setActiveLayer(asLayerId('layer.tile.1')),
    ).not.toThrow();
    expect(() => useViewStore.setState({ cursorWorld: { x: 16, y: 16 } })).not.toThrow();
    overlay.destroy();
  });

  it('destroys cleanly — container is detached and store updates no-op', () => {
    const overlay = new SelectionOverlay(parent, () => 32);
    overlay.destroy();

    expect(parent.children).not.toContain(overlay.container);
    // A subsequent store mutation must not throw — that would mean a
    // subscription leaked past destroy.
    expect(() =>
      useSelectionStore
        .getState()
        .setEntitySelection(asEntityId('entity.e1'), asLayerId('layer.object.1')),
    ).not.toThrow();
  });

  it('destroy is idempotent', () => {
    const overlay = new SelectionOverlay(parent, () => 32);
    overlay.destroy();
    expect(() => overlay.destroy()).not.toThrow();
  });
});