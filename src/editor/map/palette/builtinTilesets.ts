/**
 * Built-in tilesets — Sprout Lands terrain basics (Step 30a).
 *
 * Every Sprout Lands sheet is a packed 16×16 grid (spacing 0, margin 0);
 * only the image dimensions vary, so each entry carries them explicitly —
 * the PNG header cannot be read before the texture loads, and the grid
 * must be derivable synchronously (palette UI, texture slicing).
 *
 * URLs come from Vite asset imports: small PNGs inline as data URLs at
 * build time (see `vite.config.ts` `assetsInlineLimit`), which keeps the
 * packaged Electron app working over file://. Documents store only the
 * tileset id — built-in assets ship with the app, not with the document.
 *
 * Credit: "Sprout Lands — Sprite pack (Basic)" by Eric Bernier, free pack.
 */

import grassImageUrl from '@assets/tilesets/sprout-lands/grass.png';
import hillsImageUrl from '@assets/tilesets/sprout-lands/hills.png';
import tilledDirtImageUrl from '@assets/tilesets/sprout-lands/tilled-dirt.png';
import waterImageUrl from '@assets/tilesets/sprout-lands/water.png';
import { asTilesetId } from '@editor/map/schema/ids';

import { tilesetGrid } from './tileGrid';

import type { AssetRef } from '@editor/map/schema/asset';
import type { TilesetId } from '@editor/map/schema/ids';
import type { Tileset } from '@editor/map/schema/tileset';

/** Grid parameters shared by every Sprout Lands sheet: packed 16×16 tiles. */
const SPROUT_LAYOUT = { tileWidth: 16, tileHeight: 16, spacing: 0, margin: 0 } as const;

interface BuiltinTilesetInput {
  readonly id: string;
  readonly name: string;
  readonly imageUrl: string;
  /** Source image size in pixels — input for {@link tilesetGrid}. */
  readonly imageWidth: number;
  readonly imageHeight: number;
}

const defineTileset = (input: BuiltinTilesetInput): Tileset => {
  const grid = tilesetGrid(SPROUT_LAYOUT, input.imageWidth, input.imageHeight);
  return {
    id: asTilesetId(input.id),
    name: input.name,
    image: { kind: 'image', path: input.imageUrl } satisfies AssetRef,
    tileWidth: SPROUT_LAYOUT.tileWidth,
    tileHeight: SPROUT_LAYOUT.tileHeight,
    spacing: SPROUT_LAYOUT.spacing,
    margin: SPROUT_LAYOUT.margin,
    columns: grid.columns,
    tileCount: grid.tileCount,
    tileProperties: new Map(),
    properties: { entries: new Map() },
  };
};

export const BUILTIN_TILESETS: ReadonlyArray<Tileset> = [
  defineTileset({
    id: 'sprout.grass',
    name: 'Grass',
    imageUrl: grassImageUrl,
    imageWidth: 176,
    imageHeight: 112,
  }),
  defineTileset({
    id: 'sprout.hills',
    name: 'Hills',
    imageUrl: hillsImageUrl,
    imageWidth: 176,
    imageHeight: 144,
  }),
  defineTileset({
    id: 'sprout.tilled-dirt',
    name: 'Tilled Dirt',
    imageUrl: tilledDirtImageUrl,
    imageWidth: 176,
    imageHeight: 112,
  }),
  defineTileset({
    id: 'sprout.water',
    name: 'Water',
    imageUrl: waterImageUrl,
    imageWidth: 64,
    imageHeight: 16,
  }),
];

const TILESET_BY_ID = new Map<TilesetId, Tileset>(
  BUILTIN_TILESETS.map((tileset) => [tileset.id, tileset]),
);

export const getBuiltinTileset = (id: TilesetId): Tileset | undefined =>
  TILESET_BY_ID.get(id);
