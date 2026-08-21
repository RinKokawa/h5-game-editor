# CLAUDE.md — H5 游戏编辑器 · 项目契约

> **改动任何源码前先读本文件。** 它承载了用数周谈判出来的架构决策。
> 违反它们会以"数月后才暴露"的方式破坏项目，不是分钟级那种。
>
> 历史决策与已完成的 step 详见 [`CHANGELOG.md`](./CHANGELOG.md)。

---

## 1. 项目定位

长期演进的 H5 游戏**编辑器框架**。产品**不是**"一个地图编辑器"，
而是承载多种编辑器（Map / Dialogue / Animation / Quest / Inventory /
Skill / Cutscene / Node / Localization / Timeline / Particle）的框架。
每个改动都要扛得住再加 10 个编辑器。

## 2. 技术栈（锁定）

- **React 19** — 仅 UI 外壳
- **PixiJS 8** — 仅画布渲染（React 不得画 Tile）
- **Zustand 5** — 仅 UI / 视图状态（项目数据放 Document）
- **Vite 6**、**TypeScript 5.6 strict**、**ESLint 9 flat**、**Prettier 3**

禁止引入 Redux / MobX / RxJS / Immer / react-pixi 或 Pixi-React 绑定 —
会与下方架构冲突。

## 3. 核心不变式（绝对不可破）

1. **Document 是单一数据源。** 任何视图都不得持有项目数据的并行状态。
   一刀切。项目级标量（`DocumentMeta.tileSize`、`DocumentMeta.mapSize`）
   必须且只能通过 CommandBus 分发的 Command 修改（`SetTileSizeCommand`
   / `SetMapSizeCommand`）— 不得从 store / 面板 / 工具直接改。
2. **所有变更走 Command。** 工具 / 面板 / 快捷键构造 Command 通过
   CommandBus 派发。无后门 `document.layers[0].tiles[x] = …`。
3. **React 不画 Tile。** PixiJS 场景图是 Tile / 实体 / 网格 / 选区矩形的
   唯一住处。
4. **Pixi 对象引用不得进 React state 或 Zustand store。** 通信单向：
   store → props（数字、id、标志）→ Pixi 场景图。
5. **工具只产出 Command。** 工具绝不直接改 Document。这样工具可重放，
   Undo / Redo 才能保证正确。
6. **模块边界由 ESLint 强制。** `npm run lint` 过则分层完好。不得屏蔽
   边界规则。

## 4. 模块依赖规则（强制）

```
app       →  editor, panels, layout, systems, canvas
editor    →  core, state, canvas, panels
canvas    →  core, state
panels    →  core, state
layout    →  core, state, panels
systems   →  core, state, editor, panels
core      →  types, shared, utils
state     →  core, types, shared, utils
shared    →  types, utils
utils     →  types, shared
```

如果 `canvas/` 需要 `editor/` 里的某个函数，几乎一定是：把它提到
`core/` 或 `shared/`，再从那里 import。

## 5. 归属表

| 你要加的是…                            | 它属于…                |
| -------------------------------------- | ---------------------- |
| 工具（Brush、Eraser…）                | `editor/map/tools/`    |
| 变更（DrawTile、MoveEntity…）          | `editor/map/commands/` |
| Document schema 类型（Map/Tile/Entity） | `editor/map/schema/`   |
| 可复用的 schema 类型（Entity 基类、ID brand）| `editor/shared/` |
| 纯渲染原语（Sprite 池、Grid）          | `canvas/`              |
| React UI 面板（Inspector、Palette…）   | `panels/`              |
| 横切系统（Shortcuts、Diagnostics）     | `systems/`             |
| 纯函数辅助（数学、ID 生成）            | `shared/` 或 `utils/`  |
| UI-only state（当前工具、打开的面板）  | `state/`               |
| 项目数据（当前地图、图层、实体）       | Document（不是 Zustand）|

## 6. 文件大小与结构

- 目标：**每个文件 < 300 行。** 超了就拆。
- **没有上帝对象。** 一个类绝不拥有"关于编辑的全部"。
- **没有 utility bucket。**（`helpers.ts` 装 30 个无关函数。）
- 一个类 / 一个职责 / 一个文件。文件名 = 主要导出。
- 测试与源码并排：`*.test.ts`。

## 7. 命名约定

- React 组件：`PascalCase.tsx`
- 类 / 类型 / 接口：`PascalCase.ts`
- 函数 / 变量：`camelCase.ts`
- 常量：`SCREAMING_SNAKE_CASE`（仅真正的编译期常量）
- Command：`<Verb><Noun>Command.ts` — `DrawTileCommand`、`MoveEntityCommand`
- 工具：`<Purpose>Tool.ts` — `BrushTool`、`EraserTool`、`SelectTool`
- ID：branded string — `type LayerId = string & { readonly __brand: 'LayerId' }`
- 单类文件可省略冗余前缀（`BrushTool.ts` 导出 `BrushTool`，不是
  `class BrushToolTool`）。

## 8. 数据流

```
用户输入
   ↓
输入聚合（canvas/input）
   ↓
当前工具（editor/map/tools）
   ↓
Command（editor/map/commands）+ CommandBus（core/command）
   ↓
Document Service（core/document） → Document 变更事件（core/event）
   ↓                                     ↓
HistoryStack（core/history）       Pixi 渲染器（canvas/renderer）
   ↓                                     ↓
Zustand store 更新                 场景图 delta
   ↓                                     ↓
React 面板重渲染                   帧
```

不能跳层。快捷键绑定可以直接 dispatch Command（跳过工具），但绝不能
跳过 Document mutation。

## 9. TypeScript 风格

- `strict: true` 加 `noUncheckedIndexedAccess`、`noImplicitOverride`、
  `noUnusedLocals`、`noUnusedParameters`。
- **禁 `any`。** 用 `unknown` 收窄。
- **避免非空断言**（`!`）。首选类型守卫。
- state / 结果 / 事件用 discriminated union。
- 不变的类型一律 `readonly`。
- 类型导入用 `import type`（lint 强制）。

## 10. React 风格

- 仅函数组件。无 class 组件。
- Hook 在组件顶部；不在条件里。
- state 提到最小公共祖先；类型 state 仅在多个远距离组件都用到时才
  进 Zustand。
- **不要用 `useEffect` 同步派生 state。** 渲染期计算。
- 没测过性能就不要用 `useMemo` / `useCallback`。

## 11. PixiJS 风格

- 一个编辑器实例一个 Pixi `Application`。绝不在 re-render 时重建。
- 订阅 Document 事件，不轮询。
- Sprite 用池复用，不要每帧每个 tile 都分配。
- 渲染器必须在 React StrictMode 下能跑（mount / unmount / mount）。

## 12. 提交与 step 纪律

项目**一个架构 step 一步**地建。每个 step 必须：

1. 启动前审批。
2. 落地时 `npm run build` + `npm run lint` + `npm run typecheck` 三件套过。
3. 非平凡逻辑加测试。
4. 范围或规则变了就更新 `README.md` 和 `CLAUDE.md`。

不要在 step 里 bundle "顺手改"。保持专注。

## 13. 当前 step

最新完成 + 历史 step 列表见 [`CHANGELOG.md`](./CHANGELOG.md)。
加新 step 前先读最后几节，确保衔接顺。

前端结构层级（React 组件树、PixiJS 场景图、CSS module 映射、维护规则）见
[`docs/frontend-structure.md`](./docs/frontend-structure.md)。改组件前先看。

## 14. 常见陷阱

- ❌ 把 tile 数据放 Zustand。→ 放 Document。
- ❌ 用 React 画 tile。→ 用 PixiJS。
- ❌ 在 `canvas/` 里 import `editor/` 共享一个常量。→ 把常量提到
  `shared/`，再从 `canvas/` 直接 import。
- ❌ 用 `useEffect` 把 props "同步"进 Pixi。→ Pixi 应该订阅 Document
  事件，或直接接能让它自身状态变化的 props。
- ❌ 把业务逻辑放组件里。→ 挪到 `core/` 或一个 Command。
- ❌ 加第三方 state 库"解决" Zustand 的怪现象。→ 怪现象是代码气味，
  refactor。
- ❌ 因为"没事"就跳过 `npm run lint`。→ 一定会有事。
- ❌ 把 i18n locale store 挪进 `state/` "跟其他面板共享 state"。→ 已通过
  `useT()` / `useLocale()` 共享。挪进 `state/` 会迫使 `core/i18n/` import
  `state/`，打破 ESLint 边界。Zustand 是库，不是层。
- ❌ 在 `i18n.ts` 和切换器里加第三个 locale。→ 扩 `core/i18n/types.ts`
  的 `Locale` 联合类型，加 bundle 进 `bundles/`，`AVAILABLE_LOCALES`
  会通过 `Object.entries(NATIVE_NAMES)` 自动被切换器拾起来。
- ❌ 把 `Launcher` 放 `panels/`，跟其他面板坐一起。→ Launcher 的工作是
  跟 Electron IPC 对话；`panels/` 被禁止 import `systems/`。Launcher
  住 `app/`（与 `WorkspaceGate` / `EditorShell` 同级）。
- ❌ "重新启用" Step 16 的 localStorage document IO，让 vite dev server
  可以不选 workspace 就启动。→ Step 18 的 launcher 之后，"没 workspace
  就没有 document"是规则。localStorage 路径是刻意删掉的 — 加回去会
  重新引入 workspace 消除掉的双后端分裂。

## 15. 加功能前的问题

1. 按 §5 它该归哪个模块？
2. 它需要 Command，还是纯读？
3. 它要不要新模块？如果要，声明它的依赖规则。
4. 它有没有迫使任何模块跨过禁边界 import？如果有，先把共享部分提到
   下层。
5. `core/extension/` 里有没有现成的扩展点应该承接它，而不是硬编码在
   一个编辑器里？

任一答案不清楚就停下来问。