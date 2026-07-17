/**
 * TileLayerView — diff rendering unit tests.
 *
 * Covers the three diff primitives in isolation: removed → sprite
 * destroyed, added → new sprite, changed → tint / position mutated
 * in place (no new sprite). Drives the public {@link diffTileSprites}
 * helper directly so we don't have to await rAF in tests.
 */

import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';


import { asTileId, asTilesetId } from '@editor/map/schema/ids';

import { diffTileSprites } from './TileLayerView';

import type { TileCoordKey } from '@editor/map/schema/ids';
import type { PlacedTile } from '@editor/map/schema/tile';
import type { Sprite } from 'pixi.js';

const placed = (id: number): PlacedTile => ({
  tilesetId: asTilesetId('placeholder'),
  tileId: asTileId(id),
  rotation: 0,
  flipX: false,
  flipY: false,
});

const makeContainer = (): Container => new Container();

describe('diffTileSprites', () => {
  it('adds sprites for every entry when prev is undefined (cold start)', () => {
    const container = makeContainer();
    const sprites = new Map<TileCoordKey, Sprite>();
    const next = new Map<TileCoordKey, PlacedTile>([
      ['0,0' as TileCoordKey, placed(1)],
      ['1,0' as TileCoordKey, placed(2)],
      ['0,1' as TileCoordKey, placed(3)],
    ]);
    diffTileSprites({ container, sprites, prev: undefined, next, tileSize: 32 });
    expect(sprites.size).toBe(3);
    expect(container.children.length).toBe(3);
  });

  it('keeps the same Sprite instance when nothing changed', () => {
    const container = makeContainer();
    const sprites = new Map<TileCoordKey, Sprite>();
    const next = new Map<TileCoordKey, PlacedTile>([['0,0' as TileCoordKey, placed(1)]]);
    diffTileSprites({ container, sprites, prev: undefined, next, tileSize: 32 });
    const before = sprites.get('0,0' as TileCoordKey);
    expect(before).toBeDefined();

    diffTileSprites({ container, sprites, prev: next, next, tileSize: 32 });
    const after = sprites.get('0,0' as TileCoordKey);
    expect(after).toBe(before);
    expect(sprites.size).toBe(1);
    expect(container.children.length).toBe(1);
  });

  it('adds a new Sprite when a new cell appears (does not recreate existing)', () => {
    const container = makeContainer();
    const sprites = new Map<TileCoordKey, Sprite>();
    const before = new Map<TileCoordKey, PlacedTile>([['0,0' as TileCoordKey, placed(1)]]) as ReadonlyMap<
      TileCoordKey,
      PlacedTile
    >;
    diffTileSprites({ container, sprites, prev: undefined, next: before, tileSize: 32 });
    const existing = sprites.get('0,0' as TileCoordKey);

    const after = new Map<TileCoordKey, PlacedTile>([
      ['0,0' as TileCoordKey, placed(1)],
      ['1,0' as TileCoordKey, placed(2)],
    ]);
    diffTileSprites({ container, sprites, prev: before, next: after, tileSize: 32 });

    expect(sprites.size).toBe(2);
    expect(sprites.get('0,0' as TileCoordKey)).toBe(existing);
    expect(sprites.get('1,0' as TileCoordKey)).toBeDefined();
    expect(container.children.length).toBe(2);
  });

  it('destroys the removed sprite and only that sprite', () => {
    const container = makeContainer();
    const sprites = new Map<TileCoordKey, Sprite>();
    const before = new Map<TileCoordKey, PlacedTile>([
      ['0,0' as TileCoordKey, placed(1)],
      ['1,0' as TileCoordKey, placed(2)],
    ]);
    diffTileSprites({ container, sprites, prev: undefined, next: before, tileSize: 32 });
    const survivor = sprites.get('1,0' as TileCoordKey);
    const doomed = sprites.get('0,0' as TileCoordKey);
    expect(doomed).toBeDefined();

    const after = new Map<TileCoordKey, PlacedTile>([['1,0' as TileCoordKey, placed(2)]]);
    diffTileSprites({ container, sprites, prev: before, next: after, tileSize: 32 });

    expect(sprites.size).toBe(1);
    expect(sprites.get('1,0' as TileCoordKey)).toBe(survivor);
    expect(doomed?.destroyed).toBe(true);
    expect(container.children.length).toBe(1);
  });

  it('mutates an existing Sprite in place when its content changes', () => {
    const container = makeContainer();
    const sprites = new Map<TileCoordKey, Sprite>();
    const before = new Map<TileCoordKey, PlacedTile>([['0,0' as TileCoordKey, placed(1)]]) as ReadonlyMap<
      TileCoordKey,
      PlacedTile
    >;
    diffTileSprites({ container, sprites, prev: undefined, next: before, tileSize: 32 });
    const initial = sprites.get('0,0' as TileCoordKey);
    const initialTints = initial?.tint;

    const after = new Map<TileCoordKey, PlacedTile>([['0,0' as TileCoordKey, placed(7)]]) as ReadonlyMap<
      TileCoordKey,
      PlacedTile
    >;
    diffTileSprites({ container, sprites, prev: before, next: after, tileSize: 32 });

    // Same instance, mutated tint.
    expect(sprites.get('0,0' as TileCoordKey)).toBe(initial);
    expect(sprites.size).toBe(1);
    expect(container.children.length).toBe(1);
    expect(initialTints).not.toBe(initial?.tint);
  });

  it('resizes existing sprites when tileSize changes', () => {
    const container = makeContainer();
    const sprites = new Map<TileCoordKey, Sprite>();
    const t = new Map<TileCoordKey, PlacedTile>([['0,0' as TileCoordKey, placed(1)]]);
    diffTileSprites({ container, sprites, prev: undefined, next: t, tileSize: 32 });
    const sprite = sprites.get('0,0' as TileCoordKey);
    expect(sprite?.width).toBe(32);
    diffTileSprites({ container, sprites, prev: t, next: t, tileSize: 64 });
    expect(sprite?.width).toBe(64);
    expect(sprites.size).toBe(1); // not recreated
  });
});
