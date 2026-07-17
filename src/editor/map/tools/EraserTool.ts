/**
 * EraserTool — drag to erase tiles in the active layer.
 *
 * Identical to BrushTool in mechanics, but every stroke forces an
 * erase regardless of the palette selection. Activating the Eraser
 * icon from the toolbar guarantees erasure, which is what users
 * expect.
 *
 * Live-paint semantics match BrushTool: every cell the cursor
 * passes over during a drag is erased immediately. The whole stroke
 * is still a single Ctrl+Z entry via {@link StrokeCommand}.
 *
 * Step 24: implements {@link Tool}.
 */

import { commandBus } from '@core/command/commandBusSingleton';
import { StrokeCommand } from '@core/command/StrokeCommand';
import { documentService } from '@core/document/documentServiceSingleton';
import { EraseTileCommand } from '@editor/map/commands/index';
import { screenToWorld } from '@shared/math/index';
import { useDocumentStore } from '@state/documentStore';
import { useToolStore } from '@state/toolStore';
import { useViewStore } from '@state/viewStore';

import type { Command } from '@core/command/Command';
import type { TileCoord } from '@editor/map/schema/geometry';
import type { Tool } from '@shared/tool/Tool';

export class EraserTool implements Tool {
  readonly id = 'eraser';
  readonly labelKey = 'toolbar.tool.eraser';

  private canvas: HTMLCanvasElement | null = null;

  private spacePressed = false;
  private painting = false;
  private lastPaintedCoord: TileCoord | null = null;
  private strokeBuffer: Command[] = [];

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  detach(): void {
    const canvas = this.canvas;
    if (canvas) {
      canvas.removeEventListener('pointerdown', this.onPointerDown);
      canvas.removeEventListener('pointermove', this.onPointerMove);
      canvas.removeEventListener('pointerup', this.onPointerUp);
      canvas.removeEventListener('pointerleave', this.onPointerLeave);
    }
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas = null;
    this.painting = false;
    this.lastPaintedCoord = null;
    this.strokeBuffer = [];
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.isActive()) return;
    if (event.button !== 0) return;
    if (this.spacePressed) return;
    if (!this.canvas) return;
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
    if (this.canvas?.hasPointerCapture(event.pointerId)) {
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
    commandBus.execute(new StrokeCommand(this.strokeBuffer));
    this.strokeBuffer = [];
  }

  private paintAt(event: PointerEvent): void {
    const canvas = this.canvas;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const world = screenToWorld(screen, useViewStore.getState());
    const doc = useDocumentStore.getState();

    if (world.x < 0 || world.y < 0) return;
    if (world.x >= doc.meta.mapSize.width || world.y >= doc.meta.mapSize.height) return;

    const coord: TileCoord = {
      x: Math.floor(world.x / doc.meta.tileSize),
      y: Math.floor(world.y / doc.meta.tileSize),
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

    const cmd = new EraseTileCommand(activeLayer.id, coord);
    cmd.do(documentService);
    this.strokeBuffer.push(cmd);
  }
}