/**
 * EntityTool — click on the canvas to place an entity on the active
 * Object layer.
 *
 * Mirrors BrushTool's input lifecycle: pointerdown places one entity
 * at the cursor's world position. Unlike BrushTool there is no
 * drag-stroke — the entity is anchored to the click point and a
 * second click starts a fresh entity.
 *
 * Pan-vs-place arbitration: Space+left defers to camera, same as
 * every other tool.
 *
 * The active entity type is read from `entityStore`. The active
 * layer must be an Object layer; if it's not (or the layer is
 * locked) the click is silently ignored so users can't shoot
 * themselves in the foot.
 *
 * v0.1 doesn't support entity removal from the canvas (no selection
 * hit-test yet). Removal lands with Step 19 (PropertiesPanel real
 * data) which adds the entity selection model. Use Undo (Ctrl+Z)
 * to revert a misplaced entity.
 */

import { commandBus } from '@core/command/commandBusSingleton';
import { t as ti18n } from '@core/i18n';
import { placeEntity } from '@editor/map/commands/index';
import { getEntityType } from '@editor/map/palette/defaultEntityTypes';
import { screenToWorld } from '@shared/math/index';
import { useDocumentStore } from '@state/documentStore';
import { useEntityStore } from '@state/entityStore';
import { useToolStore } from '@state/toolStore';
import { useViewStore } from '@state/viewStore';
import { log } from '@systems/diagnostics';

import type { Entity } from '@editor/map/schema/entity';
import type { LayerId } from '@editor/map/schema/ids';

export class EntityTool {
  private readonly canvas: HTMLCanvasElement;
  private spacePressed = false;

  /** Monotonically increasing suffix so auto-names don't collide. */
  private placementCounter = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.isActive()) return;
    if (event.button !== 0) return;
    if (this.spacePressed) return;

    const layer = this.activeObjectLayer();
    if (!layer) return;

    const world = this.eventToWorld(event);
    if (!world) return;

    event.preventDefault();
    this.place(layer.id, world.x, world.y);
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
    return useToolStore.getState().activeToolId === 'entity';
  }

  private activeObjectLayer() {
    const doc = useDocumentStore.getState();
    const layer = doc.layers.find((l) => l.id === doc.activeLayerId);
    if (!layer || layer.type !== 'object' || layer.locked) return null;
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

  private place(layerId: LayerId, worldX: number, worldY: number): void {
    const typeId = useEntityStore.getState().activeEntityType;
    const def = getEntityType(typeId);
    this.placementCounter += 1;
    const name = `${def.defaultName} ${this.placementCounter}`;
    // Center the entity on the click point.
    const position = {
      x: worldX - def.defaultSize.width / 2,
      y: worldY - def.defaultSize.height / 2,
    };
    const fields: Omit<Entity, 'id'> = {
      type: typeId,
      name,
      position,
      size: def.defaultSize,
      rotation: 0,
      properties: { entries: new Map() },
    };
    const cmd = placeEntity(layerId, fields);
    commandBus.execute(cmd);
    log.info(
      ti18n('console.entityPlaced', {
        name,
        x: Math.round(position.x),
        y: Math.round(position.y),
      }),
    );
  }
}
