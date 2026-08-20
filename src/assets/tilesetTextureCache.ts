/**
 * Tileset texture cache — load once, slice per tile.
 *
 * `preloadBuiltinTilesets` loads every builtin sheet through Pixi's
 * `Assets` (dev: http URL from Vite, prod: inlined data URL — see
 * `vite.config.ts` `assetsInlineLimit`) and slices it into one `Texture`
 * per grid cell using the pure rect math from
 * `@editor/map/palette/tileGrid`. `textureFor` then resolves a
 * `(tilesetId, tileId)` pair synchronously — the renderer never awaits.
 *
 * Nearest-neighbour sampling keeps the 16px art crisp at tileSize 32.
 * The cache is module-lifetime: views never destroy these textures
 * (LayerView teardown destroys sprites, not textures), so a StrictMode
 * double mount reuses the first mount's slices.
 */

import { Assets, Rectangle, Texture } from 'pixi.js';

import { BUILTIN_TILESETS } from '@editor/map/palette/builtinTilesets';
import { tileFrameRect } from '@editor/map/palette/tileGrid';

import type { TileId, TilesetId } from '@editor/map/schema/ids';
import type { Tileset } from '@editor/map/schema/tileset';

const texturesByTileset = new Map<TilesetId, ReadonlyArray<Texture>>();

let preloadPromise: Promise<void> | null = null;

const loadTilesetTextures = async (tileset: Tileset): Promise<ReadonlyArray<Texture>> => {
  const base = await Assets.load<Texture>(tileset.image.path);
  base.source.scaleMode = 'nearest';
  const frames: Texture[] = [];
  for (let index = 0; index < tileset.tileCount; index++) {
    const rect = tileFrameRect(tileset, index);
    frames.push(
      new Texture({
        source: base.source,
        frame: new Rectangle(rect.x, rect.y, rect.width, rect.height),
      }),
    );
  }
  return frames;
};

/**
 * Load (once) every builtin tileset sheet. Failures are logged and
 * swallowed — a sheet that cannot load renders with the fallback tint
 * instead of crashing the editor boot.
 */
export const preloadBuiltinTilesets = (): Promise<void> => {
  preloadPromise ??= (async () => {
    await Promise.all(
      BUILTIN_TILESETS.map(async (tileset) => {
        try {
          texturesByTileset.set(tileset.id, await loadTilesetTextures(tileset));
        } catch (error) {
          console.error(`[assets] tileset ${tileset.id} failed to load`, error);
        }
      }),
    );
  })();
  return preloadPromise;
};

/**
 * Resolve the sliced texture for one tile. `null` when the tileset is
 * unknown (e.g. a `placeholder.tileset` entry from a pre-Step-30
 * document) or not yet loaded — callers render a fallback cell.
 */
export const textureFor = (tilesetId: TilesetId, tileId: TileId): Texture | null => {
  const frames = texturesByTileset.get(tilesetId);
  if (!frames) return null;
  return frames[tileId as number] ?? null;
};
