/**
 * SelectionOverlay — draws selection rectangles and marquee preview
 * over the world container.
 *
 * Three distinct visuals:
 *   - Tile cells: translucent fill + 1px outline per selected cell.
 *   - Non-tile selection (entity / collider): a 1.5px outline around
 *     the world-pixel bounds, plus a tiny corner-mark to distinguish
 *     it from the underlying object. Outline color is constant (blue)
 *     so the user reads "selected" regardless of object kind.
 *   - Marquee outline: a solid rect over the in-progress drag preview.
 *     (Tile-only in v0.1 — SelectTool gates on layer type.)
 *
 * Hover is tile-only; entity / collider hover lands with the editor
 * extension.
 *
 * Subscribes to selectionStore AND documentStore (entity / collider
 * position info). Redraws are coalesced via requestAnimationFrame,
 * same pattern as GridView / TileLayerView.
 *
 * Does NOT consume pointer events.
 */

import { Container, Graphics } from 'pixi.js';

import { decodeTileCoord } from '@editor/map/schema/tile';
import { useDocumentStore } from '@state/documentStore';
import { useSelectionStore } from '@state/selectionStore';

import type { TileCoord } from '@editor/map/schema/geometry';

const SELECTION_FILL_COLOR = 0x4d9fff;
const SELECTION_FILL_ALPHA = 0.18;
const SELECTION_OUTLINE_COLOR = 0x4d9fff;
const SELECTION_OUTLINE_ALPHA = 0.9;

const NON_TILE_OUTLINE_WIDTH = 1.5;

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
    // The selected entity/collider can move (or be removed) without
    // touching the selection store. Subscribe to the document too so
    // the outline tracks.
    this.unsubscribes.push(useDocumentStore.subscribe(() => this.scheduleRedraw()));
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

    const { selection, marquee, hover } = useSelectionStore.getState();
    const doc = useDocumentStore.getState();
    const tileSize = this.tileSize;
    const g = this.graphics;
    g.clear();

    if (selection?.kind === 'tiles') {
      const lineWidth = 1; // 1 world unit; the parent container's zoom gives CSS pixels
      for (const key of selection.cells) {
        const c = decodeTileCoord(key);
        g.rect(c.x * tileSize, c.y * tileSize, tileSize, tileSize)
          .fill({ color: SELECTION_FILL_COLOR, alpha: SELECTION_FILL_ALPHA })
          .stroke({
            color: SELECTION_OUTLINE_COLOR,
            width: lineWidth,
            alpha: SELECTION_OUTLINE_ALPHA,
          });
      }
    } else if (selection?.kind === 'entity') {
      const e = doc.entities.get(selection.entityId);
      if (e) {
        g.rect(e.position.x, e.position.y, e.size.width, e.size.height).stroke({
          color: SELECTION_OUTLINE_COLOR,
          width: NON_TILE_OUTLINE_WIDTH,
          alpha: SELECTION_OUTLINE_ALPHA,
        });
        drawCornerMarks(g, e.position.x, e.position.y, e.size.width, e.size.height);
      }
    } else if (selection?.kind === 'collider') {
      const c = doc.colliders.get(selection.colliderId);
      if (c?.type === 'box') {
        g.rect(c.position.x, c.position.y, c.size.width, c.size.height).stroke({
          color: SELECTION_OUTLINE_COLOR,
          width: NON_TILE_OUTLINE_WIDTH,
          alpha: SELECTION_OUTLINE_ALPHA,
        });
        drawCornerMarks(g, c.position.x, c.position.y, c.size.width, c.size.height);
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

const drawCornerMarks = (g: Graphics, x: number, y: number, w: number, h: number): void => {
  const m = 4;
  const c = SELECTION_OUTLINE_COLOR;
  const a = 0.9;
  g.moveTo(x, y)
    .lineTo(x + m, y)
    .stroke({ color: c, width: 1, alpha: a });
  g.moveTo(x, y)
    .lineTo(x, y + m)
    .stroke({ color: c, width: 1, alpha: a });
  g.moveTo(x + w, y)
    .lineTo(x + w - m, y)
    .stroke({ color: c, width: 1, alpha: a });
  g.moveTo(x + w, y)
    .lineTo(x + w, y + m)
    .stroke({ color: c, width: 1, alpha: a });
  g.moveTo(x, y + h)
    .lineTo(x + m, y + h)
    .stroke({ color: c, width: 1, alpha: a });
  g.moveTo(x, y + h)
    .lineTo(x, y + h - m)
    .stroke({ color: c, width: 1, alpha: a });
  g.moveTo(x + w, y + h)
    .lineTo(x + w - m, y + h)
    .stroke({ color: c, width: 1, alpha: a });
  g.moveTo(x + w, y + h)
    .lineTo(x + w, y + h - m)
    .stroke({ color: c, width: 1, alpha: a });
};

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
