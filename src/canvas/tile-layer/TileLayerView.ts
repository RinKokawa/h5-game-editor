/**
 * TileLayerView — renders all visible TileLayers in document order,
 * incrementally.
 *
 * Step 23 replaces the "rebuild everything on change" model with a
 * sprite map (`Map<TileCoordKey, Sprite>` per layer). Sprites
 * added/removed/changed are mutated in place via
 * {@link diffTileSprites}; unchanged cells are skipped entirely.
 *
 * The base class still owns container lifecycle, rAF debouncing,
 * and drop/add/reorder (see {@link LayerView}). This subclass owns
 * per-layer sprite pools and the no-op skipping logic that decides
 * between "skip" and "diff".
 */

import { Sprite, Texture } from 'pixi.js';

import { LayerView } from '@canvas/layers/LayerView';
import { colorForTileId } from '@editor/map/palette/defaultPalette';
import { decodeTileCoord } from '@editor/map/schema/tile';
import { useDocumentStore } from '@state/documentStore';


import type { LayerNode } from '@canvas/layers/LayerView';
import type { LayerId, TileCoordKey } from '@editor/map/schema/ids';
import type { TileLayer } from '@editor/map/schema/layer';
import type { PlacedTile } from '@editor/map/schema/tile';
import type { Container} from 'pixi.js';

interface LayerSnapshot {
  readonly tiles: ReadonlyMap<TileCoordKey, PlacedTile>;
  readonly tileSize: number;
}

export class TileLayerView extends LayerView<TileLayer> {
  private readonly snapshots = new Map<LayerId, LayerSnapshot>();
  private readonly sprites = new Map<LayerId, Map<TileCoordKey, Sprite>>();

  protected override subscribeToSource(): () => void {
    return useDocumentStore.subscribe(() => this.scheduleRender());
  }

  protected override filterLayer = (l: { type: string }): l is TileLayer => l.type === 'tile';

  protected override renderNode(node: LayerNode, layer: TileLayer): void {
    const ts = tileSize();
    const prev = this.snapshots.get(layer.id);
    const next = layer.data.tiles;

    if (prev && prev.tileSize === ts && tilesEqual(prev.tiles, next)) {
      return; // no-op
    }

    let spritesForLayer = this.sprites.get(layer.id);
    if (!spritesForLayer) {
      spritesForLayer = new Map();
      this.sprites.set(layer.id, spritesForLayer);
    }

    diffTileSprites({
      container: node.container,
      sprites: spritesForLayer,
      prev: prev?.tiles,
      next,
      tileSize: ts,
    });

    this.snapshots.set(layer.id, { tiles: next, tileSize: ts });
  }

  override destroy(): void {
    super.destroy();
    this.snapshots.clear();
    this.sprites.clear();
  }
}

const tileSize = (): number => useDocumentStore.getState().meta.tileSize;

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

/**
 * Apply a tile-layer diff: drop removed sprites, create new sprites,
 * and mutate changed sprites in place. Exported for tests.
 */
export const diffTileSprites = (params: {
  readonly container: Container;
  readonly sprites: Map<TileCoordKey, Sprite>;
  readonly prev: ReadonlyMap<TileCoordKey, PlacedTile> | undefined;
  readonly next: ReadonlyMap<TileCoordKey, PlacedTile>;
  readonly tileSize: number;
}): void => {
  const { container, sprites, prev, next, tileSize } = params;

  // 1. Remove tiles that no longer exist.
  if (prev) {
    for (const key of prev.keys()) {
      if (!next.has(key)) {
        const sprite = sprites.get(key);
        if (sprite) {
          sprite.destroy();
          sprites.delete(key);
        }
      }
    }
  }

  // 2. Add new + mutate changed.
  for (const [key, placed] of next) {
    const existing = sprites.get(key);
    if (!existing) {
      const fresh = makeTileSprite(key, placed, tileSize);
      sprites.set(key, fresh);
      container.addChild(fresh);
      continue;
    }
    mutateTileSprite(existing, key, placed, tileSize);
  }
};

const makeTileSprite = (key: TileCoordKey, placed: PlacedTile, tileSize: number): Sprite => {
  const coord = decodeTileCoord(key);
  const sprite = new Sprite(Texture.WHITE);
  applyPlacement(sprite, coord, placed, tileSize);
  return sprite;
};

const mutateTileSprite = (
  sprite: Sprite,
  key: TileCoordKey,
  placed: PlacedTile,
  tileSize: number,
): void => {
  const coord = decodeTileCoord(key);
  applyPlacement(sprite, coord, placed, tileSize);
};

const applyPlacement = (
  sprite: Sprite,
  coord: { x: number; y: number },
  placed: PlacedTile,
  tileSize: number,
): void => {
  sprite.tint = colorForTileId(placed.tileId);
  sprite.width = tileSize;
  sprite.height = tileSize;
  sprite.x = coord.x * tileSize;
  sprite.y = coord.y * tileSize;
};
