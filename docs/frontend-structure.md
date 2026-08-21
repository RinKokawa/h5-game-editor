# 前端结构层级

> 这份文档描述项目**前端**的层级关系：React 组件树、PixiJS 场景图、CSS module 映射。
> 当前生效规则在 [`CLAUDE.md`](../CLAUDE.md)；架构演进史在 [`CHANGELOG.md`](../CHANGELOG.md)。

---

## 1. 概览

项目前端 = **React 19 外壳** + **PixiJS 8 画布渲染** + **Zustand 5 UI state**。

- **React** 只画 UI（菜单、工具栏、面板、状态栏）。**不画 Tile / 实体 / 网格 / 选区**。
- **PixiJS** 只画画布内容。**不进 React state，不进 Zustand store**。
- **Zustand** 只装 UI 视图数据（当前工具、面板顺序、布局宽度）。**项目数据放 Document**。
- 通信单向：React 读 store 拿到数字 / id → 传给 Pixi；Pixi 通过 document 事件回写到 store → React 重渲染。

具体流向参考 `CLAUDE.md` §8 数据流图。

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
│  │ PanelStack         │            │ PanelStack         │
│  │   PanelDock × N    │  <canvas>  │   PanelDock × N    │
│  └────────────────────┴────────────┴────────────────────┘
├─ BottomSlot (PanelDock w/ ConsolePanel) ─┤
└─ StatusBar ────────────────────────────┘  ← statusBarSlot
```

`Main` 里左右两个 `Splitter`（垂直方向）拖动改侧栏宽度；底部一个 `Splitter`（水平）拖动改 console 高度。宽度 / 高度 / 折叠态都在 `state/layoutStore`，跨会话持久化。

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

| Panel | 文件 | 角色 | 所在栏 |
|-------|------|------|--------|
| `MenuBar` | `panels/menubar/MenuBar.tsx` | File actions（save/load/back to launcher）+ View 菜单（语言切换） | top |
| `Toolbar` | `panels/toolbar/Toolbar.tsx` | 工具切换按钮（V/H/B/E/O/C/R） | top |
| `StatusBar` | `panels/status-bar/StatusBar.tsx` | 选区计数 / 文档状态 / 坐标 | bottom |
| `PalettePanel` | `panels/palette/PalettePanel.tsx` | Tileset 选择 + brush/eraser 缩略图 | left |
| `AssetBrowserPanel` | `panels/asset-browser/AssetBrowserPanel.tsx` | Builtin tileset 列表 + 计数 | left |
| `LayerPanel` | `panels/layer/LayerPanel.tsx` | 图层增删改 + 可见性 / 锁 / 重排 | left |
| `InspectorPanel` | `panels/inspector/InspectorPanel.tsx` | （v0.1 占位，待 Extension Registry 接入） | right |
| `PropertiesPanel` | `panels/properties/PropertiesPanel.tsx` | 当前选区实时 key/value 行 | right |
| `ConsolePanel` | `panels/console/ConsolePanel.tsx` | 日志输出（subscribe `systems/diagnostics`） | bottom |

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
| `.panel` / `.empty` | 各面板 | `panels/{name}/{Name}Panel.module.css` |
| `.launcher` / `.action` | Launcher | `app/launcher/Launcher.module.css` |

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

**自动化**：跑 `npm run docs:tree` 重生 §6 的 src/ 文件树。比对输出和文档，发现新增/删除/移动文件就同步对应章节。

**何时跑**：每次合并 PR 前 / 每次完成 step 后。

**不要做**：

- 把意图说明 / 跨层关系写在 §6（脚本生成的章节会盖掉它）。
- 把架构规则写在这里 — 那住 CLAUDE.md。
- 把 step 历史写在这里 — 那住 CHANGELOG.md。