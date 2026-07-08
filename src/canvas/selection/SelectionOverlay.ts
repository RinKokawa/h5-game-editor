/**
 * SelectionOverlay — draws selection rectangles and marquee preview
 * over the world container.
 *
 * Two distinct visuals:
 *   - Filled selection: a translucent fill plus a 1px outline per
 *     selected cell.
 *   - Marquee outline: a dashed-style rectangle for the in-progress
 *     drag preview (we use a solid outline — dashing in Pixi v8 is
 *     not free, and the overlay is repainted on every store change
 *     so visual fidelity matters less than responsiveness).
 *
 * Subscribes to selectionStore. Redraws are coalesced via
 * requestAnimationFrame, same pattern as GridView / TileLayerView.
 *
 * Does NOT consume pointer events.
 */

import { Container, Graphics } from 'pixi.js';

import { decodeTileCoord } from '@editor/map/schema/tile';
import { useSelectionStore } from '@state/selectionStore';

import type { TileCoord } from '@editor/map/schema/geometry';

const SELECTION_FILL_COLOR = 0x4d9fff;
const SELECTION_FILL_ALPHA = 0.18;
const SELECTION_OUTLINE_COLOR = 0x4d9fff;
const SELECTION_OUTLINE_ALPHA = 0.9;

const MARQUEE_OUTLINE_COLOR = 0xffffff;
const MARQUEE_OUTLINE_ALPHA = 0.9;

const HOVER_OUTLINE_COLOR = 0xffffff;
const HOVER_OUTLINE_ALPHA = 0.35;

export class SelectionOverlay {
  readonly container: Container;

  private readonly graphics: Graphics;
  private unsubscribes: Array<() => void> = [];
  private rafId: number | null = null;
  private destroyed = false;
  private tileSize = 32;

  constructor(parent: Container, getTileSize: () => number) {
    this.container = new Container();
    this.container.eventMode = 'none';

    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    parent.addChild(this.container);

    const tileSizeGetter = (): number => {
      this.tileSize = getTileSize();
      return this.tileSize;
    };
    tileSizeGetter(); // initial seed

    this.unsubscribes.push(useSelectionStore.subscribe(() => this.scheduleRedraw()));
    this.scheduleRedraw();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const unsub of this.unsubscribes) unsub();
    this.unsubscribes = [];
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }

  private scheduleRedraw(): void {
    if (this.destroyed || this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.draw();
    });
  }

  private draw(): void {
    if (this.destroyed) return;

    const { cells, marquee, hover } = useSelectionStore.getState();
    const tileSize = this.tileSize;
    const g = this.graphics;
    g.clear();

    if (cells.size > 0) {
      const lineWidth = 1; // 1 world unit; the parent container's zoom gives CSS pixels
      for (const key of cells) {
        const c = decodeTileCoord(key);
        g.rect(c.x * tileSize, c.y * tileSize, tileSize, tileSize)
          .fill({ color: SELECTION_FILL_COLOR, alpha: SELECTION_FILL_ALPHA })
          .stroke({
            color: SELECTION_OUTLINE_COLOR,
            width: lineWidth,
            alpha: SELECTION_OUTLINE_ALPHA,
          });
      }
    }

    if (marquee) {
      const rect = rectFromCorners(marquee.start, marquee.end);
      g.rect(rect.x * tileSize, rect.y * tileSize, rect.w * tileSize, rect.h * tileSize).stroke({
        color: MARQUEE_OUTLINE_COLOR,
        width: 1,
        alpha: MARQUEE_OUTLINE_ALPHA,
      });
    }

    if (hover) {
      g.rect(hover.x * tileSize, hover.y * tileSize, tileSize, tileSize).stroke({
        color: HOVER_OUTLINE_COLOR,
        width: 1,
        alpha: HOVER_OUTLINE_ALPHA,
      });
    }
  }
}

const rectFromCorners = (
  a: TileCoord,
  b: TileCoord,
): { x: number; y: number; w: number; h: number } => {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  return {
    x: minX,
    y: minY,
    w: Math.abs(a.x - b.x) + 1,
    h: Math.abs(a.y - b.y) + 1,
  };
};
