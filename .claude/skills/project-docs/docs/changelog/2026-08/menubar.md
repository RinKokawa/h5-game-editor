# 2026-08 · MenuBar

> MenuBar UI、菜单项、菜单交互的全部演进。

---

## Patch — View 菜单填标准内容（zoom + 面板 + 全屏）— 2026-08-22

**做了什么** — View 菜单从空变成有内容：

```
View
├── Zoom In           Ctrl+=
├── Zoom Out          Ctrl+-
├── Actual Size       Ctrl+0
├── Reset View        Home
├── ─────────
├── Toggle Console           ● (checkmark when visible)
├── Toggle Left Panel
├── Toggle Right Panel
└── ─────────
    Toggle Full Screen  F11
```

新增 `system:setFullScreen` IPC（main 用 `BrowserWindow.setFullScreen`），preload / bridge 镜像，`MenuBar` 加 `onToggleFullScreen` prop，`EditorShell` 接管 toggle 状态（`isFullScreen` mirror state 让 checkmark 跟菜单即时同步）。Window 菜单的面板 toggle 项迁到 View（按业界惯例：View = 看到什么，Window = 窗口管理器动作），Window 留空菜单项（未来 macOS "New Window" 之类）。

i18n 加 9 个 `menu.view.{zoomIn,zoomOut,actualSize,resetView,toggleFullScreen,toggleConsole,toggleLeftPanel,toggleRightPanel}` 三 bundle。3 个测试 mock 加 `setFullScreen`。

**为什么** — View 放面板 toggle 不放 Window：业界惯例（VS Code / Blender / Figma）：View 管"看什么"（缩放、面板显隐、网格），Window 管窗口本身（New Window、Minimize、Close）。本项目只有单窗口，Window 暂时空。

**为什么** — Full Screen 用 IPC 不直接 `BrowserWindow`：renderer 没 node integration，`setFullScreen` 是 BrowserWindow API，必须走 main。

**为什么** — EditorShell 镜像 isFullScreen state：用户也可能按 F11 / OS 快捷键触发全屏，OS 切了但 renderer 不知道。v0.1 只镜像菜单触发，不监听 OS F11 — 用户从菜单点切时 checkmark 同步，按 F11 时不同步（v0.1 简化）。后续 Electron `enter-full-screen` / `leave-full-screen` 事件可以接入。

---

## Patch — 语言切换从 View 移到 Edit → Preferences — 2026-08-22

**做了什么** — 新建 `src/panels/preferences/PreferencesDialog.tsx`（modal，含语言 radio 选择 section，未来扩 Appearance / Shortcuts section）。Edit 菜单末尾加分隔符 + Preferences 项，点开 PreferencesDialog。View 菜单留空（未来塞面板显隐 / 缩放 / 主题）。`MenuItem` 联合类型加 `{ kind: 'separator' }` 支持 dropdown 内的分组分隔线。

i18n 加 `menu.edit.preferences` / `preferences.title` / `preferences.language` / `preferences.languageHint`（三 bundle）。

**为什么** — 从 View 移走：业界惯例（Unity / Blender / Photoshop / IntelliJ）语言切换都在 Preferences / Settings 里。View 是"看什么"（panel 显隐 / 缩放 / 主题），Language 是"用什么语言看"（app-wide 行为）。两个维度不同。

**为什么** — Edit > Preferences 而不是顶级 Preferences 菜单：用户选的 Blender 风格：Edit 是数据操作（undo/redo/cut/copy/paste），Preferences 是这些之上的 app-wide 设置。Blender 习惯：Edit → Preferences。

**为什么** — separator 类型要 union 不用新组件：dropdown item 渲染简单，inline 一个 `<div role="separator">` + CSS 1px 线即可；不需要新组件。`MenuItem | { kind: 'separator' }` discriminated union 渲染时 narrow。

---

## Patch — Help → Documentation 跳仓库 URL — 2026-08-22

**做了什么** — 加 `system:openExternal` IPC + bridge + wrapper（`openExternal(url)`）。Help → Documentation 改成调 `openExternal('https://github.com/RinKokawa/h5-game-editor')`，OS 默认浏览器开。

**为什么** — 走 prop 不走直接 import：`panels/` ESLint 边界禁 import `systems/`。MenuBar 加 `onOpenDocs` prop；`EditorShell`（能 import bridge 的层）包装 `() => openExternal(URL)` 传下去。Bridge 模式类似 fileActions 一致：panel 接收回调，不直接持有 bridge 引用。

**为什么** — 用 `shell.openExternal` 不 `window.open`：`shell.openExternal` 是 Electron 推荐 API：走 OS 默认浏览器、不开 Electron 进程内新窗口、阻止 `javascript:` 等危险 scheme。renderer 没 node integration，只能借 main 进程的 `shell` 模块。

**为什么** — 不在 main 加 allowlist 校验 URL：现阶段只暴露给项目自己用，可信 URL 由 caller（EditorShell 写死常量）提供。Electron 自带的 scheme 过滤已经覆盖安全场景（`javascript:` / `data:` / `vbscript:` 等会被拦）。未来如果接受 user 输入 URL，再加正则白名单。

3 个测试 mock 加 `openExternal`。

---

## Patch — Edit / Tools / Window / Help 菜单填测试内容 — 2026-08-22

**做了什么** — 之前 Edit / Tools / Window / Help 四个菜单的 `items: []` 是空，下拉不开。这次给每个菜单加最少一个（实际给多个）测试项：

- **Edit**: Undo / Redo / Cut / Copy / Paste / Select All（stub — 只是显示+快捷键列，点击 no-op）
- **Tools**: Select / Pan / Brush / Eraser / Rect / Entity / Collider（真实 wired — `setActiveTool` 接 `toolStore`，checkmark 跟当前 active 工具联动）
- **Window**: Toggle Console / Toggle Left Panel / Toggle Right Panel（真实 wired — 调 `layoutStore.toggleXxxCollapsed`；Console 项有 checkmark 表示可见）
- **Help**: About / Documentation（stub — 调 `useConsoleStore.push` 在 ConsolePanel 里打一条 info 日志）

**i18n** — 三 bundle（en/zh-CN/ja-JP）加 22 个 `menu.{edit,tools,window,help}.*` key，全中文日对应。

**为什么** — Tools 走 `toolStore` 而不是 Tools 直接 dispatch 命令：`setActiveTool` 已是 Toolbar 按钮、快捷键、Tool 内部都在用的统一入口，菜单走同一条路径不会有"两个真相源"。checkmark 也靠同一个 store 自动同步。

**为什么** — Help 用 consoleStore.push 而不是 `@systems/diagnostics` 的 `log`：`panels/` ESLint 边界禁 import `systems/`（参见 `eslint.config.js` 里的 no-restricted-paths）。`state/consoleStore` 是 panels 能 import 的合法路径，且数据最终被 EditorShell 同步到 diagnostics 流（参见 consoleStore.ts 头注）。日志仍能在 ConsolePanel 看见。

**为什么** — Edit 是 no-op：Edit 的实际操作（undo/redo/cut/copy/paste）需要接 HistoryStack / 系统剪贴板，目前是独立模块，不在这个菜单改的范围。先把可见的菜单 UI（label、快捷键列、checkmark 后 close-after-action 链路）测出来是用户当前的需求。

---

## Patch — MenuBar 改用 backdrop 关闭，不用 document mousedown 监听 — 2026-08-22

**做了什么** — `MenuBar.tsx` 删除 useEffect 里的 `document.addEventListener('mousedown')` 监听；保留 `keydown`（Esc）。改成 React 习惯做法：菜单开时渲染一张全屏 invisible `<div class="menuBackdrop">`，backdrop 的 `onMouseDown` 关闭菜单。

z-index 分层：`.menuBackdrop` = 99、`.menuBar` 加 `position: relative; z-index: 100`、`.dropdown` = 100（在 MenuBar stacking context 内）。效果：backdrop 在画布/侧栏之上但在菜单栏之下 → 点击画布/侧栏落 backdrop → 关菜单；点击菜单按钮落 MenuBar → 走 toggle / hover 切换；点击下拉项落 dropdown → item onClick → 关。

**为什么** — 之前 document mousedown 不可靠：PixiJS canvas 的 pointer 事件可能不冒泡到 document（`stopPropagation` / 自家 event listener 拦截），导致点画布时 document 那个监听器收不到。Backdrop 是**直接落 DOM 元素**，不依赖事件冒泡 — 点击 backdrop 一定触发 backdrop 自己的 listener。

**为什么** — backdrop 不是 MenuBar 的子节点：backdrop 在 MenuBar 之外（sibling，用 fragment 包裹），让 `menuBarRef.contains(target)` 检查不会把 backdrop 当成"menuBar 内部"。backdrop 自己 onClick 无条件关闭，逻辑更直接。

CHANGELOG patch + project-docs skill 镜像同步。

---

## Patch — MenuBar 开着的菜单之间 hover 切换 — 2026-08-22

**做了什么** — `MenuBar.tsx` 加 `handleMouseEnter`：menu button 的 `onMouseEnter` 触发时，如果当前**已经有**菜单开着（`openMenuKey !== null`），把 open 状态切换到这个 button 的 key。空状态（没菜单开）下 hover 不触发 open。

**为什么** — 上一步把 hover 自动开干掉了，这是对的（触控板太激进），但 native 桌面菜单的混合 UX 是：点击开第一个，之后鼠标移到其他顶级项**切换**菜单（不用再点一次）。macOS / Windows 都这个范式。把这一步全砍了变成"每个顶级项都得点击"，比 hover 自动开还烦。

**为什么** — `prev !== null && prev !== key` 而不是单纯 setState：条件同时防止两种越权：
- 没菜单开时，hover 不触发（保 click-to-open 保证）
- hover 自己（已在自己的菜单上）时，不重 setState 同一个 key（避免无意义 re-render，也避免 race condition：hover 触发时如果 useEffect 监听刚摘掉，可能产生状态不一致）

CHANGELOG patch + project-docs skill 镜像同步。

---

## Patch — MenuBar 改点击展开，去掉 hover 自动开 — 2026-08-22

**做了什么** — `MenuBar.tsx` 加 `openMenuKey` state + `menuBarRef`，点击 menu button toggle（开 / 关）。菜单可见性从 CSS `:hover` / `:focus-within` 改成 React state 控制的 `style={{ display }}`。`useEffect` 在 open 时挂 document 级 `mousedown`（点外面关）+ `keydown`（Esc 关），close 时摘。点 menu item 触发后自动 close。按钮 open 时加 `menuButtonActive` 类给视觉反馈（背景+边框），加 `aria-haspopup` / `aria-expanded` 给屏幕阅读器。

**为什么** — hover 自动展开在触控板上太激进（指针扫过就触发），且鼠标扫过菜单栏时容易意外弹出。Native 桌面菜单（macOS、Windows、Linux DE）的标准 UX 是 click-to-open。

**为什么** — `mousedown` 不是 `click`：mousedown 在 click 之前触发，确保"点外面"的关菜单先于任何目标元素的事件（不会先触发画布点击才关菜单）。点 menu item 时 mousedown 在 menuBarRef 内，contains() 真，不走关闭分支；click 才触发 item onClick。

**为什么** — useEffect 条件挂载：只在 open 时挂监听，平时不付开销，也避免多 menuBar 实例的 handler 泄漏。

**为什么** — 单开（toggle 替换而非叠加）：native 桌面菜单单开；点开 File 自动关 View。多个同时开视觉拥挤且键鼠交互也会乱。

**为什么** — MenuBar.module.css 注释保留 `:hover` / `:focus-within`：用一段注释说明它们"故意"不在 CSS 里（被 React state 取代），避免未来 contributor 加回来。

---

## Patch — MenuBar 圆角去掉 + 文字双轴居中 — 2026-08-22

**做了什么** — `src/panels/menubar/MenuBar.module.css`：
- `.menuButton` 去掉 `border-radius: 2px`（hover 时的圆角描边更扁平方正），改用 `display: flex; align-items: center; justify-content: center` 双轴居中文字，去掉 `padding: 4px 10px` 改 `padding: 0 10px`（垂直 padding 不需要了，flex 已经居中），加 `white-space: nowrap` 防文字被换行
- `.dropdown` 去掉 `border-radius: 3px` 顺手保持一致

**为什么** — menuBar 容器本身没设 border-radius，看起来"圆角"的是菜单按钮和下拉面板。VS Code 风调性偏好直角矩形；hover 时按钮圆角描边和 32px 高菜单条对比也违和。文字居中 — 之前按钮内文字左对齐，hover 时按钮变宽（border 出现），文字看起来左偏。

**为什么** — padding 0 10px 而不是 padding 4px 10px：flex 的 `align-items: center` 已经处理垂直方向，再加垂直 padding 会双重叠加导致文字看似略偏。简化后只用水平 padding。

---
