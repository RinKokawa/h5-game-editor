# 2026-07 · Renderer

> PixiJS 层视图、tilesets、性能 的演进。
> 跨模块 step：Step 22 — LayerView 基类 (A6) 部分在这里；DocumentChange 负载 (A2) 部分见 [document.md](./document.md)。

---

## Step 23 — TileLayerView 性能（差量绘制）(B3) — 2026-07-18

**做了什么** — TileLayerView 不再在每次 store 变更时重建整个容器。每 cell 更新 mutate 单个 sprite；只有 insert/remove 真的分配。

- `canvas/tile-layer/TileLayerView.ts` 持一个 `Map<LayerId, Map<TileCoordKey, Sprite>>` 按 tile coord 索引。每层还存 `LayerSnapshot { tiles; tileSize }`，所以 tileSize-only mutation（如 `SetTileSizeCommand`）走 resize 路径不做全 diff。
- `diffTileSprites` 导出为纯 helper。冷启动（`prev === undefined`）加每条；暖通走 `prev.keys()` 拿 removals 和 `next.entries()` 拿 adds / mutations，复用现有 `Sprite` 实例只重染/重定位改的 cell。
- No-op 快路径留在 renderNode 边界：如果 `tilesEqual(prev.tiles, next.tiles)` *且* `tileSize` 不变，`renderNode` 立即返回 — 无 diff 遍历，无 Pixi mutation。
- `applyPlacement` mutate 现有 sprite 的 `tint / width / height / x / y`。Rotation / flip 仍透传 schema（placeholder palette 只变 tileId），但缝在位，等 v0.2 plugin renderer 落地时用。
- `TileLayerView.test.ts`（6 个用例）的测试覆盖用 `Container` 和假 `tiles` map 直接驱动 `diffTileSprites`：冷启动、no-op、add、remove、mutate-in-place、resize。测试断言 `sprites.size`、`container.children.length`，以及改的 cell 复用同一 `Sprite` 实例（无 churn）。

**为什么** — 增量 sprite diff 而不是 `ParticleContainer` 或全局 sprite 池，三个原因。(1) 代码库每个可见 tile 一个 `Sprite`，不是每 (tileset, palette slot) 一个。`ParticleContainer` 会强制属性包布局，placeholder palette 不需要。(2) 每 cell mutation 干净映射到 Step 22 的 `tile:set` 负载 — 同类更新同路落地。(3) 跨层池复用需要 key-stable 身份，每层 Map 已经提供，会重构刚抽出来的 LayerView 生命周期。

**为什么** — `LayerSnapshot` 跟 sprite Map 一起：`SetTileSizeCommand` 不动 `tiles` 本身；它改 `meta.tileSize`。没 snapshot 的话，no-op 快路径在第二次同值 `setTileSize` 上跳过 resize（假阳性：map 相等但 cell 尺寸过期）。snapshot 带 `tileSize` 让那种情况正确。

---

## Step 22 — LayerView 基类 (A6) — 2026-07-18

> Step 22 跨 Document + Renderer。**DocumentChange 负载 (A2) 部分见 [document.md](./document.md) §Step 22。**

**做了什么** — `canvas/layers/LayerView.ts` 是新的泛型基类：`class LayerView<TLayer extends Layer>`。它拥有 Pixi 容器层级（一个 root + 每可见层一个子容器）、通过 `protected scheduleRender()` 的 rAF-debounce 重绘、drop-stale / add-new / reorder-three-step 和 destroy 生命周期。

子类（`TileLayerView`、`ObjectLayerView`、`CollisionLayerView`）实现三个抽象槽：`subscribeToSource()`（一个 Zustand 订阅返回 unsubscribe）、`filterLayer(): l is TLayer`、`renderNode(node, layer)` — 内容漂移唯一处理处。每层 diff state（`Map<LayerId, TContentState>`）住子类因为视图特定。

文件预算：基类 ~140 行（含注释），三个子类从 130-170 各塌到 ~85-110。仅生命周期 boilerplate 的每子类瘦身是 ~70%。

**为什么** — 基类现在，Step 23 每 cell diff 工作之前：Step 23 只需重写 `TileLayerView.renderNode` 体去 mutate 一个 sprite 而不是重建。生命周期抽出来后，那是局部改不是整重写。如果 Step 22 跳过基类，Step 23 要么一次重写三个 LayerView 文件，要么分两次落地（一次生命周期，一次内容 diff）。
