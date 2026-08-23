# 2026-08 · Renderer

> PixiJS 渲染层的演进：内置 tilesets、tileset 资产管线。

---

## Step 30 — Builtin tilesets (Sprout Lands) + 真实贴图 — 2026-08-20

**做了什么** — 分三个批准过的子 step（30a assets/registry、30b texture pipeline、30c brush/palette UI）。地图编辑器现在画真实像素艺术地形，不再是染色 placeholder。

**Step 30a — 内嵌 Sprout Lands terrain sheets + builtin tileset registry**

- 4 张地形 sheets（grass / hills / tilled dirt / water）从免费 "Sprout Lands — Basic" 包存在 `src/assets/tilesets/sprout-lands/`（ASCII 命名，从包里的 space/underscore 重复里 dedupe）。所有 sheets 是 16×16 grid（spacing 0, margin 0）。
- `editor/map/palette/tileGrid.ts` 装纯 Tiled 惯例的 grid 数学：`tilesetGrid` 从图像尺寸推导 columns/rows/tileCount 并拒绝半 grid；`tileFrameRect` 把 row-major 索引映射到像素矩形；`tilesetImageSize` 是反函数（palette 的 CSS sprite 用）。
- `editor/map/palette/builtinTilesets.ts` 实例化（之前死的）`Tileset` schema，id 为 `sprout.*`；`image.path` 带 Vite-imported PNG URL。文档只存 tileset id — builtin 跟应用走，不跟文档走。

**Step 30b — tile 渲染管线里真 tileset textures**

- `src/assets/tilesetTextureCache.ts` 是保留 `assets/` barrel 的第一位正式居民：`preloadBuiltinTilesets` 用 Pixi `Assets` 加载每张 sheet，按 cell 切一个 `Texture`（scaleMode nearest）；`textureFor(tilesetId, tileId)` 同步解析。`EditorShell` 在 `renderer.start` 和 view 构造之间 await 预加载。cache 是模块生命期 — `LayerView` teardown 销毁 sprite，不销毁 texture，StrictMode 重挂载复用切片。
- `TileLayerView.applyPlacement` 分配切出的 texture 并拉伸到 `meta.tileSize`（16px 美术 × tileSize 32）。两级兜底：`placeholder.tileset` cell（Step 30 前的文档）保留旧 placeholder tint；其他未知渲洋色。`tilesEqual` 升级成完整 `PlacedTile` 相等（`placedEqual`）— 旧 tileId-only 比较早于 per-tileset id namespace。
- `brushStore` 选择现在是 `(tilesetId, tileId)` 对；橡皮是保留 `'eraser'` tileset id（`isEraserSelection`）上的哨兵对，所以绝不会与真 tile 撞。`BrushTool` / `RectTool` 用 active tileset 放置，不用硬编码 `PLACEHOLDER_TILESET_ID`。

**Step 30c — brush/palette UI on builtin tilesets**

- `PalettePanel` 加了 tileset 下拉 + 每个 tile 一个 CSS sprite 缩略图 — 与 texture cache 同一 sheet URL、同一 grid 数学，面板和画布永远不会不一致。`defaultPalette.ts` 降级为 placeholder 兜底色表（`PLACEHOLDER_COLORS`）；`palette.entry.*` i18n keys 在三 bundle 里替换为 `palette.tileset.sprout.*` + `palette.eraser`。`AssetBrowserPanel` 列出 builtin sheets 含 tile 计数。
- `vite.config.ts` 抬升 `build.assetsInlineLimit`，bundled PNG 内联为 data URL — 打包应用通过 `file://` 加载 `dist/index.html`，绝对路径 `/assets/...` 解析不了。验证：生产包零 PNG 文件。

**为什么** — data URL 而不是 `public/` 目录：public-dir 资源保留绝对路径（`base: '/'`），在 Electron 的 `loadFile` 生产模式会破。把（都 < 10 KB 的）sheets 内联进 JS 包完全绕开路径解析，不用动 `base` 和现有 chunk 布局。workspace `assets/` 目录保持不动 — 把用户资产导入 workspace 是另一个 step。

**为什么** — 橡皮从 "tile id 0" 挪到保留 tileset id：真实 tileset 从 0 起编号 tile，所以 `tileId === 0` 不再能代表"擦除"。哨兵对 `('eraser', 0)` 让橡皮保持 brush 层概念（它产 `EraseTileCommand`，从不是 placed tile），而不用保留一个全局 tile id 让 builtin sheet 撞上。

> Next: Step 31 candidates — autotile/bitmap expectations for terrain edges（包里有 bitmask 参考 sheets）、brush 的 flip/rotation UI、workspace asset import。

---
