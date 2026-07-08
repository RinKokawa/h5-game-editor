/**
 * SelectTool — click cells/entities/colliders to select them, drag
 * a marquee on Tile layers.
 *
 * Per-layer behavior:
 *   - Tile layer: existing tile selection (click → single-cell toggle,
 *     drag → marquee). Hover is captured for the single-cell overlay.
 *   - Object layer: topmost entity whose AABB contains the click is
 *     selected. Click in empty space clears.
 *   - Collision layer: topmost collider whose AABB contains the click
 *     is selected. Click in empty space clears.
 *
 * Click without drag selects the topmost thing at the cursor;
 * drag without movement (size === 1 in tile space) is still a toggle
 * in tile mode. Object/Collision layers don't have a marquee in v0.1;
 * multi-select will land with the selection extension step.
 *
 * Pan-vs-paint arbitration: Space+left defers to camera, same as every
 * other tool.
 *
 * Selection always targets the ACTIVE layer — entities/colliders on
 * non-active layers are unreachable here. Cross-layer selection
 * extension lands with the selection model (out of scope for v0.1).
 */

import { screenToWorld } from '@shared/math/index';
import { useDocumentStore } from '@state/documentStore';
import { useSelectionStore } from '@state/selectionStore';
import { useToolStore } from '@state/toolStore';
import { useViewStore } from '@state/viewStore';

import type { Collider } from '@editor/map/schema/collider';
import type { Entity } from '@editor/map/schema/entity';
import type { TileCoord } from '@editor/map/schema/geometry';
import type { ColliderId, EntityId } from '@editor/map/schema/ids';
import type { CollisionLayer, Layer, ObjectLayer, TileLayer } from '@editor/map/schema/layer';

export class SelectTool {
  private readonly canvas: HTMLCanvasElement;

  private spacePressed = false;
  private dragging = false;
  private lastPointerEvent: PointerEvent | null = null;
  /** Pointer-down world point, used for object/collision hit-tests. */
  private pointerDownWorld: { x: number; y: number } | null = null;

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
    this.lastPointerEvent = null;
    this.pointerDownWorld = null;
    useSelectionStore.getState().setHover(null);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.isActive()) return;
    if (event.button !== 0) return;
    if (this.spacePressed) return;
    const world = this.eventToWorld(event);
    if (!world) return;
    const layer = this.activeLayer();
    if (!layer) return;

    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    this.dragging = true;
    this.pointerDownWorld = world;

    if (layer.type === 'tile') {
      const coord = worldToTile(world, useDocumentStore.getState().tileSize);
      useSelectionStore.getState().beginMarquee(layer.id, coord);
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.isActive()) return;
    const world = this.eventToWorld(event);
    if (!world) return;
    this.lastPointerEvent = event;
    const doc = useDocumentStore.getState();
    useSelectionStore.getState().setHover(worldToTile(world, doc.tileSize));

    if (this.dragging) {
      const layer = this.activeLayer();
      if (layer?.type === 'tile') {
        useSelectionStore
          .getState()
          .updateMarquee(worldToTile(world, useDocumentStore.getState().tileSize));
      }
    }
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.isActive() || !this.dragging) return;
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    const down = this.pointerDownWorld;
    const up = this.lastPointerEvent ? this.eventToWorld(this.lastPointerEvent) : null;
    this.dragging = false;
    this.pointerDownWorld = null;

    const layer = this.activeLayer();
    if (!layer || !down || !up) return;
    const dx = up.x - down.x;
    const dy = up.y - down.y;
    const dragged = dx * dx + dy * dy > 4; // > 2px squared

    if (layer.type === 'tile') {
      if (dragged) {
        // Marquee path: endMarquee already populated selection.
        return;
      }
      // Click without drag → toggle the cell under the cursor.
      const doc = useDocumentStore.getState();
      const tileSize = doc.tileSize;
      const coord = worldToTile(down, tileSize);
      useSelectionStore.getState().toggleTileCell(layer.id, coord);
      return;
    }

    // Object / Collision: click-and-release picks the topmost entity
    // or collider under the cursor (or clears if empty).
    if (!dragged) {
      this.pickAt(layer, down);
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

  private activeLayer(): TileLayer | ObjectLayer | CollisionLayer | null {
    const doc = useDocumentStore.getState();
    const layer = doc.layers.find((l) => l.id === doc.activeLayerId);
    if (!layer) return null;
    if (layer.type !== 'tile' && layer.type !== 'object' && layer.type !== 'collision') {
      return null;
    }
    return layer;
  }

  private eventToWorld(event: PointerEvent): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const world = screenToWorld(screen, useViewStore.getState());
    const doc = useDocumentStore.getState();
    if (world.x < 0 || world.y < 0) return null;
    if (world.x >= doc.mapSize.width || world.y >= doc.mapSize.height) return null;
    return world;
  }

  /**
   * Pick the topmost entity/collider under `world` on `layer`, or clear
   * the selection if the click landed in empty space. Selection is set
   * by kind, not by `layer.type`.
   */
  private pickAt(layer: Layer, world: { x: number; y: number }): void {
    const doc = useDocumentStore.getState();
    if (layer.type === 'object') {
      const topId = topmostEntityAt(layer, world, doc.entities);
      if (topId) useSelectionStore.getState().setEntitySelection(topId, layer.id);
      else useSelectionStore.getState().clear();
    } else if (layer.type === 'collision') {
      const topId = topmostColliderAt(layer, world, doc.colliders);
      if (topId) useSelectionStore.getState().setColliderSelection(topId, layer.id);
      else useSelectionStore.getState().clear();
    }
  }
}

const worldToTile = (world: { x: number; y: number }, tileSize: number): TileCoord => ({
  x: Math.floor(world.x / tileSize),
  y: Math.floor(world.y / tileSize),
});

const topmostEntityAt = (
  layer: ObjectLayer,
  world: { x: number; y: number },
  entities: ReadonlyMap<EntityId, Entity>,
): EntityId | null => {
  const order = layer.data.entityOrder;
  // Honour draw order: later entries paint on top, so the visually
  // topmost entity is the LAST match in entityOrder.
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    if (!id) continue;
    const e = entities.get(id);
    if (!e) continue;
    if (
      world.x >= e.position.x &&
      world.x < e.position.x + e.size.width &&
      world.y >= e.position.y &&
      world.y < e.position.y + e.size.height
    ) {
      return id;
    }
  }
  return null;
};

const topmostColliderAt = (
  layer: CollisionLayer,
  world: { x: number; y: number },
  colliders: ReadonlyMap<ColliderId, Collider>,
): ColliderId | null => {
  const order = layer.data.colliderOrder;
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    if (!id) continue;
    const c = colliders.get(id);
    if (!c) continue;
    if (c.type === 'box') {
      if (
        world.x >= c.position.x &&
        world.x < c.position.x + c.size.width &&
        world.y >= c.position.y &&
        world.y < c.position.y + c.size.height
      ) {
        return id;
      }
    }
    // Circle / polygon AABB tests land with the collider editor.
  }
  return null;
};
