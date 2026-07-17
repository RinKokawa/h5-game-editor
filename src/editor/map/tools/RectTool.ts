/**
 * RectTool — fill (or outline, with Shift) a rectangular region of tiles.
 *
 * Drag from cell A to cell B; the rectangle spanning A–B (inclusive,
 * both endpoints) is painted with the active tile, or erased if the
 * active palette tile is the eraser.
 *
 * Live preview semantics:
 *   Every pointermove recomputes the rectangle and re-applies it
 *   against the previous preview — cells that left the rectangle
 *   are restored (via `cmd.undo()`), cells that newly entered are
 *   painted. This way the preview tracks the cursor cell-by-cell
 *   without leaving a paint trail, and the entire drag is a single
 *   Ctrl+Z undo entry on pointerup (a {@link StrokeCommand} over
 *   the cells that were EVER touched).
 *
 * Modifier:
 *   Shift — outline only (1-cell-thick border of the rectangle).
 *   Without Shift — solid fill.
 *
 * Pan-vs-paint arbitration matches BrushTool: Space+left is reserved
 * for Camera panning. The tool tracks Space independently so the
 * shortcut can detect a drag intent without coordinating with the
 * Camera instance.
 *
 * Step 24: implements {@link Tool}.
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
import type { LayerId } from '@editor/map/schema/ids';
import type { Tool } from '@shared/tool/Tool';

export class RectTool implements Tool {
  readonly id = 'rect';
  readonly labelKey = 'toolbar.tool.rect';

  private canvas: HTMLCanvasElement | null = null;

  private spacePressed = false;
  private painting = false;
  private outlineMode = false;
  private anchor: TileCoord | null = null;
  private current: TileCoord | null = null;
  // Cells that have been painted during the current stroke. Held in
  // a Command buffer so a single Ctrl+Z walks the buffer in reverse.
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
    this.anchor = null;
    this.current = null;
    this.strokeBuffer = [];
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.isActive()) return;
    if (event.button !== 0) return;
    if (this.spacePressed) return;
    const coord = this.coordAt(event);
    if (!coord) return;
    if (!this.canvas) return;
    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    this.painting = true;
    this.outlineMode = event.shiftKey;
    this.anchor = coord;
    this.current = coord;
    this.strokeBuffer = [];
    this.applyAt(coord);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.isActive()) {
      this.anchor = null;
      this.current = null;
      return;
    }
    if (!this.painting || !this.anchor) return;

    const coord = this.coordAt(event);
    if (!coord) return;
    if (this.current && this.current.x === coord.x && this.current.y === coord.y) return;

    this.outlineMode = event.shiftKey;
    this.current = coord;
    this.refreshPreview();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.painting) return;
    if (this.canvas?.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    this.flushStroke();
    this.painting = false;
    this.anchor = null;
    this.current = null;
  };

  private readonly onPointerLeave = (): void => {
    // The user dragged off-canvas. Treat as end-of-stroke so we don't
    // leak a paint buffer. Real reentry on the same drag is rare
    // (pointer capture keeps events flowing to the canvas), so this
    // is safe.
    if (!this.painting) return;
    this.flushStroke();
    this.painting = false;
    this.anchor = null;
    this.current = null;
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
    return useToolStore.getState().activeToolId === 'rect';
  }

  /**
   * Recompute the rectangle from `anchor` to `current`. Cells that
   * left the rectangle get undone AND removed from the stroke buffer
   * (otherwise `findCommandFor` would later report them as still
   * painted and the rect couldn't reclaim them). Cells that newly
   * entered get painted. Anything that survives the move stays
   * painted.
   */
  private refreshPreview(): void {
    if (!this.anchor || !this.current) return;

    const desiredKeys = new Set(this.currentCells().map(keyOf));

    // Undo cells that left the rectangle. Walk the buffer in reverse
    // so splice() doesn't disturb the indices we haven't visited yet.
    for (let i = this.strokeBuffer.length - 1; i >= 0; i--) {
      const cmd = this.strokeBuffer[i];
      if (!cmd) continue;
      const coord = (cmd as { coord?: TileCoord }).coord;
      if (!coord) continue;
      if (desiredKeys.has(keyOf(coord))) continue;
      cmd.undo(documentService);
      this.strokeBuffer.splice(i, 1);
    }

    // Paint cells that entered.
    this.applyRect();
  }

  private applyAt(coord: TileCoord): void {
    const activeLayer = this.activeTileLayer();
    if (!activeLayer) return;
    const cmd = this.makeCommand(activeLayer.id, coord);
    cmd.do(documentService);
    this.strokeBuffer.push(cmd);
  }

  private applyRect(): void {
    const activeLayer = this.activeTileLayer();
    if (!activeLayer) return;
    const cells = this.currentCells();
    for (const cell of cells) {
      if (this.findCommandFor(cell)) continue; // already painted in stroke
      const cmd = this.makeCommand(activeLayer.id, cell);
      cmd.do(documentService);
      this.strokeBuffer.push(cmd);
    }
  }

  /** All cells in the anchor→current rectangle, before filtering. */
  private currentCells(): TileCoord[] {
    if (!this.anchor || !this.current) return [];
    const a = this.anchor;
    const b = this.current;
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);

    const out: TileCoord[] = [];
    if (this.outlineMode) {
      // Border only — top + bottom rows, left + right columns.
      for (let x = minX; x <= maxX; x++) {
        out.push({ x, y: minY });
        if (maxY !== minY) out.push({ x, y: maxY });
      }
      for (let y = minY + 1; y < maxY; y++) {
        out.push({ x: minX, y });
        if (maxX !== minX) out.push({ x: maxX, y });
      }
    } else {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          out.push({ x, y });
        }
      }
    }
    return out;
  }

  private makeCommand(layerId: LayerId, coord: TileCoord): Command {
    const activeTileId = useBrushStore.getState().activeTileId;
    if (isEraserTile(activeTileId)) {
      return new EraseTileCommand(layerId, coord);
    }
    return new PlaceTileCommand(layerId, coord, {
      tilesetId: PLACEHOLDER_TILESET_ID,
      tileId: activeTileId,
      rotation: 0,
      flipX: false,
      flipY: false,
    });
  }

  private activeTileLayer() {
    const doc = useDocumentStore.getState();
    const layer = doc.layers.find((l) => l.id === doc.activeLayerId);
    if (!layer || layer.type !== 'tile') return null;
    if (layer.locked) return null;
    return layer;
  }

  private findCommandFor(coord: TileCoord): Command | null {
    const k = keyOf(coord);
    for (let i = this.strokeBuffer.length - 1; i >= 0; i--) {
      const cmd = this.strokeBuffer[i];
      if (!cmd) continue;
      if (cmdMatches(cmd, coord, k)) return cmd;
    }
    return null;
  }

  private flushStroke(): void {
    if (this.strokeBuffer.length === 0) return;
    commandBus.execute(new StrokeCommand(this.strokeBuffer));
    this.strokeBuffer = [];
  }

  private coordAt(event: PointerEvent): TileCoord | null {
    const canvas = this.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const world = screenToWorld(screen, useViewStore.getState());
    const doc = useDocumentStore.getState();
    if (world.x < 0 || world.y < 0) return null;
    if (world.x >= doc.meta.mapSize.width || world.y >= doc.meta.mapSize.height) return null;
    return {
      x: Math.floor(world.x / doc.meta.tileSize),
      y: Math.floor(world.y / doc.meta.tileSize),
    };
  }
}

const keyOf = (c: TileCoord): string => `${c.x},${c.y}`;

const cmdMatches = (cmd: Command, coord: TileCoord, key: string): boolean => {
  // Commands are tagged by `kind`. PlaceTileCommand/EraseTileCommand
  // expose the layerId + coord through their own prototype; reading
  // via duck typing keeps the tool decoupled from those classes.
  const c = cmd as unknown as { coord?: TileCoord; layerId?: unknown };
  if (c.coord && c.coord.x === coord.x && c.coord.y === coord.y) return true;
  // Belt-and-suspenders: some builds serialise the coord as a string
  // key. We never do that here, so the keyOf path is enough.
  void key;
  return false;
};