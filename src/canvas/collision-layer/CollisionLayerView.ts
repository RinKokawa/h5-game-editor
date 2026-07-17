/**
 * CollisionLayerView — renders all visible CollisionLayers in
 * document order.
 *
 * Extends {@link LayerView}: a `Container` per CollisionLayer, rebuilt
 * on a rAF debounce. Each `box` collider is a stroked rectangle;
 * circle and polygon shapes are skipped in v0.1 (the schema supports
 * them but the user can only place boxes via the Collider tool).
 */

import { Graphics } from 'pixi.js';

import { LayerView } from '@canvas/layers/LayerView';
import { useDocumentStore } from '@state/documentStore';


import type { LayerNode } from '@canvas/layers/LayerView';
import type { Collider } from '@editor/map/schema/collider';
import type { ColliderId, LayerId } from '@editor/map/schema/ids';
import type { CollisionLayer } from '@editor/map/schema/layer';
import type { Container} from 'pixi.js';

export class CollisionLayerView extends LayerView<CollisionLayer> {
  private readonly orderSnapshots = new Map<LayerId, readonly ColliderId[]>();

  protected override subscribeToSource(): () => void {
    return useDocumentStore.subscribe(() => this.scheduleRender());
  }

  protected override filterLayer = (l: { type: string }): l is CollisionLayer =>
    l.type === 'collision';

  protected override renderNode(node: LayerNode, layer: CollisionLayer): void {
    const prev = this.orderSnapshots.get(layer.id);
    if (prev && colliderOrderEqual(prev, layer.data.colliderOrder)) return;
    rebuildColliders(node.container, layer.data.colliderOrder, useDocumentStore.getState().colliders);
    this.orderSnapshots.set(layer.id, layer.data.colliderOrder);
  }

  override destroy(): void {
    super.destroy();
    this.orderSnapshots.clear();
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
