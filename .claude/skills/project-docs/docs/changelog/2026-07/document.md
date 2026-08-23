# 2026-07 · Document

> Document 数据模型、Commands、Service、Selection、Serialization 的演进。
> 跨模块 step（Step 22 涉及 DocumentChange + LayerView 基类）：DocumentChange 负载在这里，LayerView 基类见 [renderer.md](./renderer.md)。

---

## Step 28 — Command 去重 (A3) — 2026-07-18

**做了什么** — 五个"形状只随 kind 变化"的 Command 现在共用两个基类。

- `editor/map/commands/AddLayerCommand.ts`（33 行）是 `AddTileLayerCommand` / `AddObjectLayerCommand` / `AddCollisionLayerCommand` 的共享基类。每个 wrapper 现在 ~15 行：构造里调 `super('layer:add[-kind]', layer, makeActive)`。五行的 do/undo 对在基类里。
- `editor/map/commands/PlacePlacedObjectCommand.ts`（63 行）是 `PlaceEntityCommand` / `PlaceColliderCommand` 的共享基类。它对 `<TLayerId, TItemId, TPayload extends { id: TItemId }>` 泛型，所以四个 ops（add / appendToLayer / removeFromLayer / remove）能绑到正确的 primitive 而不把 Entity / Collider 类型漏进基类。每个 wrapper 现在 ~50 行，下来不多，但共享的 4 方法体只在一个地方。
- Step 27 的 11 个 Add*LayerCommand 测试和 2 个 Place* 测试不改全过—— 公共 Command 表面（`kind`、`do`、`undo`，外加 `placedEntity` / `placedCollider` getter）保留。
- `CommandBus.execute` 接 wrappers，因为它们 `extends` 实现 `Command` 的基类。

**为什么** — `AddLayerCommand` 基类不作为公共类导出 — 三个 wrappers 是唯一 caller — `LayerPanel` 各 import 一个。导出基类会引诱 caller 用 `new AddLayerCommand('layer:foo', ...)` 字符串绕过 layer-kind discriminator。基类文件存在是为了共享形状有单一源；index 只为工具重导出（比如未来 coalescer 想匹配公共基类）。

**为什么 `PlacePlacedObjectCommand` 泛型去到三个参数** — layerId 和 payload id 是不同 brand 类型（`LayerId` vs `EntityId` / `ColliderId`），所以合成一个 `TId` 是死胡同 — ops 包的 `appendToLayer` 得收两个不同类型。三个参数是保持 brand 区分和 ops 精确的最小值。

---

## Step 21 — Document schema 收尾（tileSize / mapSize → DocumentMeta）— 2026-07-18

**做了什么** — 项目级标量现在是一等 Document 数据，只能通过 Command 修改。

- `editor/map/schema/document.ts` 获得 `DocumentMeta { tileSize; mapSize }` 并加为 `Document.meta`。`Document` 接口本身仍前向形（扁 `DocumentStore` 只镜像活动字段）；`MapData` / `Document.maps` 重构推迟到第二个 map 真实。
- `state/documentStore.ts` 把 `tileSize` / `mapSize` 折成 `meta: DocumentMeta`。store 上唯一的直接 setter 剩 `setActiveLayer` — 选区/焦点，不是项目数据。`setMeta` 是私有 primitive，只被 `DocumentService` 调。
- `core/document/DocumentService.ts` 获得 `getMeta / setMeta / setTileSize / setMapSize`，都发 `{ kind: 'document:meta' }`。视图的单读端点保持 `useDocumentStore`。
- `editor/map/commands/SetTileSizeCommand.ts` 和 `SetMapSizeCommand.ts` 是 `tileSize` / `mapSize` 唯一合法 mutation 路径。两者构造时对非正值抛，都带 `prev`/`next` 所以 `do`/`undo` 对称且无状态。Indexed under existing `@editor/map/commands` barrel.
- `core/serialization/documentSerializer.ts` 往返 `meta`（`{ tileSize, mapSize }`）在顶层 `meta` key 下。错误路径现在拒缺失 `meta` 和缺失 `meta.mapSize`。
- `systems/persistence/documentIO.ts` 和 `systems/persistence/workspaceIO.ts` 让活动 Document 通过 `meta` 走 save 和 load；IO 不再偷看扁标量。
- 视图消费者（StatusBar、GridView、TileLayerView、SelectionOverlay、SelectTool / EraserTool / RectTool / BrushTool / EntityTool / ColliderTool、EditorShell）读 `s.meta.tileSize` / `s.meta.mapSize` 替代旧扁字段。`selectionStore.ts` 和 `SelectionOverlay.ts` 的注释同步。
- CLAUDE.md §3 不变式 1 加强："项目级标量（`DocumentMeta.tileSize` 和 `DocumentMeta.mapSize`）只能通过 CommandBus 分发的 Command 修改（`SetTileSizeCommand` / `SetMapSizeCommand`）— 不得从 store 或面板/工具直接改。"

**为什么** — 单独的 `DocumentMeta` 字段而不是把 `tileSize` / `mapSize` 放 `MapData`：(1) `Document` 现在是 save/load 单位；把这些标量 hoist 到 `meta` 上让 wire format 与 schema 一对一。(2) `MapData` 是前向形 — 当第二个 map 真实，每个 `MapData` 带自己 `tileSize`，项目 meta 保留 workspace 级默认值。现在拉动 `MapData` 触发器会强迫每个命令冗余重写。

---

## Step 19 — 选区模型扩展 + PropertiesPanel 真实数据 — 2026-07-18

**做了什么** — 选区 store 现在是 discriminated union：`{ kind: 'tiles' | 'entity' | 'collider', ... }`。`PropertiesPanel` 不再是 placeholder — 它渲当前选中的实时数据。

- `selectionStore.ts` 暴露 `Selection = TileSelection | EntitySelection | ColliderSelection`。`setTileSelection / toggleTileCell / addTileCell`（tile 端）、`setEntitySelection / setColliderSelection`（身份端）。`marquee` 和 `hover` 在 v0.1 仍只 tile（entity / collider marquee 跟选区扩展 step 落）。
- `SelectTool` 命中测试三种 layer kind。Tile 层保留现有 toggle / marquee 行为；Object 层挑 AABB 含点击点的最顶 entity；Collision 层挑最顶 box collider。跨层选区不在范围（Step 22）。
- `SelectionOverlay`（Pixi）现在订阅 `selectionStore` 和 `documentStore` 两者，所以选中的 entity / collider 描边跟随实时位置变化（或选中的东西被删时消失）。描边带小角标让它们读作选区而不是底层对象。Circle / polygon collider 描边跟编辑器扩展透传。
- `EraseSelectionCommand` 现在严格 tile 端：非 tile 选区它 `isEmpty()` 返回 true，只有 tile 路径捕获/恢复原 cell。对称的 `RemoveEntityCommand` 和 `RemoveColliderCommand` 在键盘 handler 里路由。
- `SelectionShortcuts.Delete` / `Backspace` 在 `selection.kind` 上 switch：tile → `EraseSelectionCommand`、entity → `RemoveEntityCommand`、collider → `RemoveColliderCommand`。`Escape` 清任何选区（和任何进行中的 marquee）。
- `PropertiesPanel` 渲当前选区的扁 key/value 行。Entity 行显示 id / type / name / position / size / rotation；collider 行加 `kind` 并把几何块适配 box（size + rotation）、circle（radius）、polygon（vertex count）。Tile 行列层名 + cell 数，然后每个 cell 一行带 `tilesetId / tileId`。空/陈旧态居中打印提示。
- `StatusBar` 选区计数现在 kind-aware：tiles 报 cell 数、entity / collider 总是 1，无 → 0。`selection.size`-on-`cells` 捷径没了。

**为什么** — 选区是单一 discriminated union 而不是三个并行字段：每个选区恰好挑一个 kind。强制 union 意味着消费者（`EraseSelectionCommand`、`StatusBar`、`PropertiesPanel`、`SelectionShortcuts`）必须显式收窄 — 编译器抓到任何混 kind 的路径。字段式设计（"`entityId?` + `colliderId?` + ... + 一个 `kind` discriminator"）重新引入了 discriminated union 想去掉的所有组合。

---

## Step 14 — Collision layer + box collider placement — 2026-07-08

**做了什么** — Map 编辑器现在有 `Collision` layer kind 装强类型 collider 形状；v0.1 出 box placement。

- `editor/map/commands/layerFactories.ts` mint 一个新鲜 `CollisionLayer` 带空 `colliderOrder`；`AddCollisionLayerCommand` 前置它。
- `PlaceColliderCommand` 加 collider 到 `colliders` 表 *并* 把它的 id 附加到层的 `colliderOrder`。Command 收 `BoxCollider` 值（v0.1）— `placeCollider` helper mint 新 id。`RemoveColliderCommand` 是对称反向；两者通过 `DocumentService.removeCollider` orphan 清理干净 undo。
- `CollisionLayerView`（Pixi）镜像 `ObjectLayerView`：每 `CollisionLayer` 一个 `Container`，rAF-debounce 重建。每个 `box` collider 是半透明填充矩形用它的 `kind`-color 描边（solid 红、trigger 蓝、platform 绿）。Circle 和 polygon 项在渲染器跳过（schema 支持；UI 跟碰撞编辑器扩展落）。
- `ColliderTool`（C 快捷键）拖笔画 box；不拖点击放一个 `tileSize` × `tileSize` 默认 box。`MIN_BOX_SIZE=4` 防止零尺寸放置。Space+left 委派给相机，跟其他工具一样。
- `LayerPanel` 弹窗现在列 **Tile / Object / Collision**。
- `documentStore` 带 `colliders: ReadonlyMap<ColliderId, Collider>` 和 primitives（`addCollider`、`removeCollider`、`setCollider`、`getCollider`、`appendToCollisionLayer`、`removeFromCollisionLayer`）— 跟 entity 表同形。
- 像 Step 13 一样，画布 UI 移除 collider 不在范围（无选区模型）。用 Undo（Ctrl+Z）回滚。真选区 - Inspector 接线落 Step 19。

**为什么** — Collision layer / collider 数据住 `documentStore` 而不是 Pixi 场景图 — 跟 Step 13 同理 — `CollisionLayerView` 订阅 `useDocumentStore` 并重建。Orphan 清理模式（`removeCollider` 从每个 `CollisionLayer.colliderOrder` 剥 dangling id）意味着命令只需捕获 refs 为 undo，不用追踪它们。

---

## Step 13 — Object layer + Entity placement — 2026-07-08

**做了什么** — Map 编辑器现在有 `Object` layer kind 装 entity；v0.1 出点击放置 + 四种 placeholder entity type（sprite / spawn-point / door / pickup）。

- `editor/map/commands/layerFactories.ts` mint 一个新鲜 `ObjectLayer`（类比 `TileLayer`）并分配唯一 id。
- `AddObjectLayerCommand` 前置新 object layer；镜像现有 tile-layer add。
- `PlaceEntityCommand` / `RemoveEntityCommand` 加和删 entities；place 命令把 entity id 附加到活动 object 的 `entityOrder`，remove 命令捕获每个层引用所以 undo 恢复它们。
- `ObjectLayerView`（Pixi）渲 object layers，每层一个 `Container`、每个 entity 一个 `Graphics` 矩形，按 `entityOrder`。可见性、锁、重排全从 document store 驱动。
- `EntityTool`（O 快捷键）点击放 entity：活动层必须是 `Object` 层（否则点击 no-op），Space+left 委派给相机，每次放置是单 `PlaceEntityCommand` undo 项。
- `LayerPanel` `+` 开弹窗列 **Tile / Object** 选项 for v0.1。
- `editor/map/palette/defaultEntityTypes.ts` 是 placeholder palette（sprite / spawn-point / door / pickup）— 真 plugin 渲染器跟 Extension Registry 落。
- `DocumentService.removeEntity` 自动清每个 `ObjectLayer.entityOrder` 里 dangling 引用，所以 `RemoveEntityCommand` 只需捕获它们为 undo 对称。
- Step 13 范围不含画布 UI 移除 entity（无选区模型）。用 Undo（Ctrl+Z）回滚。选区模型落 Step 19。

**为什么** — Object layer / entity 数据住 `documentStore` 而不是 Pixi 场景图：PixiJS 视图必须订阅 plain-data store。`ObjectLayerView` 读 `useDocumentStore` 并在 rAF debounce 上重建它的 Container — 一处处理顺序、可见性、和 entity 表，全从单一数据源。

---

## Step 22 — DocumentChange 负载 (A2) — 2026-07-18

> Step 22 跨 Document + Renderer。**LayerView 基类 (A6) 部分见 [renderer.md](./renderer.md) §Step 22。**

**做了什么** — `core/document/DocumentService.ts` 把 `DocumentChange` 从 `{ kind: string }` 升级成 17 variant discriminated union。每个 variant 带定位信息让聚焦订阅者所需：`tile:set { layerId; coord }`、`layer:add { layer; atIndex }`、`entity:set { entity }`、`objectLayer:append { layerId; entityId }` 等等。不关心特定 kind 的订阅者继续工作 — 他们对新的 tag 比 `c.kind === '...'` 就够了。

Emitter 端 rAF 合并考虑过被 Step 22 拒绝。Pixi 层视图在基类层已经 rAF-debounce，异步分发会强迫订阅者（特别是 `SelectionOverlay`）只读 state 也得 await frame。如果未来非 Pixi 订阅者真需要批处理，那是触发。

`editor/map/schema/events.ts` 删了。它是个前向的、愿望中的 `DocumentChange` 带 `MapId` 负载 — 从未 import，从未发，现在被活的 `core/document/DocumentService.DocumentChange` 联合取代。

**为什么** — discriminated `kind` 而不是运行时 `kind: string`：三个原因。(1) `c.kind === 'tile:set'` 收窄 discriminant 并给订阅者 in-scope `coord` 不重查。(2) 加新 variant 在每个 `switch (c.kind)` 上类型检查 — 编译器惩罚过期匹配。(3) `DocumentChange` 成为未来"带扩展的编辑器"用来声明自己 variant 的契约 — 没运行时注册，没符号魔法。
