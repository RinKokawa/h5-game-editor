# H5 游戏编辑器

![H5 游戏编辑器 图标](./public/favicon.png)

一个长期可维护、数据驱动的 H5 游戏编辑器框架。设计为承载多种编辑器类型（地图、对话、动画、任务、…）共享同一套核心。

> 状态：**早期脚手架阶段**。架构已冻结；功能持续开发中。

[English](./README.md) | **简体中文**

**使用编辑器？** 看 [使用说明](./docs/USER_GUIDE.zh-CN.md) — 安装、启动、面板、快捷键。[English](./docs/USER_GUIDE.md)

## 技术栈

| 关注点 | 选型 | 理由 |
| ------ | ---- | ---- |
| UI 外壳 | React 19 | 生态成熟、招聘友好、hooks 模型完善 |
| 画布渲染 | PixiJS 8 | 成熟的 2D WebGL 渲染器中最快的 |
| 状态（UI） | Zustand 5 | API 极简、无模板代码、易于界定范围 |
| 构建 | Vite 6 | 原生 TS / HMR / ESM |
| 语言 | TypeScript 5.6（strict）| 5 年周期的编译期保障 |
| Lint | ESLint 9（flat config）| 模块边界强制 |
| 格式化 | Prettier 3 | 单一规范风格 |

## 一张图看懂架构

```
React 外壳（UI、面板、布局）
       │
       │  Zustand stores（UI 状态）  ·  Command Bus（变更）
       ▼
核心框架（command、history、event、document、extension）
       │
       │  Document 变更事件
       ▼
PixiJS 渲染器（相机、网格、图层、Gizmos）
```

单一数据源 = **Document**。所有变更走 **Command**。渲染器和 UI 都订阅变更事件。完整架构说明见 [`CLAUDE.md`](./CLAUDE.md)。

## 项目结构

```
src/
├── app/           # 入口、根组件、Providers
├── core/          # 业务无关框架（command、history、event、…）
├── editor/        # 编辑器实现（v0.1：map）
├── canvas/        # PixiJS 渲染子系统
├── panels/        # React UI 面板（Inspector、Palette、…）
├── layout/        # Dock / Splitter / 布局持久化
├── state/         # Zustand stores（仅 UI / 视图状态）
├── assets/        # 资源加载与缓存
├── systems/       # 横切（快捷键、命令面板、Diagnostics）
├── shared/        # 纯常量与数学
├── types/         # 全局 TypeScript 类型
├── utils/         # 纯工具函数
└── styles/        # 全局样式与 CSS 变量
```

每个子目录的 `index.ts` 顶部 README 注释描述其作用域。

## 模块依赖规则

下层不得依赖上层。ESLint 强制：

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

跨禁边界 import 会让 `npm run lint` 失败。

## 快速开始

环境要求：Node ≥ 20。

```bash
npm install
npm run electron:dev # 完整编辑器：Vite + Electron（http://localhost:5173 在 app 内）
npm run dev          # 仅 Vite（浏览器预览；Launcher 显示"needs Electron"横幅）
npm run build        # 生产构建
npm run typecheck    # 仅 TypeScript
npm run lint         # ESLint
npm run lint:fix     # ESLint --fix
npm run format       # Prettier 写入
npm run test         # Vitest（每个文件单测）
npm run test:watch   # Vitest 监听模式
```

编辑器**仅 Electron** — 工作区存于用户用系统对话框选的文件夹，渲染端通过 preload 暴露的 `window.h5` bridge 访问。`npm run dev` 在普通浏览器打开 Vite 预览；Launcher 挂载但 **新建工作区** / **打开文件夹…** 按钮禁用并显示提示让你改用 `npm run electron:dev`。

## 当前能力（v0.1）

- ✅ Vite + React 19 + TypeScript strict
- ✅ PixiJS 渲染器 + 相机 + 网格 + Tile 图层
- ✅ 画刷工具：paint / erase with drag-to-paint
- ✅ 选择 / 平移 / 橡皮 / 画刷 / 实体 / 碰撞体 工具（V / H / B / E / O / C）
- ✅ 选区：tile（点击 + 框选）、entity（点击）、collider（点击），Delete 删除
- ✅ 图层面板：增 / 删 / 移 / 可见性 / 锁（tile + object + collision 三种 layer kind）
- ✅ 命令系统 + Undo / Redo（Ctrl/Cmd+Z、Ctrl/Cmd+Y、Ctrl/Cmd+Shift+Z）
- ✅ JSON 保存 / 加载（Ctrl/Cmd+S、Ctrl/Cmd+O）通过 Electron 文件对话框
- ✅ Object 图层 + 实体放置（sprite、spawn-point、door、pickup）
- ✅ Collision 图层 + box collider 拖放
- ✅ Rect 工具 — 填充 + Shift 描边，一次 Ctrl+Z 一拖（R）
- ✅ PropertiesPanel：当前选区的实时只读视图
- ✅ 编辑器 UI：English / 简体中文 / 日本語（MenuBar → View → Language）
- ✅ 工作区 + Launcher（仅 Electron）：文件夹持久化、recents
- ✅ 模块边界 ESLint 强制

## 路线图

| Step | 范围                                       | 状态 |
| ---- | ------------------------------------------ | ---- |
| 1    | 架构设计                                   | ✅   |
| 2    | 项目脚手架                                 | ✅   |
| 3    | 数据结构（Document、Map、Layers、Entity）| ✅   |
| 4    | 编辑器布局（菜单栏、工具栏、Dock）        | ✅   |
| 5    | PixiJS 集成                                | ✅   |
| 6    | 相机（平移、缩放）                        | ✅   |
| 7    | 网格叠加层                                 | ✅   |
| 8    | 绘制 Tile                                  | ✅   |
| 9    | 图层（可见性、锁、重排）                  | ✅   |
| 10   | 命令系统 + Undo / Redo                     | ✅   |
| 11   | 选区 & 框选                                | ✅   |
| 12   | 工具（Brush、Eraser、Select、Pan）         | ✅   |
| 13   | Object 图层 + 实体放置                     | ✅   |
| 14   | Collision 图层                             | ✅   |
| 15   | JSON 导入 / 导出                           | ✅   |
| 16   | 快捷键（Ctrl+S / Z / Y / Delete / Space）  | ✅   |
| 17   | 编辑器 UI i18n（English / 简体中文 / 日本語）| ✅ |
| 18   | 工作区 + Launcher（仅 Electron）           | ✅   |
| 19   | 选区模型 + PropertiesPanel 真实数据        | ✅   |
| 30   | Builtin tilesets（Sprout Lands）+ 真实贴图 | ✅   |

未来的编辑器类型（Dialogue、Animation、Quest、Inventory、Skill、Cutscene、Node、Localization、Timeline、Particle）接入现有 `core/` 和 `editor/` 注册表，无需架构变更。

## 资源致谢

内嵌的地形 sheets（grass、hills、tilled dirt、water）来自 **"Sprout Lands — Sprite pack (Basic)"** by Eric Bernier（免费包，`sprout-lands` on itch.io），放在 `src/assets/tilesets/`。文档以 builtin tileset id（`sprout.*`）引用它们；sheets 本身跟应用走，不跟任何工作区。

## 贡献

1. 读 [`CLAUDE.md`](./CLAUDE.md) — 它是契约。
2. push 前跑 `npm run lint` 和 `npm run typecheck`。
3. 文件保持聚焦；超 ~300 行就拆。
4. 新模块必须在 `index.ts` 里声明作用域，并遵守上面的依赖规则。