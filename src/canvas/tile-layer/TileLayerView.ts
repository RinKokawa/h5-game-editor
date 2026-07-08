/**
 * TileLayerView — renders all visible TileLayers in document order.
 *
 * Owns one Pixi `Container` attached to the world container, with one
 * sub-container per TileLayer (added in `layers[0]`-first order so the
 * array head ends up on top, per the Tiled-style convention). Hidden
 * layers' sub-containers are kept but `visible = false`.
 *
 * On every Document change the view diffs layer membership, reorders
 * children to match the new array order, rebuilds sprites inside any
 * changed layer, and updates visibility flags. ObjectLayer and
 * CollisionLayer entries are skipped — they get their own views in
 * later steps.
 */

import { Container, Sprite, Texture } from 'pixi.js';

import { colorForTileId } from '@editor/map/palette/defaultPalette';
import { decodeTileCoord } from '@editor/map/schema/tile';
import { useDocumentStore } from '@state/documentStore';

import type { LayerId, TileCoordKey } from '@editor/map/schema/ids';
import type { Layer, TileLayer } from '@editor/map/schema/layer';
import type { PlacedTile } from '@editor/map/schema/tile';

const isTileLayer = (l: Layer): l is TileLayer => l.type === 'tile';

interface LayerNode {
  readonly container: Container;
  /** Snapshot of placed-tile ids, used to skip no-op redraws. */
  lastTiles: ReadonlyMap<TileCoordKey, PlacedTile>;
  lastVisible: boolean;
}

export class TileLayerView {
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

    const { layers, tileSize } = useDocumentStore.getState();
    const visibleTileLayers = layers.filter(isTileLayer);

    // 1. Drop sub-containers for layers that no longer exist.
    const incomingIds = new Set(visibleTileLayers.map((l) => l.id));
    for (const [id, node] of this.layerNodes) {
      if (!incomingIds.has(id)) {
        node.container.destroy({ children: true });
        this.layerNodes.delete(id);
      }
    }

    // 2. Add new layers, update existing ones.
    for (const layer of visibleTileLayers) {
      let node = this.layerNodes.get(layer.id);
      if (!node) {
        const c = new Container();
        c.eventMode = 'none';
        this.container.addChild(c);
        node = { container: c, lastTiles: new Map(), lastVisible: true };
        this.layerNodes.set(layer.id, node);
      }
      if (node.lastVisible !== layer.visible) {
        node.container.visible = layer.visible;
        node.lastVisible = layer.visible;
      }
      if (!tilesEqual(node.lastTiles, layer.data.tiles)) {
        rebuildTiles(node.container, layer.data.tiles, tileSize);
        node.lastTiles = layer.data.tiles;
      }
    }

    // 3. Re-order sub-containers to match layer array order so layers[0]
    // ends up on top of the visual stack.
    for (let i = 0; i < visibleTileLayers.length; i++) {
      const layer = visibleTileLayers[i];
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

const tilesEqual = (
  a: ReadonlyMap<TileCoordKey, PlacedTile>,
  b: ReadonlyMap<TileCoordKey, PlacedTile>,
): boolean => {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const [key, placed] of a) {
    const other = b.get(key);
    if (!other || other.tileId !== placed.tileId) return false;
  }
  return true;
};

const rebuildTiles = (
  container: Container,
  tiles: ReadonlyMap<TileCoordKey, PlacedTile>,
  tileSize: number,
): void => {
  for (const child of container.children) {
    child.destroy();
  }
  container.removeChildren();
  for (const [key, placed] of tiles) {
    container.addChild(makeTileSprite(key, placed, tileSize));
  }
};

const makeTileSprite = (key: TileCoordKey, placed: PlacedTile, tileSize: number): Sprite => {
  const coord = decodeTileCoord(key);
  const sprite = new Sprite(Texture.WHITE);
  sprite.tint = colorForTileId(placed.tileId);
  sprite.width = tileSize;
  sprite.height = tileSize;
  sprite.x = coord.x * tileSize;
  sprite.y = coord.y * tileSize;
  return sprite;
};
