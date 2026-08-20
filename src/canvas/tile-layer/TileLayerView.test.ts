/**
 * TileLayerView — diff rendering unit tests.
 *
 * Covers the diff primitives in isolation: removed → sprite destroyed,
 * added → new sprite, changed → texture / tint / position mutated in
 * place (no new sprite). Drives the public {@link diffTileSprites}
 * helper directly so we don't have to await rAF in tests.
 *
 * Step 30: `textureFor` is stubbed with a per-test map so the texture
 * path, the placeholder tier, and the missing-texture tier are all
 * exercisable without Pixi's async asset loader.
 */

import { Container, Texture } from 'pixi.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { colorForTileId } from '@editor/map/palette/defaultPalette';
import { asTileId, asTilesetId } from '@editor/map/schema/ids';

import { diffTileSprites, placedEqual } from './TileLayerView';

import type { TileCoordKey } from '@editor/map/schema/ids';
import type { PlacedTile } from '@editor/map/schema/tile';
import type { Sprite } from 'pixi.js';

const textureStubs = vi.hoisted(() => new Map<string, Texture>());

vi.mock('@assets/tilesetTextureCache', () => ({
  textureFor: (tilesetId: string, tileId: number): Texture | null =>
    textureStubs.get(`${tilesetId}#${tileId}`) ?? null,
}));

const placed = (id: number, tilesetId = 'placeholder.tileset'): PlacedTile => ({
  tilesetId: asTilesetId(tilesetId),
  tileId: asTileId(id),
  rotation: 0,
  flipX: false,
  flipY: false,
});

const makeContainer = (): Container => new Container();

beforeEach(() => {
  textureStubs.clear();
});

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

  it('mutates the texture in place when a cell switches tileId', () => {
    const grassOne = new Texture();
    const grassSeven = new Texture();
    textureStubs.set('sprout.grass#1', grassOne);
    textureStubs.set('sprout.grass#7', grassSeven);

    const container = makeContainer();
    const sprites = new Map<TileCoordKey, Sprite>();
    const before = new Map<TileCoordKey, PlacedTile>([
      ['0,0' as TileCoordKey, placed(1, 'sprout.grass')],
    ]) as ReadonlyMap<TileCoordKey, PlacedTile>;
    diffTileSprites({ container, sprites, prev: undefined, next: before, tileSize: 32 });
    const initial = sprites.get('0,0' as TileCoordKey);
    expect(initial?.texture).toBe(grassOne);

    const after = new Map<TileCoordKey, PlacedTile>([
      ['0,0' as TileCoordKey, placed(7, 'sprout.grass')],
    ]) as ReadonlyMap<TileCoordKey, PlacedTile>;
    diffTileSprites({ container, sprites, prev: before, next: after, tileSize: 32 });

    // Same instance, swapped texture, no tint on the textured path.
    expect(sprites.get('0,0' as TileCoordKey)).toBe(initial);
    expect(sprites.size).toBe(1);
    expect(container.children.length).toBe(1);
    expect(initial?.texture).toBe(grassSeven);
    expect(initial?.tint).toBe(0xffffff);
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

  it('renders the cached texture untinted when one exists', () => {
    const grassOne = new Texture();
    textureStubs.set('sprout.grass#1', grassOne);

    const container = makeContainer();
    const sprites = new Map<TileCoordKey, Sprite>();
    const next = new Map<TileCoordKey, PlacedTile>([
      ['0,0' as TileCoordKey, placed(1, 'sprout.grass')],
    ]);
    diffTileSprites({ container, sprites, prev: undefined, next, tileSize: 32 });

    const sprite = sprites.get('0,0' as TileCoordKey);
    expect(sprite?.texture).toBe(grassOne);
    expect(sprite?.tint).toBe(0xffffff);
  });

  it('keeps the placeholder tint for placeholder.tileset cells', () => {
    const container = makeContainer();
    const sprites = new Map<TileCoordKey, Sprite>();
    const next = new Map<TileCoordKey, PlacedTile>([['0,0' as TileCoordKey, placed(1)]]);
    diffTileSprites({ container, sprites, prev: undefined, next, tileSize: 32 });

    const sprite = sprites.get('0,0' as TileCoordKey);
    expect(sprite?.texture).toBe(Texture.WHITE);
    expect(sprite?.tint).toBe(colorForTileId(asTileId(1)));
  });

  it('renders magenta for unknown tilesets', () => {
    const container = makeContainer();
    const sprites = new Map<TileCoordKey, Sprite>();
    const next = new Map<TileCoordKey, PlacedTile>([
      ['0,0' as TileCoordKey, placed(1, 'sprout.missing')],
    ]);
    diffTileSprites({ container, sprites, prev: undefined, next, tileSize: 32 });

    const sprite = sprites.get('0,0' as TileCoordKey);
    expect(sprite?.texture).toBe(Texture.WHITE);
    expect(sprite?.tint).toBe(0xff00ff);
  });
});

describe('placedEqual', () => {
  const base: PlacedTile = {
    tilesetId: asTilesetId('sprout.grass'),
    tileId: asTileId(1),
    rotation: 0,
    flipX: false,
    flipY: false,
  };

  it('is true for field-identical placements', () => {
    expect(placedEqual(base, { ...base })).toBe(true);
  });

  it('detects a tilesetId change with the same tileId', () => {
    expect(placedEqual(base, { ...base, tilesetId: asTilesetId('sprout.hills') })).toBe(false);
  });

  it('detects tileId, rotation, and flip changes', () => {
    expect(placedEqual(base, { ...base, tileId: asTileId(2) })).toBe(false);
    expect(placedEqual(base, { ...base, rotation: 90 })).toBe(false);
    expect(placedEqual(base, { ...base, flipX: true })).toBe(false);
    expect(placedEqual(base, { ...base, flipY: true })).toBe(false);
  });
});
