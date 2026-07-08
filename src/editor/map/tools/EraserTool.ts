/**
 * EraserTool — drag to erase tiles in the active layer.
 *
 * Identical to BrushTool, but every stroke forces an erase
 * regardless of the palette selection. Activating the Eraser icon
 * from the toolbar guarantees erasure, which is what users expect.
 *
 * Like BrushTool, each pointerdown→pointerup stroke is bundled into
 * a single CompositeCommand.
 */

import { commandBus } from '@core/command/commandBusSingleton';
import { CompositeCommand } from '@core/command/CompositeCommand';
import { EraseTileCommand } from '@editor/map/commands/index';
import { screenToWorld } from '@shared/math/index';
import { useDocumentStore } from '@state/documentStore';
import { useToolStore } from '@state/toolStore';
import { useViewStore } from '@state/viewStore';

import type { Command } from '@core/command/Command';
import type { TileCoord } from '@editor/map/schema/geometry';

export class EraserTool {
  private readonly canvas: HTMLCanvasElement;

  private spacePressed = false;
  private painting = false;
  private lastPaintedCoord: TileCoord | null = null;
  private strokeBuffer: Command[] = [];

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
    this.painting = false;
    this.lastPaintedCoord = null;
    this.strokeBuffer = [];
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.isActive()) return;
    if (event.button !== 0) return;
    if (this.spacePressed) return;
    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    this.painting = true;
    this.lastPaintedCoord = null;
    this.strokeBuffer = [];
    this.paintAt(event);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.isActive()) {
      this.lastPaintedCoord = null;
      return;
    }
    if (this.painting) this.paintAt(event);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.painting) return;
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    this.flushStroke();
    this.painting = false;
    this.lastPaintedCoord = null;
  };

  private readonly onPointerLeave = (): void => {
    this.flushStroke();
    this.painting = false;
    this.lastPaintedCoord = null;
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
    return useToolStore.getState().activeToolId === 'eraser';
  }

  private flushStroke(): void {
    if (this.strokeBuffer.length === 0) return;
    const composite = new CompositeCommand(this.strokeBuffer);
    this.strokeBuffer = [];
    commandBus.execute(composite);
  }

  private paintAt(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const world = screenToWorld(screen, useViewStore.getState());
    const doc = useDocumentStore.getState();

    if (world.x < 0 || world.y < 0) return;
    if (world.x >= doc.mapSize.width || world.y >= doc.mapSize.height) return;

    const coord: TileCoord = {
      x: Math.floor(world.x / doc.tileSize),
      y: Math.floor(world.y / doc.tileSize),
    };
    if (
      this.lastPaintedCoord &&
      this.lastPaintedCoord.x === coord.x &&
      this.lastPaintedCoord.y === coord.y
    ) {
      return;
    }
    this.lastPaintedCoord = coord;

    const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
    if (!activeLayer || activeLayer.type !== 'tile') return;
    if (activeLayer.locked) return;

    this.strokeBuffer.push(new EraseTileCommand(activeLayer.id, coord));
  }
}
