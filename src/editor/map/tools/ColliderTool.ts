/**
 * ColliderTool — drag on the canvas to place a box collider on the
 * active Collision layer.
 *
 * Mirrors BrushTool's drag-stroke pattern: pointerdown captures the
 * start world position; pointerup dispatches a single
 * {@link PlaceColliderCommand} with the bounding box of the drag.
 * A click without drag places a default-tile-sized box at the click
 * point so the tool is never a no-op.
 *
 * Pan-vs-place arbitration: Space+left defers to camera, same as
 * every other tool. Only box colliders are supported in v0.1; circle
 * and polygon land with the collision editor extension.
 *
 * v0.1 doesn't support collider removal from the canvas (no
 * selection model yet). Use Undo (Ctrl+Z) to revert.
 *
 * Step 24: implements {@link Tool}.
 */

import { commandBus } from '@core/command/commandBusSingleton';
import { t as ti18n } from '@core/i18n';
import { placeCollider } from '@editor/map/commands/index';
import { MIN_BOX_SIZE } from '@shared/constants/index';
import { screenToWorld } from '@shared/math/index';
import { useDocumentStore } from '@state/documentStore';
import { useToolStore } from '@state/toolStore';
import { useViewStore } from '@state/viewStore';
import { log } from '@systems/diagnostics';

import type { BoxCollider } from '@editor/map/schema/collider';
import type { LayerId } from '@editor/map/schema/ids';
import type { Tool } from '@shared/tool/Tool';

export class ColliderTool implements Tool {
  readonly id = 'collider';
  readonly labelKey = 'toolbar.tool.collider';

  private canvas: HTMLCanvasElement | null = null;

  private spacePressed = false;

  private startWorld: { x: number; y: number } | null = null;
  private lastWorld: { x: number; y: number } | null = null;
  /** Monotonically increasing suffix so auto-names don't collide. */
  private placementCounter = 0;

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
    this.startWorld = null;
    this.lastWorld = null;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.isActive()) return;
    if (event.button !== 0) return;
    if (this.spacePressed) return;
    if (!this.canvas) return;
    const layer = this.activeCollisionLayer();
    if (!layer) return;
    const world = this.eventToWorld(event);
    if (!world) return;

    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    this.startWorld = world;
    this.lastWorld = world;
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.isActive()) return;
    if (this.startWorld === null) return;
    const world = this.eventToWorld(event);
    if (!world) return;
    this.lastWorld = world;
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.startWorld === null) return;
    if (this.canvas?.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    const layer = this.activeCollisionLayer();
    const start = this.startWorld;
    const end = this.lastWorld ?? start;
    this.startWorld = null;
    this.lastWorld = null;
    if (!layer) return;

    const box = buildBox(start, end, this.tileSizeOrDefault());
    if (box.size.width < MIN_BOX_SIZE || box.size.height < MIN_BOX_SIZE) return;

    this.place(layer.id, box);
  };

  private readonly onPointerLeave = (): void => {
    this.startWorld = null;
    this.lastWorld = null;
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
    return useToolStore.getState().activeToolId === 'collider';
  }

  private activeCollisionLayer() {
    const doc = useDocumentStore.getState();
    const layer = doc.layers.find((l) => l.id === doc.activeLayerId);
    if (!layer || layer.type !== 'collision' || layer.locked) return null;
    return layer;
  }

  private eventToWorld(event: PointerEvent): { x: number; y: number } | null {
    const canvas = this.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const world = screenToWorld(screen, useViewStore.getState());
    const doc = useDocumentStore.getState();
    if (world.x < 0 || world.y < 0) return null;
    if (world.x >= doc.meta.mapSize.width || world.y >= doc.meta.mapSize.height) return null;
    return world;
  }

  private tileSizeOrDefault(): number {
    const tileSize = useDocumentStore.getState().meta.tileSize;
    return tileSize > 0 ? tileSize : 32;
  }

  private place(layerId: LayerId, fields: Omit<BoxCollider, 'id'>): void {
    this.placementCounter += 1;
    const name = `Solid ${this.placementCounter}`;
    const cmd = placeCollider(layerId, { ...fields, name });
    commandBus.execute(cmd);
    log.info(
      ti18n('console.colliderPlaced', {
        x: Math.round(fields.position.x),
        y: Math.round(fields.position.y),
        w: Math.round(fields.size.width),
        h: Math.round(fields.size.height),
      }),
    );
  }
}

const buildBox = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  defaultSize: number,
): Omit<BoxCollider, 'id'> => {
  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxX = Math.max(start.x, end.x);
  const maxY = Math.max(start.y, end.y);
  const dragged = maxX - minX >= MIN_BOX_SIZE && maxY - minY >= MIN_BOX_SIZE;
  const width = dragged ? maxX - minX : defaultSize;
  const height = dragged ? maxY - minY : defaultSize;
  const x = dragged ? minX : start.x;
  const y = dragged ? minY : start.y;
  return {
    type: 'box',
    kind: 'solid',
    name: '',
    position: { x, y },
    size: { width, height },
    rotation: 0,
    properties: { entries: new Map() },
  };
};