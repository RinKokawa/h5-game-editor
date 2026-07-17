/**
 * ObjectLayerView — renders all visible ObjectLayers in document order.
 *
 * Extends {@link LayerView}: a `Container` per ObjectLayer, rebuilt on
 * a rAF debounce. Each entity is a tinted white rectangle sized to
 * `entity.size` with a thin outline so adjacent entities are visually
 * distinct. Rotation is not honored in v0.1 — entities render axis-
 * aligned. A real sprite swap lands with the entity-renderer extension
 * in a later step.
 */

import { Graphics } from 'pixi.js';

import { LayerView } from '@canvas/layers/LayerView';
import { colorForEntityType } from '@editor/map/palette/defaultEntityTypes';
import { useDocumentStore } from '@state/documentStore';


import type { LayerNode } from '@canvas/layers/LayerView';
import type { Entity } from '@editor/map/schema/entity';
import type { EntityId, LayerId } from '@editor/map/schema/ids';
import type { ObjectLayer } from '@editor/map/schema/layer';
import type { Container} from 'pixi.js';

export class ObjectLayerView extends LayerView<ObjectLayer> {
  private readonly orderSnapshots = new Map<LayerId, readonly EntityId[]>();

  protected override subscribeToSource(): () => void {
    return useDocumentStore.subscribe(() => this.scheduleRender());
  }

  protected override filterLayer = (l: { type: string }): l is ObjectLayer => l.type === 'object';

  protected override renderNode(node: LayerNode, layer: ObjectLayer): void {
    const prev = this.orderSnapshots.get(layer.id);
    if (prev && entityOrderEqual(prev, layer.data.entityOrder)) return;
    rebuildEntities(node.container, layer.data.entityOrder, useDocumentStore.getState().entities);
    this.orderSnapshots.set(layer.id, layer.data.entityOrder);
  }

  override destroy(): void {
    super.destroy();
    this.orderSnapshots.clear();
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
