# UI 编辑器架构侦察 · Reconnaissance

> 日期：2026-08-23
> 状态：草案，待 review
> 上下文：Step 30 + UI 抛光期收尾后；项目确认要新增「UI 编辑器」（CLAUDE.md §1 当前未列）
> 当前生效规则：[`CLAUDE.md`](../../CLAUDE.md)

---

## 0. 摘要

「UI 编辑器」与现有 Map 编辑器差异显著，挑战框架的多个硬约束。本文档覆盖 9 个架构决策点（编号 A–I），列出每点的当前状态、UI 选项、推荐、待定。第 10 节给出**最小落地决策集**与 **Step 划分建议**。

**一句话结论**：要做 UI 编辑器，必须先做一项**先决 refactor**——把 Map 编辑器迁到 `EditorExtension` 注册（否则 UI 编辑器会和 Map 编辑器分叉走两条注册路径）；之后才能谈 UI 的 schema / 渲染 / 工具集。

---

## 1. 渲染边界（A）

### 1.1 当前框架硬约束

- CLAUDE.md §3.3：React 不画 Tile。
- CLAUDE.md §3.4：Pixi 对象不进 React state / Zustand store。
- 实践：`canvas/` 全部 PixiJS；`panels/` 全部 React；唯一跨界是「无 Pixi 引用的数据」通过 Zustand 流动。

### 1.2 UI 编辑器的选项

- **A1 — 纯 DOM**：UI 编辑器 viewport 走 React，CanvasArea 只剩 Map。
- **A2 — 纯 PixiJS**：用 PIXI.Text / Graphics 模拟 UI（远离事实标准，强烈不推荐）。
- **A3 — 混合**：UI viewport 是绝对定位 DOM 层，盖在 CanvasArea 上方。Map 渲染仍是 PixiJS。

### 1.3 推荐

**A3（混合）。** 原因：

- DOM 是 UI 渲染的事实标准；编辑器「所见即所得」要求贴近运行时。
- §3.3 / §3.4 仍然成立——DOM 层「展示 widget」，**不画 Tile**；Pixi 仍只管画布（Map 视图）。
- React 不持有 Pixi 对象这条规则不变；DOM 层也不持有任何 Pixi 引用。

### 1.4 待定

- A3 下 DOM 层的接入点：直接由 React 组件渲染，还是新增「`UIRenderer`」（类似 `PixiRenderer` 但走 ReactDOM）？
  - 推荐**直接 React 组件渲染**——React 本身已经是组件化渲染，加一层包装增加抽象成本而无收益。
- input 事件路由：DOM 层抢事件会不会导致 Map 画布的事件丢失？见 §10.1 风险。

---

## 2. Document schema（B）

### 2.1 当前形状

```ts
// src/editor/map/schema/document.ts
export type DocumentKind = 'map';
export interface Document {
  readonly id: DocumentId;
  readonly version: SchemaVersion;
  readonly type: DocumentKind;
  readonly meta: DocumentMeta; // { tileSize, mapSize }
  readonly maps: ReadonlyMap<MapId, MapData>;
  readonly activeMapId: MapId;
}
```

注释明确预留：「`type` 是 discriminated union；v0.1 只 ship 'map'，但 seam 保留给 Dialogue / Animation / Quest…」。

### 2.2 UI 选项

- **B1** — `Document.type` 加 `'ui'` 联合项（与 map 并列）。
- **B2** — UI 用独立 `UIDocument`，workspace 里与 MapDocument 平级但不进 Document union。

### 2.3 推荐

**B1**。原因：

- `Document.type` 注释明确预留多编辑器 seam，B1 是填这个 seam 的最自然方式。
- 序列化层、IO 层、DocumentSerializer 都不用分支判断。
- on-disk JSON 兼容性：复用 `version: SchemaVersion`（`${number}.${number}.${number}`），bump minor。

### 2.4 待定

- **Meta 字段**：`tileSize` / `mapSize` 不适用。候选：`defaultCanvasSize` / `defaultTheme` / `defaultFont`？
  - 推荐 `meta: { defaultCanvasSize, defaultFont }`——`theme` 是资产引用见 §8。
- **节点树**：扁平表 + `parentId`（与 map.layers 模型一致）vs 嵌套对象。
  - 推荐**扁平表 + parentId**——和 map 一致，Undo/Redo 粒度更好控制。
- **锚点 + 布局模型**：先支持「绝对 + top-left 锚点」；flow / grid 推迟。
  - 锚点维度（top-left / top-center / ... / stretch）是 `AnchorKind` enum；推迟项另外记。

---

## 3. Command + Tool（C）

### 3.1 当前形状

- `Command { kind, do(service), undo(service) }`（`src/core/command/Command.ts`）。
- 七个工具：`Brush / Eraser / Pan / Rect / Select / Entity / Collider`。
- `DocumentService` 提供 `setTile / setLayerVisible / ...` 等所有 mutation；Command 调用 service。

### 3.2 UI 选项

- **工具集**：Select（widget 选 + 拖 + resize）/ HierarchyDrag（拖入 / 拖出父节点）/ Style（属性绘制）/ Preview（运行时模拟）。
- **命令**：AddWidget / RemoveWidget / MoveWidget / ResizeWidget / ReparentWidget / SetWidgetStyle。

### 3.3 推荐

- **DocumentService 单 service + UI 子集方法**（`addWidget / setWidget / removeWidget / ...`）——避免 command bus 拆分。
- **拖动用 StrokeCommand 模式**：pointerdown→pointerup 期间是 raw 小命令（widget.x++），pointerup 时包成 CompositeCommand；与 `BrushTool` 一致。

### 3.4 待定

- Undo / Redo 粒度：用户改 font-size 是「属性级」还是「操作级」？
  - 推荐**操作级**：连续拖 slider 是单个命令；与 Tiled / Figma 行为一致。

---

## 4. Panel 集合（D）

### 4.1 当前 Map 的面板

```
LEFT   : Palette / Assets / Layers
RIGHT  : Inspector / Properties
BOTTOM : Console
```

### 4.2 UI 选项

```
LEFT   : Hierarchy（树视图，必备）/ WidgetLibrary（widget 调色板）
RIGHT  : Inspector（widget 属性）/ Style（widget 样式细节）/ Preview
BOTTOM : Console（共用）
```

### 4.3 推荐

**左列随 active editor kind 切换**——

- 新增 `editorStore.activeEditorId: 'map' | 'ui' | ...`，左列 `PanelStack` 接收 panels prop 由它决定。
- 不与 Map 面板共存（避免左列混搭的 UX 复杂度）。
- 切换入口：MenuBar > View > Editor（新增一项）或 Toolbar 切编辑器 kind。

### 4.4 待定

- `toolStore.activeToolId` 跟 `editorStore.activeEditorId` 是两个独立维度？——是。
- 切编辑器时，工具栏工具集也换吗？——是（UI 编辑器工具 ≠ Map 工具）。

---

## 5. Editor 注册机制（E）—— 关键先决

### 5.1 当前状态

- `core/extension/` 已存在（Step 24）：`EditorRegistry` / `EditorExtension` 接口齐备。
- **但 Map 编辑器的 7 工具 / 5 面板仍是硬编码在 `EditorShell.tsx`，没经过 registry。**
- `extension/index.ts` 注释提到 `app/ExtensionHost.ts`，但**该文件不存在**——这是个已知 TODO。

### 5.2 UI 选项

- **E1**：先把 Map refactor 成通过 `EditorExtension` 注册，再加 UI 的 `EditorExtension`。
- **E2**：跳过 Map refactor，直接加 UI 的 `EditorExtension`，Map 仍硬编码。
- **E3**：新加 `core/editor-registry/`（类似 ExtensionRegistry 但管理编辑器本身）。

### 5.3 推荐

**E1。** 原因：

- 「承载多种编辑器」（CLAUDE.md §1）的承诺要求**所有编辑器都走同一条注册路径**。
- 不 refactor Map，UI 编辑器和 Map 编辑器会分叉——下次再加编辑器（Quest、Inventory）会再次分叉。
- E3 是过度抽象——`ExtensionRegistry` 已经够用，加方法即可。

### 5.4 待定

- `EditorExtension` 是否加新方法 `registerEditor(def: EditorDefinition)`？还是 EditorDefinition 是另一个独立 registry？
  - 推荐：`EditorDefinition { id, displayName, panels, tools, commands, ... }`；`registerEditor` 作为 `EditorRegistry` 新方法。
- refactor 范围：Map 的 7 工具 + 5 面板 + Toolbar 切换逻辑 + EditorShell 接线——这是 Step 31 的工作量。

---

## 6. 跨编辑器交互（F）

### 6.1 当前

- Map 文档与未来 UI 文档独立存在于 workspace。

### 6.2 选项

- **F1**：UI widget 允许引用 Map 实体（如「血条 → entity.player」），schema 内嵌引用。
- **F2**：UI widget 不允许跨文档引用；运行时由游戏代码自行注入。

### 6.3 推荐

**F2**。原因：

- 跨文档引用让两个独立 Document 产生耦合，Undo/Redo 边界不清。
- 「血条显示玩家血量」是**运行时**问题，不应该污染**设计期** schema。
- 运行时绑定由 codegen / 游戏 runtime 负责（不在编辑器范围）。

### 6.4 待定

- v1 是否需要 cross-reference 元数据（如「这个 widget 的 dataSource 字段是什么」）？——不需要；见 §9 序列化决策。

---

## 7. Selection 策略（G）

### 7.1 当前

```ts
// src/state/selectionStore.ts
export type Selection = TileSelection | EntitySelection | ColliderSelection;
```

三种 kind：`tiles` / `entity` / `collider`。

### 7.2 路线图原计划

- Step 29 — SelectionStrategy registry：等到「第 4 种选区 kind」出现才落地。

### 7.3 推荐

- UI 编辑器引入 `'widget'` kind 作为**第 4 种**：这就是 Step 29 等的触发条件。
- 但 Step 29（SelectionStrategy registry）的实现复杂度与 'widget' kind 是正交的——

### 7.4 建议拆 step

- **Step 32-A**（UI 编辑器骨架）：'widget' kind 进 selectionStore 的 discriminated union，按现有模式实现 setter / getter。
- **Step 29**（独立，Step 32-A 之后）：抽 SelectionStrategy registry，把 4 种 kind 统一管理。

### 7.5 待定

- 'widget' kind 形状：`{ kind: 'widget'; widgetId; canvasId }`？还是带 hierarchy 范围 `{ kind: 'widget'; widgetIds: WidgetId[] }`？
  - 推荐 `{ kind: 'widget'; widgetIds: ReadonlySet<WidgetId> }`——支持多选，从一开始就贴近 SelectionStrategy 抽象。

---

## 8. 资产域（H）—— framework-level（用户反馈升级）

### 8.1 当前

- `workspace/assets/` 目录存在但 v0.1 为空（`core/workspace/schema.ts`）。
- DocumentMeta 没引用资产。
- Map 编辑器现在用 **builtin tilesets**（`editor/map/palette/builtinTilesets.ts`，硬编码）—— 无 import 流程。
- UI 编辑器没有任何资产（无字体、无主题、无 icon）。

### 8.2 反馈修正

侦察原稿只把 §8 当 UI 资产的子问题处理——这是**收窄**。用户指出：

- 资产是 framework-level 基础设施，不专属于某个编辑器。
- Map 编辑器 refactor 后要支持自定义 tileset import；UI 编辑器需要字体 / 主题 / icon import。
- 两者都依赖同一套 assets 基础设施。

→ §8 升级为 framework-level 决策；**资产基础设施提前到 Step 30-A**（详见 §10）。

### 8.3 资产分类（待 Step 30-A 细化）

- `tileset` — Map 编辑器用（关联 `MapData` / `TileLayer`）。
- `sprite` — Map entity + UI icon 共享。
- `theme` — UI 编辑器用（颜色 / 间距 / 字号）。
- `font` — Map label + UI text 共享。
- `audio` — Map event + UI event 共享（推迟到更后期）。

### 8.4 路径决策（H2 仍适用）

- **H2**：单一 `workspace/assets/` 域，按 kind 子目录（`assets/tileset/`、`assets/sprite/`、`assets/theme/`、`assets/font/`）。
  - 简单；多目录 IO 复杂度可控；与 `assets/ui/` 这种「按编辑器切」相比，跨编辑器共享（font / sprite）零成本。
- **H1 已否决**：按编辑器切目录会让共享资产（font / sprite）需要双份或符号链接。

### 8.5 资产引用

- Map：`DocumentMeta` / `TileLayer` 元数据引用 tileset id。
- UI：`UIDocumentMeta` / `Widget` 元数据引用 theme / font / sprite id。
- 资产 id 是 manifest 里的稳定字符串（UUID 或 path-based）。

### 8.6 待定（推到 Step 30-A 设计）

- manifest 格式（JSON / TOML / 其他）。
- import 流程 UX（拖入 / 文件选择 / 命令面板）。
- 资产重命名 / 删除的 Command 化。
- builtin tileset 与 import 资产如何共存（builtin 是否也走 asset store？）。

---

## 9. 序列化 / 运行时（I）

### 9.1 当前

- Document JSON round-trip via `core/serialization/documentSerializer.ts`。
- `DocumentSerializer` extension point 已存在（Step 24）。

### 9.2 选项

- **I1**：复用 DocumentSerializer（JSON），runtime data binding 起步，codegen 推迟。
- **I2**：UI 独立 XML / 自定义 JSON。

### 9.3 推荐

**I1**。原因：

- 复用 schema 版本、迁移框架。
- UI 树作为**纯数据**（无表达式）序列化；运行时由游戏代码自行解析。

### 9.4 待定

- 「运行时怎么消费 UI 树」不是编辑器问题，是游戏 runtime 问题——出项目边界，I1 不预设。
- v1 是否要 schema 内嵌 data binding 表达式（`{ ref: 'player.hp' }`）？——不内嵌（见 §6）。

---

## 10. 最小落地决策集

要做 UI 编辑器，**最小必做的事**（按 step 排序）：

1. **CLAUDE.md §1** 编辑器列表加 UI 编辑器。✅ 已完成
2. **CLAUDE.md §3.3 / §3.4** 增补：DOM 可用于渲染 UI 元素。✅ 已完成
3. **Step 30-A**：assets 基础设施（workspace.assets/、manifest、import 流程、asset store/service）。
4. **Step 31**：Map → EditorExtension refactor；切换入口（MenuBar > View > Editor）。
5. **Step 32 起**：UI 编辑器（UIDocument + UIDocumentService + Hierarchy + Select + 'widget' kind）。

### 10.1 Step 划分建议

| Step | 内容 | 前置 |
|------|------|------|
| **Step 30-A** | workspace.assets 基础设施：asset manifest、import 流程、asset store、asset service、kind 分类（tileset/sprite/theme/font） | 无 |
| **Step 31**（取代当前候选） | Map → EditorExtension refactor；`EditorExtension.registerEditor` API；EditorShell 改为按 activeEditorId 接线；**切换入口**（MenuBar > View > Editor radio group） | Step 30-A |
| **Step 32** | UI 编辑器骨架：`UIDocument` + `UIDocumentService` + `UIDocumentStore`（B2 独立路径）；Hierarchy 面板 + Select 工具（widget 选择 + 拖动）；selectionStore 加 'widget' kind；viewport 渲染是 stub | Step 31 |
| **Step 33** | UI viewport 渲染层：DOM 渲染 widget + 锚点 + 布局（实现 §1.3 A3 混合方案）；input 事件路由；WidgetLibrary 面板消费 Step 30-A assets | Step 32 |
| **Step 34** | HierarchyDrag 工具 + ReparentWidget command + 拖入/拖出父节点 | Step 33 |
| **Step 35** | Style 工具 + SetWidgetStyle command + Style 面板 | Step 34 |
| **Step 36** | Preview 工具 + 运行时数据绑定契约（codegen 推迟） | Step 35 |
| **Step 29**（原路线，现在可以推） | SelectionStrategy registry（4 种 kind 统一抽象） | Step 32 |
| **Step 37** | 原 Step 31 候选「workspace asset import」已并入 Step 30-A | — |

### 10.2 当前路线图候选处理

- 原 Step 31 候选（autotile / bitmap / brush flip / workspace asset import）：
  - **workspace asset import**：**并入 Step 30-A**（不再是候选，是先决）。
  - **autotile / bitmap / brush flip**：推迟到 UI 编辑器闭环后，作为 Map 编辑器「深度」路线。

### 10.3 风险 / Open Questions

- **input 事件路由**：A3 混合渲染下，UI viewport 的 DOM 事件可能跟 Map canvas 的 Pixi 事件冲突。需要明确：「UI 编辑器激活时，Map canvas 不响应事件」或「事件按 viewport bounds 路由」。
- **Undo / Redo 粒度**：连续拖 slider 是单命令 vs 多命令已推荐操作级，但 UX 上需测。
- **主题 vs 编辑器主题**：用户切编辑器 dark mode，UI widget 怎么展示？——v1 跟随系统主题，不做 widget-level theme override。
- **UI widget 预览**：运行时 vs 静态截图——v1 仅静态（编辑器内的样例数据），runtime 模拟推迟。
- **Map 编辑器 refactor 的回滚风险**：Map 当前是硬编码的 7+5；refactor 是不可逆 API 改动，要打全测试覆盖。
- **Step 30-A 范围**：assets 基础设施如果做得太薄（只导入不引用），Map 编辑器 refactor 后仍然没法用；做太厚又会跟 Step 31 撞车——边界要 Step 30-A 设计时定。

---

## 11. 决策锁定（2026-08-23）

7 项决策用户已确认：

| # | 决策 | 与原推荐对比 |
|---|------|--------------|
| A3 | **混合渲染** — UI viewport 走 DOM 叠在 CanvasArea 上方；Pixi 仍只管 Map 画布 | ✅ 同推荐 |
| B2 | **UI 独立 UIDocument** — workspace 内与 MapDocument 平级，不进 Document union | ❌ 偏离原推荐 B1 |
| E1 | **Map 先 refactor** — Step 31 = Map → EditorExtension，UI 编辑器在之后 | ✅ 同推荐 |
| F2 | **不允许跨编辑器引用** — schema 不含跨文档引用 | ✅ 同推荐 |
| Step 划分 | **接受原计划** — Step 31 = refactor / Step 32 = UI 骨架 / 33+ = 渲染 / 工具 | ✅ 同推荐 |
| 原候选 | **接受原推荐** — autotile/bitmap/brush flip 推后；workspace asset import 拆 Step 37 | ✅ 同推荐 |
| **Step 30-A** | **assets 单独成 step** — 在 Step 31 之前做 framework-level 资产基础设施（用户新提出，原推荐未涵盖） | 🆕 修正 |

### B2 偏离的影响

- `Document` interface 不变；新增独立 `UIDocument` 接口。
- workspace 加 `activeUIDocId`（与 `activeDocId` 平级）。
- `DocumentStore` / `DocumentService` 不被污染；新增 `UIDocumentStore` / `UIDocumentService`。
- `DocumentSerializer` 仍按 format 路由，但 UI 走独立 format（`format: 'ui'`）。
- 代价：workspace / IO 状态机更复杂；好处：UI 与 Map 完全解耦，演进独立。

### Step 30-A 修正的影响（重排）

- 原「workspace asset import 拆 Step 37」取消；并入 Step 30-A。
- Step 31 增加**切换入口**：MenuBar > View > Editor radio group，EditorShell 按 activeEditorId 决定 panels/tools。
- Map 编辑器 refactor 现在建立在 Step 30-A assets 之上——tileset 引用是 asset id 而不是 builtin const。
- builtin tileset 与 import 资产的共存策略在 Step 30-A 设计时定。

---

## 附录 A · 关键代码引用

| 文件 | 关注点 |
|------|--------|
| `src/core/extension/types.ts` | `EditorExtension` / `EditorRegistry` 接口 |
| `src/core/extension/registry.ts` | registry 实现；`install(extension)` 模式 |
| `src/core/command/Command.ts` | `Command { kind, do, undo }` 极简接口 |
| `src/core/command/CommandBus.ts` | 单 history stack + emitter |
| `src/core/document/DocumentService.ts` | 所有 mutation 的唯一入口；map 形状 |
| `src/editor/map/schema/document.ts` | `DocumentKind = 'map'` 联合 |
| `src/editor/map/schema/document.ts` `DocumentMeta` | `{ tileSize, mapSize }` |
| `src/state/documentStore.ts` | Zustand mirror + `useDocumentDirty` |
| `src/state/selectionStore.ts` | `Selection = TileSelection \| EntitySelection \| ColliderSelection` |
| `src/shared/tool/Tool.ts` | `Tool { id, labelKey, attach, detach }` 接口（cross-cutting） |
| `src/editor/map/tools/BrushTool.ts` | StrokeCommand 模式——UI 拖动可复用 |
| `src/app/EditorShell.tsx` | **Map 工具/面板仍是硬编码——这就是 Step 31 要 refactor 的地方** |
| `src/canvas/renderer/PixiRenderer.ts` | PixiJS 单实例管理；UI 渲染不与此冲突 |