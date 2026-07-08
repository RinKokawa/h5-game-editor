/**
 * SelectTool — click cells to toggle selection, drag to marquee.
 *
 * Behavior:
 *   - pointerdown (no drag): clear previous selection, select clicked cell
 *   - pointerdown → pointermove (dragged): replace selection with
 *     marquee contents (inclusive rect of start..end)
 *   - pointermove (no drag): update hover highlight
 *   - ESC clears selection (handled by SelectionShortcuts, not here)
 *   - Space+left: defer to camera (consistent with BrushTool)
 *
 * Selection is per active layer. The active layer at click time is
 * captured and used throughout the drag — switching layers mid-drag
 * doesn't reshuffle the marquee.
 */

import { screenToWorld } from '@shared/math/index';
import { useDocumentStore } from '@state/documentStore';
import { useSelectionStore } from '@state/selectionStore';
import { useToolStore } from '@state/toolStore';
import { useViewStore } from '@state/viewStore';

import type { TileCoord } from '@editor/map/schema/geometry';
import type { LayerId } from '@editor/map/schema/ids';

export class SelectTool {
  private readonly canvas: HTMLCanvasElement;

  private spacePressed = false;
  private dragging = false;
  private dragStart: TileCoord | null = null;
  private dragLayerId: LayerId | null = null;
  private lastPointerEvent: PointerEvent | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.dragging = false;
    this.dragStart = null;
    this.dragLayerId = null;
    this.lastPointerEvent = null;
    useSelectionStore.getState().setHover(null);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.isActive()) return;
    if (event.button !== 0) return;
    if (this.spacePressed) return;
    const coord = this.eventToCoord(event);
    if (!coord) return;
    const layer = this.activeTileLayer();
    if (!layer) return;

    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    this.dragging = true;
    this.dragStart = coord;
    this.dragLayerId = layer.id;
    useSelectionStore.getState().beginMarquee(layer.id, coord);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.isActive()) return;
    const coord = this.eventToCoord(event);
    if (!coord) return;
    this.lastPointerEvent = event;
    useSelectionStore.getState().setHover(coord);

    if (this.dragging) {
      useSelectionStore.getState().updateMarquee(coord);
    }
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.isActive() || !this.dragging) return;
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    const start = this.dragStart;
    const layerId = this.dragLayerId;
    const cells = useSelectionStore.getState().endMarquee();
    this.dragging = false;
    this.dragStart = null;
    this.dragLayerId = null;

    // No-drag click → toggle the clicked cell only.
    if (start && this.lastPointerEvent && cells.size === 1) {
      const lastCoord = this.eventToCoord(this.lastPointerEvent);
      if (lastCoord && lastCoord.x === start.x && lastCoord.y === start.y && layerId) {
        useSelectionStore.getState().toggleCell(layerId, start);
      }
    }
  };

  private readonly onPointerLeave = (): void => {
    useSelectionStore.getState().setHover(null);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== 'Space' || event.repeat) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    this.spacePressed = true;
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (event.code !== 'Space') return;
    this.spacePressed = false;
  };

  private isActive(): boolean {
    return useToolStore.getState().activeToolId === 'select';
  }

  private activeTileLayer() {
    const doc = useDocumentStore.getState();
    const layer = doc.layers.find((l) => l.id === doc.activeLayerId);
    if (!layer || layer.type !== 'tile') return null;
    return layer;
  }

  private eventToCoord(event: PointerEvent): TileCoord | null {
    const rect = this.canvas.getBoundingClientRect();
    const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const world = screenToWorld(screen, useViewStore.getState());
    const doc = useDocumentStore.getState();
    if (world.x < 0 || world.y < 0) return null;
    if (world.x >= doc.mapSize.width || world.y >= doc.mapSize.height) return null;
    return {
      x: Math.floor(world.x / doc.tileSize),
      y: Math.floor(world.y / doc.tileSize),
    };
  }
}
