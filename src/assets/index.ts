/**
 * Asset management.
 *
 * Loading, caching, and metadata for project assets (images, tilesets,
 * audio). Files are referenced by URL/path; assets themselves are
 * not inlined into the Document schema.
 *
 * Step 30 hosts the first real loader: builtin tileset sheets are
 * preloaded through Pixi's `Assets` and sliced into per-tile textures
 * (see `tilesetTextureCache.ts`). Workspace-imported assets (the
 * workspace `assets/` folder) land with the asset-import step.
 */

export { preloadBuiltinTilesets, textureFor } from './tilesetTextureCache';
