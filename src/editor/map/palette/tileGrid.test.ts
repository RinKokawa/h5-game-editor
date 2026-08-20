/**
 * Tileset-grid math — pure function tests.
 *
 * Locks the Tiled-convention formulas (spacing trails every tile except
 * the last, margin insets both edges) and the "must tile exactly" guard:
 * a partial row/column means wrong parameters, not fewer tiles.
 */

import { describe, expect, it } from 'vitest';

import { tileFrameRect, tilesetGrid } from './tileGrid';

const PACKED_16 = { tileWidth: 16, tileHeight: 16, spacing: 0, margin: 0 } as const;

describe('tilesetGrid', () => {
  it('derives the grid of a packed Sprout-Lands-sized sheet (176×112)', () => {
    expect(tilesetGrid(PACKED_16, 176, 112)).toEqual({
      columns: 11,
      rows: 7,
      tileCount: 77,
    });
  });

  it('derives the grid of a single-row sheet (64×16)', () => {
    expect(tilesetGrid(PACKED_16, 64, 16)).toEqual({ columns: 4, rows: 1, tileCount: 4 });
  });

  it('applies spacing and margin per the Tiled convention', () => {
    // 2 tiles + 1 gap + 2×2px margins = 37×20 for a 16×16 grid.
    const layout = { tileWidth: 16, tileHeight: 16, spacing: 1, margin: 2 } as const;
    expect(tilesetGrid(layout, 37, 20)).toEqual({ columns: 2, rows: 1, tileCount: 2 });
  });

  it('throws when the image leaves a partial column', () => {
    expect(() => tilesetGrid(PACKED_16, 100, 48)).toThrow('does not tile exactly');
  });

  it('throws when the image leaves a partial row', () => {
    expect(() => tilesetGrid(PACKED_16, 64, 24)).toThrow('does not tile exactly');
  });

  it('throws on non-positive tile size', () => {
    expect(() =>
      tilesetGrid({ tileWidth: 0, tileHeight: 16, spacing: 0, margin: 0 }, 64, 16),
    ).toThrow('positive');
  });

  it('throws on negative spacing or margin', () => {
    expect(() =>
      tilesetGrid({ tileWidth: 16, tileHeight: 16, spacing: -1, margin: 0 }, 64, 16),
    ).toThrow('non-negative');
  });

  it('throws when margins swallow the image', () => {
    expect(() =>
      tilesetGrid({ tileWidth: 16, tileHeight: 16, spacing: 0, margin: 10 }, 16, 16),
    ).toThrow('smaller than');
  });
});

describe('tileFrameRect', () => {
  it('returns the origin rect for index 0', () => {
    expect(tileFrameRect({ ...PACKED_16, columns: 11, tileCount: 77 }, 0)).toEqual({
      x: 0,
      y: 0,
      width: 16,
      height: 16,
    });
  });

  it('walks row-major and wraps at columns', () => {
    const spec = { ...PACKED_16, columns: 11, tileCount: 77 };
    // Index 11 is the first tile of the second row.
    expect(tileFrameRect(spec, 11)).toEqual({ x: 0, y: 16, width: 16, height: 16 });
    // The last tile sits at the far end of the last row.
    expect(tileFrameRect(spec, 76)).toEqual({ x: 160, y: 96, width: 16, height: 16 });
  });

  it('offsets by margin and spacing', () => {
    const spec = { tileWidth: 16, tileHeight: 16, spacing: 1, margin: 2, columns: 2, tileCount: 2 };
    expect(tileFrameRect(spec, 0)).toEqual({ x: 2, y: 2, width: 16, height: 16 });
    expect(tileFrameRect(spec, 1)).toEqual({ x: 19, y: 2, width: 16, height: 16 });
  });

  it('throws on out-of-range indices', () => {
    const spec = { ...PACKED_16, columns: 4, tileCount: 4 };
    expect(() => tileFrameRect(spec, -1)).toThrow('out of range');
    expect(() => tileFrameRect(spec, 4)).toThrow('out of range');
    expect(() => tileFrameRect(spec, 1.5)).toThrow('out of range');
  });
});
