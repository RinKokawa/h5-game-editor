# CHANGELOG — H5 游戏编辑器 · 架构演进史

> 每个 step 一节，逆时序排列。每节记录：**做了什么** / **为什么** / **未做**。
> 当前生效规则见 [`CLAUDE.md`](./CLAUDE.md)。
>
> 早期 step（Step 1-12）只列在 README 路线图里；本档从 Step 13 开始保留详细叙述。

---

## Post-Step 30 patch — Side panel stacks (PanelStack) — 2026-08-21

**做了什么** — 侧栏重做：dock 头可拖动重排，splitter 可拖动改尺寸，旧的"内容驱动 flex 挤压"在任意尺寸裁面板的 bug 没了。

- `layout/PanelStack.tsx` 从声明式注册表（`EditorShell` 里的 `LEFT_PANELS` / `RIGHT_PANELS`）渲染每侧一栏。每个 dock 有**显式像素体高**；最后一个展开的 dock（"fill"）撑满列剩余高度。每个展开的（除 fill）dock 下挂 `Splitter`，clamped 调高度；fill dock 吸走差值。存的高度超过列高时**栈滚动**——flexbox 永不挤压 dock，这就是旧布局裁内容的根因（"明明还有空间却截断"）。
- 栈顺序、单 dock 体高、折叠标志存在 `state/layoutStore`（`leftPanelOrder` / `rightPanelOrder` / `panelHeights` / `panelCollapsed`）。
- `layout/panelStackMath.ts` 把几何装成纯函数（`computeStackGeometry`、`nextBodyHeight`、`moveItem`）；常量 `PANEL_HEADER_H` / `SPLITTER_H` 与 CSS 镜像，是唯一允许的重复。Splitter handler 每帧从 store `getState()` 读，拖动不会把 delta 应用到陈旧高度上。
- 重排用 dock header 上的 HTML5 拖放（drop 到另一个 header 的上半/下半 = 之前/之后插入）。没引入 dnd 库 — 栈只允许 React + Pixi + Zustand。
- `PanelDock` 加了受控模式（`collapsed` / `onToggle`、`variant: 'fixed' | 'fill'` + `bodyHeight`）以供栈用；底部 Console dock 保留旧的自管 `defaultOpen` 路径。
- 布局现在**持久化到 localStorage**（zustand `persist`，key `h5-editor-layout`，`partialize` 排除 actions）。取代 v0.1 "无持久化"注释：UI 布局不是 Document 数据，中间件在 storage 不可用时 no-op。`PanelStack.normalizeOrder` 丢弃陈旧 id、附加未知 id，持久化顺序不会因注册表变了而坏。
- 测试：`panelStackMath.test.ts`（几何/clamp/moveItem）和 `layoutStore.test.ts`（顺序、高度 clamp、持久化往返含 `{ state, version }` 持久化信封）。

**为什么** — 内容驱动的 flex 解析是 bug：dock `flex: 0 1 auto` + body `flex: 1`（basis 0）时，解析高度依赖不稳定的内在尺寸，并通过 `overflow: hidden` 裁切。像素高度让布局确定且可持久化，fill dock 让列无死区，数学可不靠 DOM 单测。

---

## Patch — Launcher recents 加显式 → 打开按钮 — 2026-08-21

**做了什么** — Launcher 右侧"最近"列表的每条 item 上 hover 时多显示一个 → 按钮（与现有 × 删除按钮并列）。点击 → 触发 `openPath(entry.path, entry.name)`，行为与整块 item 点击一致；× 删除按钮保留不变。

- `src/app/launcher/Launcher.tsx` 在 `.recentRemove` 之前插入 `<button class="recentOpen">`，图标是 → 箭头 SVG，`onClick` 调 `openPath` 并 `stopPropagation` 避免冒泡到外层 item 的 onClick 重复触发。
- `src/app/launcher/Launcher.module.css` 抽 `.recentOpen` 与 `.recentRemove` 共享布局（position absolute / 22×22 / opacity 0），通过 `.recentItem:hover` + `:focus-within` 同时显形；新增 `:focus-visible` outline 让键盘用户也能看见。两个按钮分别 `right: 32px` 与 `right: 6px`，间距 4px；`.recentName` / `.recentPath` 的 `padding-right` 从 24px 调到 60px 容纳两个按钮。
- i18n 加 `launcher.openRecent`（en: "Open this workspace" / zh-CN: "打开此工作区" / ja-JP: "このワークスペースを開く"），用于按钮的 `title` 与 `aria-label`。

**为什么** — 现有 `.recentItem` 整块可点（`role="button"`，点哪都开），但视觉上没 affordance — hover 只改 border 色，用户不知道这是可点的。加显式按钮：
- 给"打开"动作明确视觉目标（hover 时出现 → 图标，与 VS Code/常见 IDE 的列表操作一致）
- 保留整块可点行为，**不破坏**老用户习惯
- 屏幕阅读器和键盘用户也能识别（`aria-label` + `:focus-visible` outline）

**为什么 hover 显示而不是 always** — 不抢常态视觉焦点；与现有 × 删除按钮保持一致的克制风格。如果 recents 列表未来变长或常用，可改成 always 显示，但 hover 是更"安静"的默认。

---

## Patch — 关窗口回 Launcher，不退出应用 — 2026-08-21

**做了什么** — 点 X（OS 关闭手势 = 标题栏 X / Alt+F4 / Cmd+W）不再退出应用；编辑器 phase 下点 X 自动回到 Launcher，Launcher phase 下点 X 才真退。Cmd+Q / Quit 菜单仍正常退出。

- `electron/main.ts` 加 `isQuitting` 标志 + `mainWindow.on('close', ...)` 拦截：非 quit 状态下 `event.preventDefault()` 并 `webContents.send('app:before-close')` 通知渲染端。`app.on('before-quit', ...)` 把 `isQuitting` 置 true 让真退走正常路径。新 IPC `app:confirmClose` 让渲染端在"该真关了"时把标志置 true 再调 `mainWindow.close()`。
- `electron/preload.ts` 给 `H5Bridge` 加 `onBeforeClose` / `offBeforeClose` / `confirmClose` 三个方法。`ipcRenderer.on` 没有返回 unsubscribe token，用模块级 `Set<() => void>` 自己广播。
- `src/systems/persistence/electronBridge.ts` 镜像这三个方法。`onBeforeClose` 捕获 `window.h5` 到本地变量再做 narrowing（全局上的 narrowing 不能跨闭包保持）。
- `src/app/WorkspaceGate.tsx` 在 mount 时挂 `onBeforeClose` 单 listener：拿到事件时读 `useWorkspaceStore.getState().phase` 的**当前值**（不是 React state 快照）— phase === 'editor' → 调 `leave()`；phase === 'launcher' → 调 `confirmClose()`。EditorShell 自身的 cleanup（tool teardown、log 卸载、title 复位）走原本的卸载路径。
- 测试 mocks（recentWorkspaces / workspaceIO / documentIO 三个 `H5Bridge` mock）补上三个新方法。

**为什么单一 listener 在 WorkspaceGate 而非 EditorShell / Launcher** — EditorShell 只在 editor phase 挂载，Launcher 只在 launcher phase 挂载。任何一边挂都意味着 phase 翻转时要重挂，且可能漏掉"phase 切换瞬间到达"的关闭事件。WorkspaceGate 是 phase 的真相之源，且永不卸载 — 单一 listener 永不重复。

**为什么 listener 读 `getState()` 而非组件 props 闭包** — listener 是普通函数，闭包里捕获的 `phase` 是 mount 时的快照；phase 翻转后 listener 仍指向旧 phase。`getState()` 拿到当前真值，零 stale 风险。

**为什么是 `event.preventDefault()` + 二次握手而非 `mainWindow.hide()`** — `hide()` 会让窗口从屏幕消失但仍占着资源；用户会以为"应用挂了"。prevent + ping 让 renderer 决定下一步，UX 上是无缝的 phase 翻转（EditorShell 卸载动画、Launcher 立即出现）。

---

## Patch — 修 packaged build 空白（prod dist 路径少一层）— 2026-08-21

**做了什么** — `electron/main.ts` 的 `loadFile` 路径从 `path.join(__dirname, '..', 'dist', 'index.html')` 改成 `'..', '..', 'dist', 'index.html'`。

**为什么** — tsconfig.node.json 的 `rootDir: "."` 加上 `include: ["electron/**/*"]` 把 `electron/main.ts` 编译到 `dist-electron/electron/main.js`。Packaged 后 main.js 落在 `<app.asar>/dist-electron/electron/main.js`，`__dirname` 就在那。原代码 `..` 只上一级到 `dist-electron/`，找不到 `dist/index.html`。Dev 模式走 `loadURL('http://localhost:5173')` 不碰这条路径，所以一直没暴露。

**为什么不在 tsconfig 里改 rootDir** — 改成 `"electron"` 让 main.js 落到 `dist-electron/main.js`，路径就只 `..` 一层。但 vite.config.ts 也被 include 且依赖项目根的 node_modules/alias，改 rootDir 会破坏 vite 的解析。改 runtime 路径是更局部的修复。

---

## Patch — packaged build 白屏 + 关不掉 — 2026-08-21

**做了什么** — 修两个 release-mode bug：
- `vite.config.ts` 加 `base: './'`，让 `dist/index.html` 引用 `./assets/...` 而不是 `/assets/...`。
- `electron/main.ts` close 拦截加 2 秒 `forceCloseTimer` 兜底，renderer 没响应就强退。

**为什么 vite.base** — Vite 默认 `base: '/'` 让 index.html 里 `<script src="/assets/...">` 用绝对路径。Dev 模式走 `http://localhost:5173`，绝对路径解析到 dev server 没问题。**Packaged Electron 用 `loadFile` → `file://` 协议**，绝对路径解析到文件系统根（Windows 上 `file:///C:/assets/...`），404 → JS 不加载 → 白屏。`base: './'` 让路径相对 HTML 文件自身，`file://` 协议下能解析。

**为什么 close failsafe** — `c11d49d` 提的 close handshake（X → ping renderer → renderer 调 `confirmClose`）假设 renderer 活着。如果 renderer boot 时崩了（白屏），ping 永远没回，`preventDefault` 让窗口关不掉，用户只能 task manager 杀进程。Failsafe：setTimeout 2 秒，renderer 没响应就 `isQuitting = true` + `close()`。`confirmClose` handler 调时会 clear 这个 timer。

**为什么是 2 秒不是更长** — 2 秒够健康 renderer 响应（state transition 是同步的），又不至于让崩溃场景下的用户等太久。如果以后发现不够可以调高，但先短。

---

## Patch — 修 close failsafe 在 leave 路径误触发 — 2026-08-21

**做了什么** — 加 `app:cancelClose` IPC：renderer 处理 `app:before-close` 后（无论是 `leave()` 翻回 Launcher 还是 `confirmClose()` 真关）都 ack 一下，让 main 清掉 failsafe timer。renderer 端 WorkspaceGate 在 leave 后调 `cancelClose()`。

**为什么** — 上一条 patch 加的 2 秒 `forceCloseTimer` 是给"renderer 死了"做兜底。但 leave 路径里 renderer **不调** confirmClose（leave 是"留着窗口"），所以 timer 永远没人清。用户点 X 进 Launcher，再点 workspace 进 editor → 2 秒后 timer 触发 → `isQuitting = true` + `win.close()` → 窗口关 → app 退。

加 cancelClose 让 leave 路径也能 ack，timer 正常清掉。confirmClose 路径不影响（confirmClose 自己清 timer + 走 close）。

**为什么不在 main 里让 timer 只在 renderer 死了时存在** — 需要 renderer 状态。phase 住 renderer state，main 不知道当前是 editor 还是 launcher。给 renderer 一个 ack 接口比让 main 问 phase 干净。

---

## Patch — 加应用 icon — 2026-08-21

**做了什么** — 接入设计师交付的 app icon：
- 根目录 `icon.png`（1254×1254 RGBA，1.2 MB）→ `build/icon.png`（electron-builder 母版）
- `ffmpeg` 生成 256×256 favicon → `public/favicon.png`（浏览器 tab + Readme 头图）
- `electron-builder.yml` 给 `win` / `linux` 加 `icon: build/icon.png`
- `index.html` 把 `<link rel="icon" href="/vite.svg">` 换成 `./favicon.png`
- `README.md` 头部加 `![icon](./public/favicon.png)`

**为什么** — electron-builder 标准约定 `build/icon.{png,ico,icns}`。PNG 直接接，electron-builder 自动按平台转 ICO（Win 多分辨率）/ ICNS（mac）/ Linux 用 PNG。

**为什么 favicon 单独一份 256×256** — 浏览器读 1254×1254 太重，256 是 retina tab 的甜点。ffmpeg 一行：`ffmpeg -i build/icon.png -vf scale=256:256 public/favicon.png`。

**为什么不动 Mac icon** — 用户没给 .icns，PNG 能凑合用（electron-builder 自动转 ICNS）。Mac 用户更挑剔，真要交付 mac build 时再考虑出 .icns。

---

## Step 30 — Builtin tilesets (Sprout Lands) + 真实贴图 — 2026-08-20

分三个批准过的子 step（30a assets/registry、30b texture pipeline、30c brush/palette UI）。地图编辑器现在画真实像素艺术地形，不再是染色 placeholder。

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

**为什么 data URL 而不是 `public/` 目录** — public-dir 资源保留绝对路径（`base: '/'`），在 Electron 的 `loadFile` 生产模式会破。把（都 < 10 KB 的）sheets 内联进 JS 包完全绕开路径解析，不用动 `base` 和现有 chunk 布局。workspace `assets/` 目录保持不动 — 把用户资产导入 workspace 是另一个 step。

**为什么橡皮从 "tile id 0" 挪到保留 tileset id** — 真实 tileset 从 0 起编号 tile，所以 `tileId === 0` 不再能代表"擦除"。哨兵对 `('eraser', 0)` 让橡皮保持 brush 层概念（它产 `EraseTileCommand`，从不是 placed tile），而不用保留一个全局 tile id 让 builtin sheet 撞上。

> Next: Step 31 candidates — autotile/bitmap expectations for terrain edges（包里有 bitmask 参考 sheets）、brush 的 flip/rotation UI、workspace asset import。

---

## Post-Step 28 patch 2 — 预加载 sandbox 修复 — 2026-07-18

**做了什么** — 第一个 patch 让"needs Electron"横幅可见；这暴露了更深层的 bug：即使在 `npm run electron:dev` 下跑，`window.h5` 还是 undefined。原因：`electron/main.ts` 有 `webPreferences.sandbox: true`，而 Electron 43 在 ESM preload 用 named imports 从虚拟 `electron` 模块时会静默失败（`import { contextBridge, ipcRenderer } from 'electron'`）。preload 加载、撞上 import、永远到不了 `contextBridge.exposeInMainWorld('h5', api)`，渲染端看见一个缺失的 bridge。

- `electron/main.ts` 把 `sandbox: true` 翻成 `sandbox: false`。`contextIsolation: true` 和 `nodeIntegration: false` 保持 — 这两个才是真正把渲染端从 Node 隔开的。Sandbox 的威胁模型（不信任远程脚本）不适用于加载 Vite（dev）或 `dist/index.html`（prod）的本地编辑器。
- 文件头注释现在记录了这个选择和原因，未来读者不会因为"为了安全"重新开 sandbox 又把 bridge 撞坏。
- `electron/preload.ts` 源码不动 — 关掉 sandbox 就够；只要 `electron` 模块可到达，named-import 形式就正常。

**为什么 `sandbox: false` 在这里是可接受的** — 编辑器从不加载远端内容。`contextIsolation: true` 下渲染端仍然不能直连 Node；它只看见 preload 暴露的强类型表面。`sandbox: true` 对纯本地 app 唯一加的就是 polyfilled preload 环境的成本 — 而这就是咬我们的成本。Step 18 原本的选择（`sandbox: true`）是 Electron 文档的默认值；文档写的是通用场景，不是整个渲染端表面都是 localhost 或 file:// URL 的 app。

---

## Post-Step 28 patch — Launcher Electron-availability 提示 — 2026-07-18

**做了什么** — Launcher 以前在 `npm run dev` 下静默失败，因为 `window.h5` bridge 只由 Electron preload 装上 — `pickFolder` 会调一个 undefined 的函数，用户根本看不到反馈。

- `<Launcher/>` 挂载时调一次 `isElectron()`（一行 `typeof window.h5 !== 'undefined'` 检查）。bridge 缺失时，页面顶部挂一条持续琥珀色横幅，写可操作的 "Run `npm run electron:dev` to launch the editor"，**New Workspace** 和 **Open Folder…** 按钮视觉禁用。
- `handleOpen` 编程触发时短路返回同一条错误，内联在按钮下 — 所以键盘/焦点路径也拿同一提示。
- i18n key `launcher.error.noElectron` 在三个 bundle（en / zh-CN / ja-JP）更新为带 run-command 提示的版本，不只是裸错误。
- `README.md` 把 `npm run electron:dev` 提到首位 dev 命令，文档化 Vite-only preview 行为（Launcher 挂载；按钮禁用并显横幅）。

**为什么横幅加禁用按钮而不是只横幅** — 两条都指向同一个修复比一条鲁棒：横幅回答"为什么页面不一样"，禁用按钮回答"我能点这个吗"，不用用户去试。`handleOpen` 里内联错误覆盖了焦点/键盘仍然走 handler 的边缘情况。

**为什么 `isElectron()` 住 `systems/persistence/` 而不是共享 util** — 它是基于 `window.h5` 的一行探针，只有 Launcher 用得上。提到 `utils/` 会让一个没别的原因要知道 IPC 存在的层引入 bridge 模块。

---

## Step 28 — Command 去重 (A3) — 2026-07-18

**做了什么** — 五个"形状只随 kind 变化"的 Command 现在共用两个基类。

- `editor/map/commands/AddLayerCommand.ts`（33 行）是 `AddTileLayerCommand` / `AddObjectLayerCommand` / `AddCollisionLayerCommand` 的共享基类。每个 wrapper 现在 ~15 行：构造里调 `super('layer:add[-kind]', layer, makeActive)`。五行的 do/undo 对在基类里。
- `editor/map/commands/PlacePlacedObjectCommand.ts`（63 行）是 `PlaceEntityCommand` / `PlaceColliderCommand` 的共享基类。它对 `<TLayerId, TItemId, TPayload extends { id: TItemId }>` 泛型，所以四个 ops（add / appendToLayer / removeFromLayer / remove）能绑到正确的 primitive 而不把 Entity / Collider 类型漏进基类。每个 wrapper 现在 ~50 行，下来不多，但共享的 4 方法体只在一个地方。
- Step 27 的 11 个 Add*LayerCommand 测试和 2 个 Place* 测试不改全过—— 公共 Command 表面（`kind`、`do`、`undo`，外加 `placedEntity` / `placedCollider` getter）保留。
- `CommandBus.execute` 接 wrappers，因为它们 `extends` 实现 `Command` 的基类。

**为什么 `AddLayerCommand` 基类不作为公共类导出** — 三个 wrappers 是唯一 caller — `LayerPanel` 各 import 一个。导出基类会引诱 caller 用 `new AddLayerCommand('layer:foo', ...)` 字符串绕过 layer-kind discriminator。基类文件存在是为了共享形状有单一源；index 只为工具重导出（比如未来 coalescer 想匹配公共基类）。

**为什么 `PlacePlacedObjectCommand` 泛型去到三个参数** — layerId 和 payload id 是不同 brand 类型（`LayerId` vs `EntityId` / `ColliderId`），所以合成一个 `TId` 是死胡同 — ops 包的 `appendToLayer` 得收两个不同类型。三个参数是保持 brand 区分和 ops 精确的最小值。

---

## Step 27 — 核心测试 Phase 2 + 集成 (B6-2) — 2026-07-18

**做了什么** — 测试套现在也覆盖 IO 编排器和 Pixi 端 overlay，把 editor + systems 提出"未测 stub"桶。

- `systems/persistence/recentWorkspaces.test.ts`（13 个用例）覆盖纯 `pushRecent` / `removeRecent` 数学（cap、dedup、顺序）和桥接绑定的 `loadRecents` / `saveRecents` 路径，用 mocked `window.h5`。Browser fallback（无 bridge）单独断言 — 那是测试环境代码路径。
- `systems/persistence/workspaceIO.test.ts`（14 个用例）驱动 `createNewWorkspace`、`openExistingWorkspace`、`loadActiveDocument`、`serializeActiveDocument`。bridge 通过 `setBridge()` helper 换，因为 `window.h5` 是 `readonly`；bridge mock 用 `Promise.resolve({ ok: true as const, ... })` 保持 discriminated-union 收窄。
- `systems/persistence/documentIO.test.ts`（9 个用例）端到端驱动 `saveDocument` / `loadDocument`，含 `<workspace>/documents/<docId>.json` 路径组合、写错误、坏 JSON、"无 active workspace" 守卫。
- `editor/map/commands/AddLayerCommands.test.ts`（11 个用例）覆盖三个 Add*LayerCommand 类。断言 `kind`、`makeActive`，以及 undo 恢复 seed tile 层（在 Command 层重新验证 "removeLayer 拒绝删最后一层" 不变式）。
- `editor/map/commands/RemoveCommands.test.ts`（8 个用例）覆盖 RemoveEntityCommand / RemoveColliderCommand，含 "undo 在每个引用层恢复引用" 路径和 stale-id no-op 用例。
- `editor/map/commands/EraseSelectionCommand.test.ts`（7 个用例）覆盖 tile-only erase + undo 往返、空 cell 跳过、非 tile 选区 no-op。这次测试挖出了一个潜在 bug：`undo` 调 `new PlaceTileCommand(...).undo(service)`，但新 mint 的 Command 从来没调过 `do()`，所以 `prev` 是 `null`，"undo" 实际又把 tile 删了一次。换成直接 `service.setTile(...)` 调用，捕获的 entries 干净往返。覆盖：49 个新用例；测试总数 213 个跨 23 文件。
- `canvas/selection/SelectionOverlay.test.ts`（5 个用例）断言 Pixi 生命周期（容器挂上、`eventMode = none`、destroy 卸载并清订阅），mutating selection / document / view stores 不在订阅路径抛错。

**为什么 bridge mocks 用 `Promise.resolve({ ok: true as const, ... })` 而不是 `async () => ({ ... })`** — `vi.fn(async () => ...)` 把字面量 `true` 加宽成 `boolean`，然后匹配不到 IPC 返回联合的 `{ ok: true }` 分支。`ok` 上显式 `as const` 让 TypeScript 的收窄穿过调用点，调用者不用自己强转。

**为什么 mock `window.h5` 而不是改 IO 让它依赖 bridge** — IO 函数故意在调用时（不是 import 时）读 `window.h5`，这样 vite 的 dev server 没 preload 也能启。mock 全局保住那个契约 — 生产代码路径不变。

---

## Step 26 — 核心测试 Phase 1 (B6-1) — 2026-07-18

**做了什么** — `core/` 现在有 4 个专用测试文件（之前 1 个）。套件从 86 涨到 146 测试。

- `core/command/CommandBus.test.ts`（9 个用例）：execute / undo / redo 顺序、redo 栈在 fresh execute 时清空、每次转移订阅通知、clearHistory 擦两栈、空 undo/redo no-op、一个 wiring 测试锁死 `Command.do(service)` 参数传递契约。
- `core/command/HistoryStack.test.ts`（8 个用例）：LIFO 顺序、push 让 redo 失效、空 pop 返回 null、clear 擦两、文档说明栈不调 `Command.do/undo` — 那是 bus 的活。
- `core/workspace/schema.test.ts`（13 个用例）：`isWorkspaceConfig` 接受格式良好的 config（含未知 extra 字段）、拒绝缺/错类型 `version` / `name` / `activeDocId` / `documents` / `lastSavedAt`。`isRecentList` 拒绝错版本 / 非数组 entries。锁死的行为匹配 IO 期望。
- `core/document/DocumentService.test.ts`（33 个用例）：每个公共 mutator（`setTileSize`、`setMapSize`、`setMeta`、`getMeta`、`setTile`、`getTile`、`addLayer`、`removeLayer`、`setLayerVisible`、`setLayerLocked`、`reorderLayer`、`findLayerIndex`、`layerCount`、`addEntity`、`setEntity`、`getEntity`、`removeEntity`、`appendToObjectLayer`、`removeFromObjectLayer`、`addCollider`、`setCollider`、`getCollider`、`removeCollider`、`appendToCollisionLayer`、`removeFromCollisionLayer`，外加 `snapshot` 和 `subscribe`）。断言 store mutation 和 discriminated `DocumentChange` 负载形状（如 `tile:set` 带 `layerId + coord`；`layer:add` 带 `atIndex`）。Orphan 清理端到端跑：removeEntity 从每个 `ObjectLayer.entityOrder` 剥 id；removeCollider 从每个 `CollisionLayer.colliderOrder` 剥 id。Snapshot / unsubscribe 行为锁死。

**为什么测试断言 `events.length` 而不是 mock-spy 调用计数** — service 的 emitter 是公共契约 — 每个订阅者（Pixi 视图、SelectionOverlay、history store 镜像）都从那里读。断言 `events.length` 和事件形状比数 store-mutation 调用是更强的保证，因为它锁死的是**可观察**契约，不是实现细节。

**为什么 removeEntity / removeCollider 测试不期望每个层的 `objectLayer:remove` 事件** — 当前 service 实现只在 user-driven mutation（显式 `appendToObjectLayer` / `appendToCollisionLayer` 路径）上发每个层的事件。Orphan 清理直接走 store primitive 不重发 — `entity:remove` 是订阅者应该关心的"这东西没了"的规范信号。Step 28（Command 去重）整合 remove 命令时可能复审这点。

**为什么 serializer 测试已经存在（Step 20）** — 它们覆盖 tile / object / collision 往返和坏 JSON 错误路径。Step 26 不重复；33 个新 DocumentService 测试是 Phase 1 的增量。

---

## Step 25 — Shortcut 中央化 (B5) — 2026-07-18

**做了什么** — 四个 shortcut 类变成四个声明式数组；`keydown` listener 从四个塌成一个。

- `systems/shortcut/Shortcut.ts` 声明 `ShortcutBinding`（三 variant discriminated union：`key`、`ctrlKey`、`ctrlShiftKey`）和 `Shortcut` 接口（`id`、`binding`、可选 `when(event)`、`run(event)`）。`matchesBinding` 单独导出让测试可直接驱动。
- `systems/shortcut/registry.ts` 实现 `ShortcutRegistry`：`register()`（重复 id 抛）、`registerAll()`、`list()`、`attach()`（一个 window keydown listener）、`detach()`、`dispatch(event)`（first-match-wins、丢 `repeat`、委托 `isEditableTarget`）。双 attach 时 listener 短路。
- 四个 shortcut 文件（`HistoryShortcuts`、`SelectionShortcuts`、`ToolShortcuts`、`persistence/DocumentIOShortcuts`）变成 `readonly Shortcut[]` 导出 — 没有类，没有 `addEventListener` 调用点。`isEditableTarget` copy-paste 没了；registry 默认守卫委托给 `@utils/index` 的单一实现。
- `EditorShell` 实例化一个 `ShortcutRegistry`，调四次 `registerAll(...)`，挂上并在清理时摘下。旧的 `historyShortcuts.attach()` / `historyShortcuts.detach()` 行没了。
- 测试覆盖：`registry.test.ts`（10 个用例用于 `matchesBinding` 和 `dispatch`），加 Step 24 的 8 个 `isEditableTarget` 用例仍然通过 registry 的默认守卫。

**为什么声明式 `Shortcut[]` 而不是类层级** — 四个现有 shortcut 类 80% 相同 — 同样的 listener 挂/摘、同样的 editable-target 守卫、同样的 `preventDefault` 舞步。类形式让每个新 shortcut 成了 copy-paste 任务，不可能共享 `id` 命名空间。声明式值走一个拥有所有水管的 registry，给测试一个攻击点（`registry.dispatch(ev)`）。

**为什么 first-match-wins 而不是 longest-prefix 或其他策略** — 四个 shortcut 今天的 binding 不相交，所以实践中策略不起作用。First-match-wins 是最便宜推理和测试的策略："如果 shortcut `a` 在 `b` 之前注册，`a` 的 binding 在两个都匹配时赢"。如果未来 shortcut 需要和另一个共享 binding，契约就是"把更具体的那个先注册" — 没有 priority 字段，没有 runtime 注册表。

**为什么 registry 默认丢 `repeat` 和 editable-target 事件，没有 opt-out** — `repeat=true` 事件是按住键发重复笔触的机制；对工具切换 shortcut 那是噪音。可编辑目标抑制是四个 shortcut 文件都各自记得加的安全网 — 提到 registry 意味着未来 shortcut 作者不会意外忘掉。真要在 repeat 上触发的 shortcut 可以自己在 `run()` 里读 `event.repeat`。

---

## Step 24 — Extension Registry + Tool interface (A1) — 2026-07-18

**做了什么** — CLAUDE.md §5 的 "Editor extension points" 表有了具体形状，每个具体工具实现共享接口，五个 stub 目录（`core/extension`、`core/history`、`utils`、`shared/constants`、`assets`）各扮演真实角色。

- `shared/tool/Tool.ts` 是每个编辑器工具实现的接口：无参构造、`attach(canvas)` 装 DOM listener、`detach()` 摘，加 `id` 和 `labelKey`。接口住 `shared/`（不是 `editor/map/tools/`），因为 `core/extension/` 和编辑器工具都要 import 它而不跨 `core → editor` 边界。
- 七个 Map 编辑器工具（`BrushTool`、`EraserTool`、`PanTool`、`RectTool`、`SelectTool`、`EntityTool`、`ColliderTool`）全改写为 `implements Tool`。构造不再收 `canvas`；`EditorShell` 调 `new BrushTool(); brush.attach(canvas); ... brush.detach();` 在 `PixiRenderer.start()` resolve 之后。净效果：工具可以在运行时通过 registry 换，不用改写 shell。
- `core/extension/types.ts` 声明 `EditorExtension`、`ToolDefinition`、`PanelDefinition`、`CommandPaletteEntry`、`DocumentSerializer` 和 `EditorRegistry` 表面。`core/extension/registry.ts` 实现 `ExtensionRegistry` — 四个表面的 install / lookup，每个 register 调用的 duplicate-id 守卫，有序 `listExtensions()` 用于 boot 自省。
- 五个 stub 目录不再为空：
  - `core/extension/index.ts` — 真正的 barrel（`ExtensionRegistry` + types）。
  - `core/history/index.ts` — 从 `@core/command/HistoryStack` 重导出 `HistoryStack`（规范名）。
  - `utils/` — `ids.ts`（`generatePrefixedId` / `generateId`）、`timing.ts`（debounce / throttle，timer-driven 所以在 fake timer 下确定）、`deepFreeze.ts`、`dom.ts`（之前在 4 个 shortcut 文件里 copy-paste 的 `isEditableTarget` helper）。
  - `shared/constants/` — `MIN_BOX_SIZE`、`DEFAULT_CANVAS_PADDING`、`DEFAULT_GRID_COLOR` 从工具/视图文件抬出。
  - `assets/` — 留为保留 stub（v0.1 placeholder palette 还不需要真 loader）。
- 测试覆盖：`registry.test.ts`（8 个用例：install、lookup、四表面 dedup 守卫、多工具 bundle）、`dom.test.ts`（8 个 `isEditableTarget` 用例含 INPUT[type=button] 非编辑和 contentEditable）、`timing.test.ts`（5 个 debounce + throttle 用例含 trailing-edge 合并）。

**为什么 `Tool` 住 `shared/` 而不是 `editor/map/tools/`** — `core/extension` registry 需要引用接口（它的 `ToolDefinition.factory: () => Tool` 返回它），但 ESLint 边界禁 `core` import `editor`。接口挪到 `shared/tool/` 让它在一个 `core` 和 `editor` 都能看见、不破坏规则的层。

**为什么 `throttle` 是 timer-driven 而不是 `Date.now`-driven** — 旧 throttle 用 `Date.now()` 量窗口。Vitest 的 fake timer 在 happy-dom 下不自动推进 `Date.now()`，trailing-edge 测试发飘。换到只用 `setTimeout` 的实现，让 wrapper 在任何时钟 mock 下完全确定 — 这对未来任何性能敏感 caller 也是想要的属性。

**为什么 stub 目录现在有内容了** — CLAUDE.md 从 Step 1 就引用 `core/extension/`、`core/history/`、`utils/`、`shared/constants/`。把它们留为空的 `export {}` 是最糟的：它们暗含的契约不真，未来编辑器作者落进一个无东西可 import 的目录。Step 24 要么兑现契约（registry、history barrel、util helpers、shared constants），要么记录保留（`assets/`）。

---

## Step 23 — TileLayerView 性能（差量绘制）(B3) — 2026-07-18

**做了什么** — TileLayerView 不再在每次 store 变更时重建整个容器。每 cell 更新 mutate 单个 sprite；只有 insert/remove 真的分配。

- `canvas/tile-layer/TileLayerView.ts` 持一个 `Map<LayerId, Map<TileCoordKey, Sprite>>` 按 tile coord 索引。每层还存 `LayerSnapshot { tiles; tileSize }`，所以 tileSize-only mutation（如 `SetTileSizeCommand`）走 resize 路径不做全 diff。
- `diffTileSprites` 导出为纯 helper。冷启动（`prev === undefined`）加每条；暖通走 `prev.keys()` 拿 removals 和 `next.entries()` 拿 adds / mutations，复用现有 `Sprite` 实例只重染/重定位改的 cell。
- No-op 快路径留在 renderNode 边界：如果 `tilesEqual(prev.tiles, next.tiles)` *且* `tileSize` 不变，`renderNode` 立即返回 — 无 diff 遍历，无 Pixi mutation。
- `applyPlacement` mutate 现有 sprite 的 `tint / width / height / x / y`。Rotation / flip 仍透传 schema（placeholder palette 只变 tileId），但缝在位，等 v0.2 plugin renderer 落地时用。
- `TileLayerView.test.ts`（6 个用例）的测试覆盖用 `Container` 和假 `tiles` map 直接驱动 `diffTileSprites`：冷启动、no-op、add、remove、mutate-in-place、resize。测试断言 `sprites.size`、`container.children.length`，以及改的 cell 复用同一 `Sprite` 实例（无 churn）。

**为什么增量 sprite diff 而不是 `ParticleContainer` 或全局 sprite 池** — 三个原因。(1) 代码库每个可见 tile 一个 `Sprite`，不是每 (tileset, palette slot) 一个。`ParticleContainer` 会强制属性包布局，placeholder palette 不需要。(2) 每 cell mutation 干净映射到 Step 22 的 `tile:set` 负载 — 同类更新同路落地。(3) 跨层池复用需要 key-stable 身份，每层 Map 已经提供，会重构刚抽出来的 LayerView 生命周期。

**为什么 `LayerSnapshot` 跟 sprite Map 一起** — `SetTileSizeCommand` 不动 `tiles` 本身；它改 `meta.tileSize`。没 snapshot 的话，no-op 快路径在第二次同值 `setTileSize` 上跳过 resize（假阳性：map 相等但 cell 尺寸过期）。snapshot 带 `tileSize` 让那种情况正确。

---

## Step 22 — DocumentChange 负载 + LayerView 基类 (A2 + A6) — 2026-07-18

**做了什么** — Pixi 订阅者现在可以选定向更新不丢无 op 跳过，三个 LayerView 文件共享一个容器生命周期 / rAF-debounce / 重排序实现。

- `core/document/DocumentService.ts` 把 `DocumentChange` 从 `{ kind: string }` 升级成 17 variant discriminated union。每个 variant 带定位信息让聚焦订阅者所需：`tile:set { layerId; coord }`、`layer:add { layer; atIndex }`、`entity:set { entity }`、`objectLayer:append { layerId; entityId }` 等等。不关心特定 kind 的订阅者继续工作 — 他们对新的 tag 比 `c.kind === '...'` 就够了。
- Emitter 端 rAF 合并考虑过被 Step 22 拒绝。Pixi 层视图在基类层已经 rAF-debounce，异步分发会强迫订阅者（特别是 `SelectionOverlay`）只读 state 也得 await frame。如果未来非 Pixi 订阅者真需要批处理，那是触发。
- `canvas/layers/LayerView.ts` 是新的泛型基类：`class LayerView<TLayer extends Layer>`。它拥有 Pixi 容器层级（一个 root + 每可见层一个子容器）、通过 `protected scheduleRender()` 的 rAF-debounce 重绘、drop-stale / add-new / reorder-three-step 和 destroy 生命周期。
- 子类（`TileLayerView`、`ObjectLayerView`、`CollisionLayerView`）实现三个抽象槽：`subscribeToSource()`（一个 Zustand 订阅返回 unsubscribe）、`filterLayer(): l is TLayer`、`renderNode(node, layer)` — 内容漂移唯一处理处。每层 diff state（`Map<LayerId, TContentState>`）住子类因为视图特定。
- `editor/map/schema/events.ts` 删了。它是个前向的、愿望中的 `DocumentChange` 带 `MapId` 负载 — 从未 import，从未发，现在被活的 `core/document/DocumentService.DocumentChange` 联合取代。
- 文件预算：基类 ~140 行（含注释），三个子类从 130-170 各塌到 ~85-110。仅生命周期 boilerplate 的每子类瘦身是 ~70%。

**为什么基类现在，Step 23 每 cell diff 工作之前** — Step 23 只需重写 `TileLayerView.renderNode` 体去 mutate 一个 sprite 而不是重建。生命周期抽出来后，那是局部改不是整重写。如果 Step 22 跳过基类，Step 23 要么一次重写三个 LayerView 文件，要么分两次落地（一次生命周期，一次内容 diff）。

**为什么 discriminated `kind` 而不是运行时 `kind: string`** — 三个原因。(1) `c.kind === 'tile:set'` 收窄 discriminant 并给订阅者 in-scope `coord` 不重查。(2) 加新 variant 在每个 `switch (c.kind)` 上类型检查 — 编译器惩罚过期匹配。(3) `DocumentChange` 成为未来"带扩展的编辑器"用来声明自己 variant 的契约 — 没运行时注册，没符号魔法。

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

**为什么单独的 `DocumentMeta` 字段而不是把 `tileSize` / `mapSize` 放 `MapData`** — 两个原因。(1) `Document` 现在是 save/load 单位；把这些标量 hoist 到 `meta` 上让 wire format 与 schema 一对一。(2) `MapData` 是前向形 — 当第二个 map 真实，每个 `MapData` 带自己 `tileSize`，项目 meta 保留 workspace 级默认值。现在拉动 `MapData` 触发器会强迫每个命令冗余重写。

---

## Step 20 — v0.1 hotfix (B4 + B2 + B1) — 2026-07-18

**做了什么** — 三个低风险 hotfix 打包：序列化器守卫、空 workspace 文档 bootstrap、menu-bar 项目名显示。

- `core/serialization/documentSerializer.ts` 加输入守卫：缺 `version`、`layers` 非数组、cell 引用不存在的 tileset id 抛明确错（之前静默接受）。
- `systems/persistence/workspaceIO.ts` 让 `createNewWorkspace` 写出最小可加载 `documents/<activeDocId>.json`（seed 一个空 tile 层，meta 用项目默认 tileSize/mapSize），而不是让 launcher 进 editor 后看见空白。
- `EditorShell` MenuBar 把项目名从硬编码 "Untitled Project" 换成 `workspaceStore.activeRef?.name`，OS 标题栏同步更新。

**为什么打包三个 hotfix 而不是分三个 PR** — 都是面向 v0.1 首次运行用户的"裸跑不再尴尬"问题，没有一个独立值得拆 PR。打一起符合 §12 的精神 — 专注但允许单一原子主题的微批。

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

**为什么选区是单一 discriminated union 而不是三个并行字段** — 每个选区恰好挑一个 kind。强制 union 意味着消费者（`EraseSelectionCommand`、`StatusBar`、`PropertiesPanel`、`SelectionShortcuts`）必须显式收窄 — 编译器抓到任何混 kind 的路径。字段式设计（"`entityId?` + `colliderId?` + ... + 一个 `kind` discriminator"）重新引入了 discriminated union 想去掉的所有组合。

---

## Step 18 — Workspace + Launcher — 2026-07-18

**做了什么** — 编辑器现在 boot 进 workspace 选择器（`<Launcher/>`）而不是无条件挂载编辑器，所有文档持久化范围限到用户自己拥有的文件夹。

- workspace = 用户选的一个文件夹。文件夹含 `h5-editor.json`（`WorkspaceConfig`）加 `documents/<id>.json` 文件和空 `assets/` skeleton。schema 支持 `documents[]` 表，所以未来多 doc UI 不需要迁移磁盘形；v0.1 一个 workspace 一个文档。
- `core/workspace/schema.ts` 装纯类型和布局常量（`WorkspaceRef`、`WorkspaceConfig`、`RecentEntry`、`WORKSPACE_CONFIG_FILENAME`、`MAX_RECENT_ENTRIES` 等）。渲染端和 Electron 主进程都从这 import，所以文件名/版本 bump 有单一源。
- `state/workspaceStore.ts` 持 UI-only 阶段 + 内存里的 recents 镜像。ESLint 禁 `state/` import `systems/`，所以 store *不能* 驱动 IPC。真正的 recents 加载/保存走 `systems/persistence/recentWorkspaces.ts`，由 `<Launcher/>` 组装。
- `systems/persistence/workspaceIO.ts` 是 workspace-scoped 编排器：`createNewWorkspace(name)`（folder 选择器 + 文件 bootstrap，返回 ref + active doc id）、`openExistingWorkspace`（stat config）、`loadActiveDocument`（hydrate 文档 store 并重置选区/历史）。
- `systems/persistence/documentIO.ts` 现在严格 workspace-scoped。Save 写到 `<workspace>/documents/<activeDocId>.json`；Load 重读（一个手动"回到磁盘"手势）。Step 16 的 localStorage fallback **删了**：有了 launcher，"没 workspace 就没有文档"是正确规则而不是魔法最后快照。Outcomes discriminate on `path: string`（从不 null）反映新的总是 workspace-backed 存储。
- `electron/main.ts` + `electron/preload.ts` 获得 dialog + workspace + recents IPC 表面（`dialog:pickFolder`、`workspace:{create,stat,listDocuments,readDocument,writeDocument}`、`recents:{load,save}`）。Recents 住主端的 `app.getPath('userData')`；渲染端从不命名文件。
- `app/WorkspaceGate.tsx` 在 `workspaceStore.phase` 上选 `<Launcher/>` vs `<EditorShell/>`。`app/launcher/Launcher.tsx` 是全屏 UI（brand + actions + recents list）。`app/App.tsx` 现在是 `<WorkspaceGate/>`。File → Back to Launcher（加在 `EditorShell.tsx` 的 `fileActions`）不碰磁盘回到 launcher。

**为什么 Launcher 住 `app/` 而不是 `panels/`** — Launcher 存在的全部理由是在 React UI 和 Electron IPC（`systems/`）之间调停；ESLint 边界禁 `panels/` import `systems/`，所以唯一合法的家是 `app/`。`panels/` 保持"永远是被动的 core + state 消费者"身份。

**为什么 localStorage fallback 被删而不是禁用** — 从不触发的 fallback 是死代码。Launcher 是 Step 18 的唯一合法入口；编辑器阶段外的 Ctrl+S / Ctrl+O 现在 log 清晰错误并停止，这正是有意"没 workspace 就没有文档"规则应该的样子。

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

**为什么 Collision layer / collider 数据住 `documentStore` 而不是 Pixi 场景图** — 跟 Step 13 同理 — `CollisionLayerView` 订阅 `useDocumentStore` 并重建。Orphan 清理模式（`removeCollider` 从每个 `CollisionLayer.colliderOrder` 剥 dangling id）意味着命令只需捕获 refs 为 undo，不用追踪它们。

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

**为什么 Object layer / entity 数据住 `documentStore` 而不是 Pixi 场景图** — PixiJS 视图必须订阅 plain-data store。`ObjectLayerView` 读 `useDocumentStore` 并在 rAF debounce 上重建它的 Container — 一处处理顺序、可见性、和 entity 表，全从单一数据源。

---

## v0.1 closed loop + 5-year skeleton（Step 1-12） — 2026-07 之前

已完成的早期 step 详见 `README.md` 的 Roadmap 表。架构决策（Document 单一源、Command 总线、模块边界、命名约定）即从那时沉淀下来作为本档当前生效的 §1-§15 规则。

---

## Step 路线图（计划中 / 推迟）

- **Step 29 — SelectionStrategy 注册表 (A5)** — 推迟到第 4 种选区 kind 落地才做（参见计划）。
- **Step 31 candidates** — terrain edges 的 autotile/bitmap 期望、brush 的 flip/rotation UI、workspace asset import。