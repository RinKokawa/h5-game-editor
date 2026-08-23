# 前端结构层级

> 这份文档描述项目**前端**的层级关系：React 组件树、PixiJS 场景图、CSS module 映射。
> 当前生效规则在 [`CLAUDE.md`](../CLAUDE.md)；架构演进史在
> [`.claude/skills/project-docs/docs/changelog/`](../.claude/skills/project-docs/docs/changelog/README.md)。

---

## 1. 概览

项目前端 = **React 19 外壳** + **PixiJS 8 画布渲染** + **Zustand 5 UI state** + **DOM viewport（UI 编辑器）**。

- **React** 只画 UI（菜单、工具栏、面板、状态栏、UI viewport widget）。**不画 Tile / 实体 / 网格 / 选区**。
- **PixiJS** 只画 Map 画布内容。**不进 React state，不进 Zustand store**。
- **DOM viewport** 是 UI 编辑器激活时叠加在 CanvasArea 上方的绝对定位 React 层。Pixi / DOM 不互通。
- **Zustand** 只装 UI 视图数据（当前工具、面板顺序、布局宽度、activeEditorId）。**项目数据放 Document / UIDocument**。
- 通信单向：React 读 store 拿到数字 / id → 传给 Pixi 或 DOM；Pixi / DOM 通过 document 事件回写到 store → React 重渲染。

具体流向参考 `CLAUDE.md` §8 数据流图。**新功能设计（Step 30-A / Step 32+）**见 §8（资产管理前端）与 §9（UI 编辑器前端）。

## 2. React 组件树

### 2.1 入口

```
App.tsx
└── WorkspaceGate.tsx               (src/app/)
    ├── <Launcher />                (src/app/launcher/Launcher.tsx) — workspace phase
    └── <EditorShell />             (src/app/EditorShell.tsx)      — editor phase
```

**为什么有 WorkspaceGate**：Launcher 是 workspace 选择（需要 Electron IPC），EditorShell 是编辑器主体。两者职责差太大，放一个组件文件里反而难懂；用一个 if/else gate 拆开，让两个 children 只看 phase。

### 2.2 编辑器壳（grid 5 行）

`EditorShell` 用 CSS Grid：

```
┌─ MenuBar ─────────────────────────────┐  ← menuBarSlot
├─ Toolbar ─────────────────────────────┤  ← toolbarSlot
├─ Main (flex row) ─────────────────────┤
│  ┌─PanelColumn(left)─┬─CanvasArea─┬─PanelColumn(right)─┐
│  │ PanelStack         │ <canvas>   │ PanelStack         │
│  │   PanelDock × N    │  + UIViewport DOM 层 (Step 33) │
│  └────────────────────┴────────────┴────────────────────┘
├─ BottomSlot (PanelDock w/ ConsolePanel) ─┤
└─ StatusBar ────────────────────────────┘  ← statusBarSlot
```

`Main` 里左右两个 `Splitter`（垂直方向）拖动改侧栏宽度；底部一个 `Splitter`（水平）拖动改 console 高度。宽度 / 高度 / 折叠态都在 `state/layoutStore`，跨会话持久化。

**Active editor kind**：左 / 右 PanelStack 内容、`Toolbar` 工具集、`CanvasArea` 内是否启用 UIViewport 都由 `state/editorStore.activeEditorId` 决定（`'map' | 'ui'`）。切换入口见 §9.2。

**UIViewport**（Step 33 起）：activeEditorId = 'ui' 时，CanvasArea 内叠加 `position: absolute; inset: 0` 的 React DOM 层，渲染当前 UIDocument 的 widget 树（widget 渲染细节见 §9.1）。Pixi canvas 仍在底层但停止接收输入；DOM 层独占事件。

### 2.3 侧栏面板层（`src/layout/`）

```
PanelColumn                          ← 容器（按 side 决定 width / collapsed）
└── PanelStack                       ← 一栏一个栈
    └── PanelDock (per spec)         ← 受控的 dock（高度、折叠、重排）
        └── <Panel />                ← 具体面板（panels/ 下）
```

- **PanelStack** 是声明式的：从 `EditorShell.LEFT_PANELS` / `RIGHT_PANELS` 注册表读，按 `layoutStore.leftPanelOrder / rightPanelOrder` 顺序渲染。
- **HTML5 drag-and-drop** 在 dock header 上做重排（React + Pixi + Zustand，无 dnd 库）。
- **Splitter** 在每个展开 dock 下拖动改高度；最后一个 fill dock 吸收剩余空间。
- 当存储的高度超过列高时**栈滚动**，不裁内容。

### 2.4 面板清单

| Panel | 文件 | 角色 | 所在栏 | active editor |
|-------|------|------|--------|---------------|
| `MenuBar` | `panels/menubar/MenuBar.tsx` | File actions + View 菜单（含 **Editor 切换** §9.2 + 语言切换）| top | shared |
| `Toolbar` | `panels/toolbar/Toolbar.tsx` | 工具切换按钮（Map: V/H/B/E/O/C/R；UI: Select/HierarchyDrag/Style/Preview）| top | per editor |
| `StatusBar` | `panels/status-bar/StatusBar.tsx` | 选区计数 / 文档状态 / 坐标 | bottom | shared |
| `PalettePanel` | `panels/palette/PalettePanel.tsx` | Tileset 选择 + brush/eraser 缩略图 | left | Map |
| `AssetBrowserPanel` | `panels/asset-browser/AssetBrowserPanel.tsx` | **资产列表（按 semanticKind 分组；builtin + import）**（§8）| left | shared |
| `LayerPanel` | `panels/layer/LayerPanel.tsx` | 图层增删改 + 可见性 / 锁 / 重排 | left | Map |
| `HierarchyPanel` | `panels/hierarchy/HierarchyPanel.tsx` | **Widget 树视图 + 重排 + 多选**（§9.3）| left | UI |
| `WidgetLibraryPanel` | `panels/widget-library/WidgetLibraryPanel.tsx` | **可创建 widget 类型 + asset 拖入**（§9.4）| left | UI |
| `InspectorPanel` | `panels/inspector/InspectorPanel.tsx` | 选中 widget / entity / collider 的属性 | right | shared |
| `PropertiesPanel` | `panels/properties/PropertiesPanel.tsx` | 当前选区实时 key/value 行 | right | Map |
| `StylePanel` | `panels/style/StylePanel.tsx` | **Widget 视觉属性（color / font / padding / border）**（§9.5）| right | UI |
| `PreviewPanel` | `panels/preview/PreviewPanel.tsx` | **Widget 运行时模拟（填样例数据）**（§9.6）| right | UI |
| `ConsolePanel` | `panels/console/ConsolePanel.tsx` | 日志输出（subscribe `systems/diagnostics`） | bottom | shared |

**active editor 切换**：`state/editorStore.activeEditorId` 决定左 / 右 PanelStack 渲染哪些 panel。Map 编辑器激活时左列 = Palette / AssetBrowser / Layer，右列 = Inspector / Properties。UI 编辑器激活时左列 = AssetBrowser / Hierarchy / WidgetLibrary，右列 = Inspector / Style / Preview。AssetBrowser 与 Inspector 在两个编辑器之间共享；其他 panel 按 editor kind 切换。

## 3. PixiJS 场景图

`EditorShell` 在 mount 时构造完整 PixiJS 树，destroy 时按反序拆：

```
PixiRenderer (Application)
└── stage
    └── Camera.worldContainer            ← 视图变换
        ├── GridView                     ← 网格覆盖层
        ├── LayerView[]                  ← 基类（canvas/layers/LayerView）
        │   ├── TileLayerView            ← sprite pool + diff
        │   ├── ObjectLayerView          ← Graphics per entity
        │   └── CollisionLayerView       ← Graphics per collider
        ├── SelectionOverlay             ← tile / entity / collider 描边
        └── (Gizmos 子系统预留，src/canvas/gizmos/)
```

工具在 `PixiRenderer.start()` 完成后 `attach(canvas)`：

| 工具 | 快捷键 | 读 | 写 |
|------|--------|-----|-----|
| `SelectTool` | V | documentStore, selectionStore | selectionStore |
| `PanTool` | H | — | camera state |
| `BrushTool` | B | brushStore, documentStore | PlaceTileCommand |
| `EraserTool` | E | brushStore | EraseTileCommand |
| `RectTool` | R | brushStore | PlaceTileCommand（drag） |
| `EntityTool` | O | brushStore | PlaceEntityCommand |
| `ColliderTool` | C | brushStore | PlaceColliderCommand |

**PixiJS 安全约束**（来自 CLAUDE.md §11）：

- 一个编辑器实例一个 `Application`，不在 re-render 时重建。
- 订阅 document 事件，不轮询。
- Sprite 用池复用，不每帧每个 tile 都分配。
- 必须在 React StrictMode 下能跑（mount / unmount / mount）。

## 4. CSS Module 映射

CSS 变量与基础排版在 `src/styles/global.css`。具体面板用 CSS Modules。

| Class 簇 | 元素 | 文件 |
|----------|------|------|
| `.shell` / `.main` / `.canvasHost` | EditorShell | `app/EditorShell.module.css` |
| `.column` / `.columnCollapsed` | PanelColumn | `layout/PanelColumn.module.css` |
| `.stack` | PanelStack | `layout/PanelStack.module.css` |
| `.dock` | PanelDock | `layout/PanelDock.module.css` |
| `.splitter` | Splitter | `layout/Splitter.module.css` |
| `.canvasArea` | CanvasArea | `layout/CanvasArea.module.css` |
| `.menuBar` / `.menu` / `.item` | MenuBar | `panels/menubar/MenuBar.module.css` |
| `.toolbar` / `.button` | Toolbar | `panels/toolbar/Toolbar.module.css` |
| `.statusBar` | StatusBar | `panels/status-bar/StatusBar.module.css` |
| `.palette` / `.header` / `.swatchGrid` / `.swatch` | PalettePanel | `panels/palette/PalettePanel.module.css` |
| `.browser` / `.group` / `.list` / `.row` | AssetBrowserPanel | `panels/asset-browser/AssetBrowserPanel.module.css` |
| `.panel` / `.empty` | 各面板 | `panels/{name}/{Name}Panel.module.css` |
| `.launcher` / `.action` | Launcher | `app/launcher/Launcher.module.css` |
| `.hierarchy` / `.tree` / `.node` / `.indent` / `.toggle` | HierarchyPanel（§9.3）| `panels/hierarchy/HierarchyPanel.module.css` |
| `.widgetLibrary` / `.catalog` / `.item` / `.preview` | WidgetLibraryPanel（§9.4）| `panels/widget-library/WidgetLibraryPanel.module.css` |
| `.style` / `.group` / `.row` / `.swatch` | StylePanel（§9.5）| `panels/style/StylePanel.module.css` |
| `.preview` / `.frame` / `.sample` | PreviewPanel（§9.6）| `panels/preview/PreviewPanel.module.css` |
| `.uiViewport` / `.widget` / `.handle` / `.selected` | UIViewport / widget 渲染（§9.1）| `editor/ui/viewport/UIViewport.module.css` |

新增 CSS module 时加一行。

## 5. 跨层通信示例

**用户点 PalettePanel 上的 brush tile**：

```
PalettePanel
  ↓ onClick → setBrushSelection({ tilesetId, tileId })
brushStore (Zustand)
  ↓ useBrushStore 订阅
Toolbar / StatusBar（不需要重渲染，但 brush tile 高亮已生效）
```

**用户点击画布**：

```
PixiJS canvas → BrushTool（active tool） → Command 构造
  ↓
CommandBus.execute(cmd)
  ↓
DocumentService 改 store + 发 { kind: 'tile:set', layerId, coord }
  ↓ 同步
useDocumentStore 订阅 → TileLayerView.rAF-debounce 重绘 sprite
  ↓ 异步（不阻塞 input）
HistoryStack.push(cmd) for Undo
```

单向数据流保证 PixiJS object 不进 React state。

## 6. src/ 文件树快照（脚本输出）

> 自动生成。`npm run docs:tree` 重跑这段。
> 漂移检测：跑脚本后比对这段，发现新增/删除文件就同步改对应章节。

```
src/
├── app/                          ← 入口
│   ├── App.tsx
│   ├── EditorShell.module.css
│   ├── EditorShell.tsx
│   ├── launcher/
│   ├── main.tsx
│   └── WorkspaceGate.tsx
├── assets/                       ← 资源加载 + cache
│   ├── index.ts
│   ├── tilesets/
│   └── tilesetTextureCache.ts
├── canvas/                       ← PixiJS 渲染子系统
│   ├── camera/
│   ├── collision-layer/
│   ├── gizmos/                   ← 预留
│   ├── grid/
│   ├── input/                    ← 鼠标/键盘聚合
│   ├── layers/                   ← LayerView 基类
│   ├── object-layer/
│   ├── renderer/                 ← PixiRenderer
│   ├── selection/
│   └── tile-layer/
├── core/                         ← 业务无关框架
│   ├── command/                  ← CommandBus + Command 接口
│   ├── document/                 ← DocumentService（mutators + 事件）
│   ├── event/                    ← EventEmitter
│   ├── extension/                ← ExtensionRegistry
│   ├── history/                  ← HistoryStack barrel
│   ├── i18n/                     ← 多语言 + bundles/
│   └── serialization/
├── editor/                       ← 编辑器实现（v0.1：map）
│   ├── map/
│   │   ├── commands/             ← 所有 Command 实现
│   │   ├── panels/               ← 编辑器专属面板
│   │   ├── palette/              ← tileset + brush helpers
│   │   ├── schema/               ← Document schema 类型
│   │   └── tools/                ← 七个工具
│   └── shared/                   ← 跨编辑器可复用的 schema
├── layout/                       ← Dock / Panel / Splitter
├── panels/                       ← React UI 面板（无业务逻辑）
├── shared/                       ← 纯常量 / math / tool 接口
├── state/                        ← Zustand stores（UI state only）
├── systems/                      ← 横切（shortcuts / persistence / diagnostics）
├── types/                        ← 全局 TS 类型
├── utils/                        ← 纯工具函数
└── styles/                       ← global.css
```

完整文件清单（含每个目录的 `.tsx` / `.ts` / `.module.css`）跑 `node scripts/generate-frontend-tree.mjs`。

## 7. 维护规则

| 改动 | 必须同步 |
|------|----------|
| 加新面板（`src/panels/<name>/`） | §2.4 面板清单 + §4 CSS module 表 |
| 加新 PixiJS 子系统（`src/canvas/<name>/`） | §3 场景图 + §6 文件树 |
| 改 EditorShell 网格（slot 数 / Main 结构） | §2.2 编辑器壳 |
| 改 PanelStack 行为（重排 / 拖拽 / 折叠） | §2.3 侧栏面板层 |
| 加新工具 | §3 工具表 |
| 加新 CSS module | §4 映射表 |
| 加新 asset semanticKind | §8.1 + `editor/map/schema/asset.ts` 中 `SemanticKind` 联合 |
| 改 AssetBrowserPanel 结构 | §8.1 - §8.5 |
| 改 import 流程 UX | §8.3 |
| 加 UI 编辑器面板（Hierarchy / WidgetLibrary / Style / Preview） | §9.3 - §9.6 + §2.4 + §4 |
| 改 UIViewport 布局或 widget 渲染 | §9.1 + §4 |
| 改 Editor 切换入口 | §9.2 |

**自动化**：跑 `npm run docs:tree` 重生 §6 的 src/ 文件树。比对输出和文档，发现新增/删除/移动文件就同步对应章节。

**何时跑**：每次合并 PR 前 / 每次完成 step 后。

**不要做**：

- 把意图说明 / 跨层关系写在 §6（脚本生成的章节会盖掉它）。
- 把架构规则写在这里 — 那住 CLAUDE.md。
- 把 step 历史写在这里 — 那住 `.claude/skills/project-docs/docs/changelog/`。

---

## 8. Asset Management Frontend（Step 30-A）

> 架构骨架：`docs/architecture/asset-management-design.md`。
> 本节只描述**前端层**——AssetBrowserPanel 改造 + import UX + 状态可视化。

### 8.1 AssetBrowserPanel 列表结构

按 **semanticKind** 分组（`tileset` / `sprite` / `theme` / `font` / `audio`）：

```
┌─ AssetBrowserPanel ──────────────┐
│ [Tileset][Sprite][Theme][Font][Audio]   ← TabsRow（按 semanticKind 切换）
│ ────────────────────────────────
│ Built-in                          ← builtin 子组头（折叠）
│   Sprout Lands — Grass   256 ⚲    ← 🔒 只读徽章
│   Sprout Lands — Hills   256 ⚲
│ Imported                          ← import 子组头（折叠）
│   Forest Pack          4.2MB
│   …                                ← + Import 按钮（§8.3）
└───────────────────────────────────┘
```

- **排序**：builtin 在前（按 `name` 字典序），import 在后（按添加时间倒序）。
- **TabsRow**：active tab 决定当前显示的 semanticKind；默认 active = `tileset`（最常用）。
- **子组头**：点击折叠 / 展开；折叠态不持久化（每次 session 重置为展开）。

### 8.2 Asset 行元素

每行包含：

- **缩略图**（24×24）：tileset 显示首 tile；sprite / image 显示图标；font 显示首字符「Aa」；theme 显示色板；audio 显示 ♪ 图标。
- **name**：显示资产 `name`；hover 显示完整 tooltip（name / semanticKind / size / hash / last modified）。
- **size**：文件大小（人类可读）。
- **状态徽章**：🔒 builtin / ⏳ loading / ⚠ missing / ❌ error。详见 §8.4。
- **点击 → InspectorPanel**：右侧 InspectorPanel 显示完整 metadata + 操作（rename / delete，builtin 无）。

### 8.3 Import UX（三入口）

**入口 A — 拖入**：把 OS 文件拖到 AssetBrowserPanel 上：

1. 进入 drag-over 时面板加亮（`.dragOver` class），显示「Drop files here to import」hint。
2. drop 时弹 `ImportAssetDialog`（`panels/asset-browser/ImportAssetDialog.tsx`）—— 让用户选 semanticKind（如不可推断：tileset vs sprite 都接受 PNG）；显示源文件名 + 目标路径预览。
3. 用户确认 → 复制文件到 `workspace.assets/<semanticKind>/<name>.<ext>` → 更新 manifest → 资产出现在 Imported 组。
4. 取消则放弃。

**入口 B — 文件选择**：AssetBrowserPanel 顶部「+ Import」按钮：

- 触发 OS 文件选择对话框（Electron IPC 走 `systems/persistence/electronBridge`）。
- 进入 ImportAssetDialog 同上流程。

**入口 C — 命令面板**（v0.2+，未实现）：Cmd+P > "Import asset"，复用入口 B。

**支持格式**（v0.1）：

- `tileset` / `sprite`：`png` / `jpg` / `webp`
- `theme`：`json`（自定义 schema，见 §8.6）
- `font`：`woff` / `woff2` / `ttf`
- `audio`：（Step 30-A 不实现）

### 8.4 Asset 状态徽章

| 状态 | 图标 | 颜色 | 含义 |
|------|------|------|------|
| builtin | 🔒 | 灰 | 只读；尝试 rename / delete 拒绝 |
| loading | ⏳ | 灰转蓝 | import / texture 加载中 |
| ok | — | — | 正常，无徽章 |
| missing | ⚠ | 红 | Document 引用但文件已从 disk 删除 |
| error | ❌ | 红 | 加载 / 解析失败（如 JSON 不合法） |

**missing / error 显示**：Tooltip 写明原因；InspectorPanel 提供「重新关联」按钮（missing）或「查看错误」按钮（error）。

### 8.5 Asset 元数据（InspectorPanel 右侧）

选中资产后显示：

```
┌─ Inspector (Asset) ──────────────┐
│ Name:        Forest Pack        │
│ Kind:        tileset           │
│ Path:        assets/tileset/forest.png
│ Size:        4.2 MB            │
│ Hash:        sha256:ab12...    │
│ Modified:    2026-08-23 14:32  │
│ Referenced:  3 places          │（v2+）
│ ────────────────────────────────
│ [Rename]   [Delete]            │（builtin 无此按钮）
└───────────────────────────────────┘
```

`Rename` 走 `RenameAssetCommand`（待 Step 30-A 实现）；`Delete` 走 `RemoveAssetCommand`，删除前弹确认对话框（提示「N 个地方引用此资产」）。

### 8.6 Theme asset 形状（preview）

```json
{
  "name": "Default Dark",
  "version": 1,
  "colors": {
    "primary": "#3b82f6",
    "secondary": "#10b981",
    "background": "#1e1e1e",
    "foreground": "#f3f4f6"
  },
  "fonts": {
    "default": { "assetRef": "font/inter-regular.woff2", "size": 14 }
  },
  "spacing": { "xs": 4, "sm": 8, "md": 16, "lg": 24 }
}
```

UI 编辑器 widget 引用 theme 的 `colors.primary` 等路径；runtime 通过 `UIDocumentStore` 解析。

### 8.7 与 PalettePanel 的关系

- **PalettePanel**：当前 brush 的**具体 tile 选择**（tileset 内某 cell）。
- **AssetBrowserPanel**：**asset 级**（整个 tileset / sprite / theme / font）。
- 两 Panel 通过同一 `state/assetStore` 通信；PalettePanel 选 tileset 时只显示 `semanticKind = 'tileset'` 的资产。

---

## 9. UI Editor Frontend（Step 32+）

> 架构骨架：`docs/architecture/ui-editor-recon.md`。
> 本节只描述**前端层**——UIViewport 布局、Hierarchy / WidgetLibrary / Inspector / Style / Preview 面板、工具栏、切换入口。

### 9.1 UIViewport 布局（混合渲染）

`activeEditorId = 'ui'` 时，CanvasArea 内叠加 **UIViewport** DOM 层：

```
CanvasArea (relative)
├── <canvas>  ← PixiJS（仍在底层；Map 渲染；输入禁用）
└── UIViewport (absolute inset: 0; z-index: 10)
    ├── <div className="widget" data-id="...">  ← 每个 widget 一个 React 元素
    ├── <div className="widget selected">
    ├── <div className="handle nw">…</div>     ← resize handle（仅选中 widget）
    └── …
```

**渲染规则**：

- UIDocument 的 widget 树 → 平铺到 UIViewport（无视 parent 嵌套；z-index 按树深 + sibling 顺序）。
- 选中 widget 高亮（`.selected`）+ 8 个 resize handle。
- Pixi canvas 不接收 pointer 事件（`pointer-events: none`）；DOM 层独占。
- 摄像机变换 / 缩放（Step 33 推迟）：v0.1 widget 坐标 = viewport 坐标，不支持 pan/zoom。

### 9.2 Editor 切换入口

**MenuBar > View > Editor**（radio group）：

```
View
├── Editor
│   ● Map       ⌘+Shift+M
│   ○ UI        ⌘+Shift+U
├── Theme
│   ● Dark
│   ○ Light
└── Language
    ● 中文
    ○ English
    ○ 日本語
```

- 当前 active 项显示 ●；点击切换。
- 切换时触发 `editorStore.setActiveEditorId('map' | 'ui')`。
- EditorShell 订阅此 store，按 id 重渲染 PanelStack + Toolbar + UIViewport 显隐。
- 切换时不清空 selection（按 editor 隔离 selectionStore 即可）。

### 9.3 Hierarchy 面板（左）

```
┌─ Hierarchy ──────────────────────┐
│ ⌄ Panel "Root"                  │
│   ⌄ VStack                      │
│     ⌄ Button "Play"    👁 🔒    │
│       Label "▶"        👁 🔒    │
│     Label "Score: 0"   👁 🔒    │
│   HStack                        │
│     Button "Pause"      👁 🔒    │
│ ⌄ Panel "Settings"               │
│ …                                │
└───────────────────────────────────┘
```

- **树视图**：缩进 + 折叠箭头；与 filesystem tree 类似。
- **每行**：widget icon + name + visibility（👁） + lock（🔒） toggle。
- **拖入 / 拖出父节点**：drag widget 到另一个 widget 行 → ReparentWidget command。
- **多选**：Ctrl+click 单选切换；Shift+click 范围选。
- **同步 selectionStore**：选中 widget 同步到 `selectionStore.selection.kind = 'widget'`。
- **键盘**：↑/↓ 切换选中；Enter 展开 / 折叠；Delete 删除（带 Command）。

### 9.4 WidgetLibrary 面板（左）

```
┌─ WidgetLibrary ──────────────────┐
│ ＋ Text                         │
│ ＋ Button                       │
│ ＋ Image                        │
│ ＋ Panel                        │
│ ＋ Slider                       │
│ ─── From Assets ────────────────│
│   [font/inter-regular.woff2]    │
│   [sprite/heart.png]            │
└───────────────────────────────────┘
```

- **Widget 类型**：列出可创建的 widget 类型（Text / Button / Image / Panel / Slider）。
- **拖入**：拖到 UIViewport → 在落点创建 widget（AddWidgetCommand）；拖到 Hierarchy 行 → 创建并 Reparent。
- **From Assets 区**：列出相关 asset（font / sprite）—— 拖入 widget 创建「asset reference widget」。
- **扩展点**：新 widget 类型在 `editor/ui/widgets/` 加一个组件 + WidgetLibrary 注册。

### 9.5 Inspector 面板（右，widget 选中时）

```
┌─ Inspector (Button "Play") ──────┐
│ Name:       [Play            ]  │
│ Type:       button               │
│ Position:   x [120] y [80]       │
│ Size:       w [200] h [48]       │
│ Anchor:     [top-left      ▾]    │
│ Parent:     VStack               │
│ Children:   1 (Label "▶")        │
│ ────────────────────────────────│
│ [Edit Style →]                   │
└───────────────────────────────────┘
```

- **属性编辑**：所有变更走 `SetWidgetPropertyCommand`。
- **Position / Size / Anchor**：数字输入 + drag-to-edit（CanvasArea 内拖动手柄）。
- **Edit Style →**：跳到 StylePanel（§9.6）或展开内联 section。
- **多选**：显示共有属性（如 size / color），未共有的标 `<mixed>`。

### 9.6 Style 面板（右，widget 选中时）

```
┌─ Style (Button "Play") ──────────┐
│ Theme:  [Default Dark      ▾]    │
│ Color                              │
│   Background: [■ #3b82f6]         │
│   Foreground: [■ #ffffff]         │
│   Border:     [■ #000000]         │
│ Font                               │
│   Family:     [Inter         ▾]   │
│   Size:       [14]                │
│   Weight:     [Regular       ▾]   │
│ Spacing                           │
│   Padding:    [8] [8] [8] [8]     │
│   Margin:     [0] [0] [0] [0]     │
│ Border                             │
│   Width:      [1]                 │
│   Radius:     [4]                 │
└───────────────────────────────────┘
```

- **Theme**：从 asset store 选 theme（v0.1 是 enum；v0.2 可拖 theme asset）。
- **Color / Font / Spacing / Border**：分组折叠；值变更走 `SetWidgetStyleCommand`（与 §9.5 的 SetWidgetProperty 是不同 command，命名空间分开）。
- **Theme 资产引用**：widget.style.themeRef = `'theme/default-dark.json'`（asset id 形式）。

### 9.7 Preview 面板（右，UI 编辑器激活时）

```
┌─ Preview ─────────────────────────┐
│ Sample data:                      │
│   player.hp:     [80]             │
│   player.gold:   [120]            │
│   timer.seconds: [45]             │
│ ────────────────────────────────│
│ [▶ Run Preview]                   │
│ ┌─────────────────────────────┐   │
│ │  ▶ Play          Score: 0   │   │ ← 实时预览
│ │  ⏸ Pause                     │   │
│ └─────────────────────────────┘   │
└───────────────────────────────────┘
```

- **Sample data 输入**：用户填假数据（不接运行时 binding）。
- **Run Preview**：在面板内 mini viewport 渲染 widget 树（DOM，与 UIViewport 同组件）。
- **不实现**：codegen / 真实数据 binding / 跨 widget 事件。运行时模拟推迟。

### 9.8 工具栏（UI 编辑器激活时）

| 工具 | 快捷键 | 读 | 写 |
|------|--------|-----|-----|
| `SelectTool` (UI) | V | UIDocumentStore, selectionStore | selectionStore (widget kind) |
| `HierarchyDragTool` | D | UIDocumentStore | ReparentWidgetCommand |
| `StyleTool` | S | UIDocumentStore | SetWidgetStyleCommand |
| `PreviewTool` | P | UIDocumentStore, sample data store | （只读；切 PreviewPanel 显示） |

`SelectTool`（UI 版）支持：点击选中、drag 移动、corner handle resize、Shift+click 加选。HierarchyDragTool 在 Hierarchy 面板拖入 widget 树时自动激活。

### 9.9 Input 事件路由

- `activeEditorId = 'map'`：Pixi canvas 接 pointer 事件；UIViewport 不渲染（z-index < canvas 或 `display: none`）。
- `activeEditorId = 'ui'`：Pixi canvas `pointer-events: none`；UIViewport 接 pointer。
- 切换时清理 stale state（清空 selection 或按 editor 隔离）。

### 9.10 工具栏切换

`Toolbar` 按 `activeEditorId` 渲染不同的工具按钮集合。详见 §2.4 `Toolbar` 行。