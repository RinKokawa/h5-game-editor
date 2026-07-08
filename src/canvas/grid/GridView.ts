/**
 * GridView — world-space grid overlay.
 *
 * Renders a tile grid inside the document extent using a single Pixi
 * `Graphics` object. Lines stay 1 CSS pixel at any zoom because the
 * stroke width is `1 / camera.zoom` in world units and the world
 * container is scaled by `zoom`.
 *
 * Redraws are coalesced via requestAnimationFrame: any number of
 * store updates within a frame collapse to a single draw(). When the
 * zoomed-out line width would meet or exceed the tile size (the grid
 * would render as a solid fill), drawing is skipped entirely.
 *
 * Does NOT consume pointer events: `eventMode = 'none'` on the
 * container, and the Graphics inherits it.
 */

import { Container, Graphics } from 'pixi.js';

import { useDocumentStore } from '@state/documentStore';
import { useViewStore } from '@state/viewStore';
import { useWorldStore } from '@state/worldStore';

import type { PixiRenderer } from '@canvas/renderer/PixiRenderer';

export class GridView {
  readonly container: Container;

  private readonly renderer: PixiRenderer;
  private readonly graphics: Graphics;

  private unsubscribes: Array<() => void> = [];
  private rafId: number | null = null;
  private destroyed = false;

  constructor(renderer: PixiRenderer, parent: Container) {
    this.renderer = renderer;
    this.container = new Container();
    this.container.eventMode = 'none';

    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    parent.addChild(this.container);

    this.subscribeToStores();
    this.draw();
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

  private subscribeToStores(): void {
    this.unsubscribes.push(
      useViewStore.subscribe(() => this.scheduleDraw()),
      useDocumentStore.subscribe(() => this.scheduleDraw()),
      useWorldStore.subscribe(() => this.scheduleDraw()),
    );
  }

  private scheduleDraw(): void {
    if (this.destroyed || this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.draw();
    });
  }

  private draw(): void {
    if (this.destroyed) return;

    const camera = useViewStore.getState();
    const doc = useDocumentStore.getState();
    const world = useWorldStore.getState();
    const viewport = this.renderer.getSize();

    this.graphics.clear();

    if (!world.showGrid) {
      this.container.visible = false;
      return;
    }
    this.container.visible = true;

    const { tileSize, mapSize } = doc;
    if (
      tileSize <= 0 ||
      mapSize.width <= 0 ||
      mapSize.height <= 0 ||
      viewport.width <= 0 ||
      viewport.height <= 0 ||
      camera.zoom <= 0
    ) {
      return;
    }

    const lineWidth = 1 / camera.zoom;
    // Culling: at very low zoom the line would be thicker than a cell.
    if (lineWidth >= tileSize) return;

    const visibleMinX = -camera.position.x / camera.zoom;
    const visibleMinY = -camera.position.y / camera.zoom;
    const visibleMaxX = visibleMinX + viewport.width / camera.zoom;
    const visibleMaxY = visibleMinY + viewport.height / camera.zoom;

    const startX = Math.max(0, Math.floor(visibleMinX / tileSize) * tileSize);
    const endX = Math.min(mapSize.width, Math.ceil(visibleMaxX / tileSize) * tileSize);
    const startY = Math.max(0, Math.floor(visibleMinY / tileSize) * tileSize);
    const endY = Math.min(mapSize.height, Math.ceil(visibleMaxY / tileSize) * tileSize);

    if (startX > endX || startY > endY) return;

    for (let x = startX; x <= endX; x += tileSize) {
      this.graphics.moveTo(x, startY).lineTo(x, endY);
    }
    this.graphics.stroke({ color: world.gridColor, width: lineWidth, alpha: 1 });

    for (let y = startY; y <= endY; y += tileSize) {
      this.graphics.moveTo(startX, y).lineTo(endX, y);
    }
    this.graphics.stroke({ color: world.gridColor, width: lineWidth, alpha: 1 });
  }
}
