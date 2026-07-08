/**
 * ObjectLayerView — renders all visible ObjectLayers in document order.
 *
 * Mirrors {@link TileLayerView}'s structure: one Pixi `Container` per
 * ObjectLayer, re-built on a rAF debounce. Each entity is drawn as a
 * tinted white rectangle sized to its `size`, with a thin outline so
 * adjacent entities are visually distinct. Rotation is not honored in
 * v0.1 — entities render axis-aligned. A real sprite swap lands with
 * the entity-renderer extension in a later step.
 *
 * Order matches the layer's `entityOrder` so z-stacking within the
 * layer is preserved.
 */

import { Container, Graphics } from 'pixi.js';

import { colorForEntityType } from '@editor/map/palette/defaultEntityTypes';
import { useDocumentStore } from '@state/documentStore';

import type { Entity } from '@editor/map/schema/entity';
import type { EntityId, LayerId } from '@editor/map/schema/ids';
import type { Layer, ObjectLayer } from '@editor/map/schema/layer';

const isObjectLayer = (l: Layer): l is ObjectLayer => l.type === 'object';

interface LayerNode {
  readonly container: Container;
  lastEntityOrder: readonly EntityId[];
  lastVisible: boolean;
}

export class ObjectLayerView {
  readonly container: Container;

  private readonly layerNodes: Map<LayerId, LayerNode> = new Map();
  private unsubscribes: Array<() => void> = [];
  private rafId: number | null = null;
  private destroyed = false;

  constructor(parent: Container) {
    this.container = new Container();
    this.container.eventMode = 'none';

    parent.addChild(this.container);

    this.subscribeToStore();
    this.scheduleRender();
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
    for (const node of this.layerNodes.values()) {
      node.container.destroy({ children: true });
    }
    this.layerNodes.clear();
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }

  private subscribeToStore(): void {
    this.unsubscribes.push(useDocumentStore.subscribe(() => this.scheduleRender()));
  }

  private scheduleRender(): void {
    if (this.destroyed || this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.render();
    });
  }

  private render(): void {
    if (this.destroyed) return;

    const { layers, entities } = useDocumentStore.getState();
    const visibleObjectLayers = layers.filter(isObjectLayer);

    // 1. Drop sub-containers for layers that no longer exist.
    const incomingIds = new Set(visibleObjectLayers.map((l) => l.id));
    for (const [id, node] of this.layerNodes) {
      if (!incomingIds.has(id)) {
        node.container.destroy({ children: true });
        this.layerNodes.delete(id);
      }
    }

    // 2. Add new layers, update existing ones.
    for (const layer of visibleObjectLayers) {
      let node = this.layerNodes.get(layer.id);
      if (!node) {
        const c = new Container();
        c.eventMode = 'none';
        this.container.addChild(c);
        node = { container: c, lastEntityOrder: [], lastVisible: true };
        this.layerNodes.set(layer.id, node);
      }
      if (node.lastVisible !== layer.visible) {
        node.container.visible = layer.visible;
        node.lastVisible = layer.visible;
      }
      if (!entityOrderEqual(node.lastEntityOrder, layer.data.entityOrder)) {
        rebuildEntities(node.container, layer.data.entityOrder, entities);
        node.lastEntityOrder = layer.data.entityOrder;
      }
    }

    // 3. Re-order sub-containers to match layer array order.
    for (let i = 0; i < visibleObjectLayers.length; i++) {
      const layer = visibleObjectLayers[i];
      if (!layer) continue;
      const node = this.layerNodes.get(layer.id);
      if (!node) continue;
      if (this.container.getChildIndex(node.container) !== i) {
        this.container.addChildAt(node.container, i);
      }
    }
  }
}

const entityOrderEqual = (a: readonly EntityId[], b: readonly EntityId[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const rebuildEntities = (
  container: Container,
  order: readonly EntityId[],
  entities: ReadonlyMap<EntityId, Entity>,
): void => {
  for (const child of container.children) {
    child.destroy();
  }
  container.removeChildren();
  for (const id of order) {
    const entity = entities.get(id);
    if (!entity) continue;
    container.addChild(makeEntityGraphics(entity));
  }
};

const makeEntityGraphics = (entity: Entity): Graphics => {
  const g = new Graphics();
  const fill = colorForEntityType(entity.type);
  g.rect(0, 0, entity.size.width, entity.size.height).fill({ color: fill, alpha: 0.85 });
  g.rect(0, 0, entity.size.width, entity.size.height).stroke({
    color: 0x000000,
    width: 1,
    alpha: 0.4,
  });
  g.x = entity.position.x;
  g.y = entity.position.y;
  return g;
};
