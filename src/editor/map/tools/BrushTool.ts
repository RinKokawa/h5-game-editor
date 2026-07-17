/**
 * BrushTool — paints tiles via the CommandBus.
 *
 * Step 10 wiring: each pointerdown→pointerup stroke accumulates a
 * list of tile edits and dispatches them as a single
 * `CompositeCommand`. One drag stroke is therefore one Ctrl+Z, not
 * dozens.
 *
 * Live-paint semantics: every cell the cursor passes over during
 * a drag is painted IMMEDIATELY (the user sees tiles appear as they
 * drag, not all at once on release). The stroke is still a single
 * undo entry — BrushTool holds the pre-executed Commands in a
 * buffer and dispatches a {@link StrokeCommand} at pointerup.
 * StrokeCommand's `do()` is a no-op (children already ran); its
 * `undo()` walks the buffer in reverse to restore each cell.
 *
 * Pan-vs-paint arbitration: Camera owns the pan gesture (middle
 * button, or Space+left). BrushTool independently tracks Space so
 * it knows not to paint under Space; both tools can coexist on the
 * same canvas listeners without coordination.
 *
 * Step 24: implements {@link Tool}. Construction is parameterless;
 * the canvas reference is supplied via `attach(canvas)`.
 */

import { commandBus } from '@core/command/commandBusSingleton';
import { StrokeCommand } from '@core/command/StrokeCommand';
import { documentService } from '@core/document/documentServiceSingleton';
import { EraseTileCommand, PlaceTileCommand } from '@editor/map/commands/index';
import { isEraserTile } from '@editor/map/palette/defaultPalette';
import { screenToWorld } from '@shared/math/index';
import { useBrushStore } from '@state/brushStore';
import { PLACEHOLDER_TILESET_ID } from '@state/documentStore';
import { useDocumentStore } from '@state/documentStore';
import { useToolStore } from '@state/toolStore';
import { useViewStore } from '@state/viewStore';

import type { Command } from '@core/command/Command';
import type { TileCoord } from '@editor/map/schema/geometry';
import type { Tool } from '@shared/tool/Tool';

export class BrushTool implements Tool {
  readonly id = 'brush';
  readonly labelKey = 'toolbar.tool.brush';

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
    return useToolStore.getState().activeToolId === 'brush';
  }

  /**
   * Push the accumulated stroke onto the history as a single undo
   * entry. If the buffer is empty (no paints landed inside the map)
   * this is a no-op — we don't want Ctrl+Z to surface a phantom
   * undo entry for a click in the gutter.
   */
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

    // Resolve the active layer once. Skip if it's not a tile layer or
    // is locked — Commands would no-op anyway, but skipping here keeps
    // the early-return fast and avoids polluting the stroke buffer.
    const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
    if (!activeLayer || activeLayer.type !== 'tile') return;
    if (activeLayer.locked) return;

    const activeTileId = useBrushStore.getState().activeTileId;
    let cmd: Command;
    if (isEraserTile(activeTileId)) {
      cmd = new EraseTileCommand(activeLayer.id, coord);
    } else {
      cmd = new PlaceTileCommand(activeLayer.id, coord, {
        tilesetId: PLACEHOLDER_TILESET_ID,
        tileId: activeTileId,
        rotation: 0,
        flipX: false,
        flipY: false,
      });
    }
    // Execute live so the user sees tiles appear during the drag.
    // The same `cmd` is also retained in `strokeBuffer` so the
    // resulting StrokeCommand can `undo()` it as one unit.
    cmd.do(documentService);
    this.strokeBuffer.push(cmd);
  }
}