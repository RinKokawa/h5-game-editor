/**
 * LayerView — base class for layer-kind-specific Pixi views.
 *
 * Three concrete subclasses — {@link TileLayerView},
 * {@link ObjectLayerView}, {@link CollisionLayerView} — share the
 * boilerplate: container lifecycle, rAF-debounced redraws, drop
 * stale per-layer nodes, add new ones, mutate visibility, and
 * reorder to match the document's layer array order.
 *
 * Step 22 introduces this base class so the three subclasses can
 * collapse to ~50–70 lines each. The base class deliberately keeps
 * the per-layer content diff state out of its scope — subclasses
 * own their own `Map<LayerId, TContentState>` and pass `(container,
 * layer)` callbacks to {@link renderNode}.
 *
 * Subscriptions live on the base class too: subclasses override
 * {@link subscribeToSource} (typically a single
 * `useDocumentStore.subscribe` call) and the base class wires up
 * unsubscription on {@link destroy}.
 */

import { Container } from 'pixi.js';

import { useDocumentStore } from '@state/documentStore';

import type { LayerId } from '@editor/map/schema/ids';
import type { Layer } from '@editor/map/schema/layer';

/**
 * Per-layer rendering target — a Pixi `Container` nested inside the
 * view's main container. Subclasses own their own `TContentState`
 * side tables to drive no-op skipping.
 */
export interface LayerNode {
  readonly container: Container;
}

export abstract class LayerView<TLayer extends Layer> {
  readonly container: Container;
  private readonly layerNodes: Map<LayerId, LayerNode> = new Map();
  private unsubscribes: Array<() => void> = [];
  private rafId: number | null = null;
  private destroyed = false;

  constructor(parent: Container) {
    this.container = new Container();
    this.container.eventMode = 'none';
    parent.addChild(this.container);

    const unsubscribe = this.subscribeToSource();
    if (unsubscribe) this.unsubscribes.push(unsubscribe);
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

  // ── subclass surface ──────────────────────────────────────────────────

  /**
   * Subscribe to whatever data source drives the view. Almost always
   * `useDocumentStore.subscribe`. Return the unsubscribe function so
   * the base class can clean up on {@link destroy}.
   */
  protected abstract subscribeToSource(): () => void;

  /** Which `Layer` kind this view handles. */
  protected abstract filterLayer(l: Layer): l is TLayer;

  /**
   * Apply `layer`'s current content to the per-layer node's
   * container. Subclasses own their content diff state in a side
   * `Map<LayerId, TContentState>` and decide whether to mutate or
   * rebuild children.
   */
  protected abstract renderNode(node: LayerNode, layer: TLayer): void;

  /**
   * Schedule a redraw at the next animation frame. Subclasses
   * call this from inside the `subscribeToSource` callback so they
   * never have to touch the rAF bookkeeping directly.
   */
  protected scheduleRender(): void {
    if (this.destroyed || this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.render();
    });
  }

  // ── internals ────────────────────────────────────────────────────────

  private render(): void {
    if (this.destroyed) return;
    const { layers } = useDocumentStore.getState();
    // Arrow wrapper so subclasses can override `filterLayer` as a
    // class-property arrow function (and the lint rule doesn't flag
    // `this` rebinding from a bare method reference).
    const visibleLayers = layers.filter((l): l is TLayer => this.filterLayer(l));

    // 1. Drop sub-containers for layers that no longer exist.
    const incomingIds = new Set(visibleLayers.map((l) => l.id));
    for (const [id, node] of this.layerNodes) {
      if (!incomingIds.has(id)) {
        node.container.destroy({ children: true });
        this.layerNodes.delete(id);
      }
    }

    // 2. Add new layers, mutate existing ones.
    for (const layer of visibleLayers) {
      let node = this.layerNodes.get(layer.id);
      if (!node) {
        const c = new Container();
        c.eventMode = 'none';
        this.container.addChild(c);
        node = { container: c };
        this.layerNodes.set(layer.id, node);
      }
      if (node.container.visible !== layer.visible) {
        node.container.visible = layer.visible;
      }
      this.renderNode(node, layer);
    }

    // 3. Reorder children so layers[0] ends up on top.
    for (let i = 0; i < visibleLayers.length; i++) {
      const layer = visibleLayers[i];
      if (!layer) continue;
      const node = this.layerNodes.get(layer.id);
      if (!node) continue;
      if (this.container.getChildIndex(node.container) !== i) {
        // Pixi v8: addChildAt reparents in place.
        this.container.addChildAt(node.container, i);
      }
    }
  }
}
