/**
 * CollisionLayerView — renders all visible CollisionLayers in document order.
 *
 * Mirrors {@link ObjectLayerView}: one Pixi `Container` per
 * CollisionLayer, rebuilt on a rAF debounce. Each `box` collider is
 * drawn as a stroked rectangle; circle and polygon shapes are
 * skipped in v0.1 (the schema supports them but the user can only
 * place boxes via the Collider tool).
 *
 * Colliders render with a distinct visual style (dashed-feeling
 * outline + tinted fill) so collision geometry is visually separable
 * from object placement when both are visible.
 */

import { Container, Graphics } from 'pixi.js';

import { useDocumentStore } from '@state/documentStore';

import type { Collider } from '@editor/map/schema/collider';
import type { ColliderId, LayerId } from '@editor/map/schema/ids';
import type { CollisionLayer, Layer } from '@editor/map/schema/layer';

const isCollisionLayer = (l: Layer): l is CollisionLayer => l.type === 'collision';

interface LayerNode {
  readonly container: Container;
  lastColliderOrder: readonly ColliderId[];
  lastVisible: boolean;
}

export class CollisionLayerView {
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

    const { layers, colliders } = useDocumentStore.getState();
    const visibleCollisionLayers = layers.filter(isCollisionLayer);

    const incomingIds = new Set(visibleCollisionLayers.map((l) => l.id));
    for (const [id, node] of this.layerNodes) {
      if (!incomingIds.has(id)) {
        node.container.destroy({ children: true });
        this.layerNodes.delete(id);
      }
    }

    for (const layer of visibleCollisionLayers) {
      let node = this.layerNodes.get(layer.id);
      if (!node) {
        const c = new Container();
        c.eventMode = 'none';
        this.container.addChild(c);
        node = { container: c, lastColliderOrder: [], lastVisible: true };
        this.layerNodes.set(layer.id, node);
      }
      if (node.lastVisible !== layer.visible) {
        node.container.visible = layer.visible;
        node.lastVisible = layer.visible;
      }
      if (!colliderOrderEqual(node.lastColliderOrder, layer.data.colliderOrder)) {
        rebuildColliders(node.container, layer.data.colliderOrder, colliders);
        node.lastColliderOrder = layer.data.colliderOrder;
      }
    }

    for (let i = 0; i < visibleCollisionLayers.length; i++) {
      const layer = visibleCollisionLayers[i];
      if (!layer) continue;
      const node = this.layerNodes.get(layer.id);
      if (!node) continue;
      if (this.container.getChildIndex(node.container) !== i) {
        this.container.addChildAt(node.container, i);
      }
    }
  }
}

const colliderOrderEqual = (a: readonly ColliderId[], b: readonly ColliderId[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const rebuildColliders = (
  container: Container,
  order: readonly ColliderId[],
  colliders: ReadonlyMap<ColliderId, Collider>,
): void => {
  for (const child of container.children) {
    child.destroy();
  }
  container.removeChildren();
  for (const id of order) {
    const collider = colliders.get(id);
    if (!collider) continue;
    if (collider.type === 'box') {
      container.addChild(makeBoxColliderGraphics(collider));
    }
    // circle / polygon land with future steps.
  }
};

const FILL_BY_KIND: Record<Collider['kind'], number> = {
  solid: 0xc00000,
  trigger: 0x6c8eb3,
  platform: 0x82b366,
};

const makeBoxColliderGraphics = (collider: Collider & { type: 'box' }): Graphics => {
  const g = new Graphics();
  const fill = FILL_BY_KIND[collider.kind];
  g.rect(0, 0, collider.size.width, collider.size.height).fill({ color: fill, alpha: 0.25 });
  g.rect(0, 0, collider.size.width, collider.size.height).stroke({
    color: fill,
    width: 1,
    alpha: 0.9,
  });
  g.x = collider.position.x;
  g.y = collider.position.y;
  return g;
};
