/**
 * Built-in tileset registry — data-integrity tests.
 *
 * The registry is hand-maintained constants (image sizes are typed by
 * hand because PNG headers are unreadable before load). These tests pin
 * the derived grid against the real sheet dimensions so a typo in a
 * dimension fails loudly here, not as a broken palette in the editor.
 */

import { describe, expect, it } from 'vitest';

import { asTilesetId } from '@editor/map/schema/ids';

import { BUILTIN_TILESETS, getBuiltinTileset } from './builtinTilesets';

describe('BUILTIN_TILESETS', () => {
  it('has unique ids', () => {
    const ids = BUILTIN_TILESETS.map((tileset) => tileset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps the full grid math consistent for every entry', () => {
    for (const tileset of BUILTIN_TILESETS) {
      expect(tileset.tileWidth).toBe(16);
      expect(tileset.tileHeight).toBe(16);
      expect(tileset.spacing).toBe(0);
      expect(tileset.margin).toBe(0);
      expect(tileset.columns).toBeGreaterThan(0);
      expect(tileset.tileCount).toBeGreaterThan(0);
      // tileCount is derived via tilesetGrid — the invariant is column × row.
      expect(tileset.tileCount % tileset.columns).toBe(0);
    }
  });

  it('references a non-empty image URL per entry', () => {
    for (const tileset of BUILTIN_TILESETS) {
      expect(tileset.image.kind).toBe('image');
      expect(typeof tileset.image.path).toBe('string');
      expect(tileset.image.path.length).toBeGreaterThan(0);
    }
  });

  it('pins the expected grid of each sheet', () => {
    const expected: ReadonlyArray<readonly [string, number, number]> = [
      ['sprout.grass', 11, 77],
      ['sprout.hills', 11, 99],
      ['sprout.tilled-dirt', 11, 77],
      ['sprout.water', 4, 4],
    ];
    expect(BUILTIN_TILESETS.length).toBe(expected.length);
    for (const [id, columns, tileCount] of expected) {
      const tileset = getBuiltinTileset(asTilesetId(id));
      expect(tileset, `missing builtin tileset ${id}`).toBeDefined();
      expect(tileset?.columns).toBe(columns);
      expect(tileset?.tileCount).toBe(tileCount);
    }
  });

  it('looks up unknown ids to undefined', () => {
    expect(getBuiltinTileset(asTilesetId('sprout.unknown'))).toBeUndefined();
    expect(getBuiltinTileset(asTilesetId('placeholder.tileset'))).toBeUndefined();
  });
});
