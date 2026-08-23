# 2026-08 · Electron

> 主进程、preload、IPC、打包、icon 的演进。
> 2026-07 的 sandbox 修复 patch 见 [../2026-07/electron.md](../2026-07/electron.md)。

---

## Patch — 修 close failsafe 在 leave 路径误触发 — 2026-08-21

**做了什么** — 加 `app:cancelClose` IPC：renderer 处理 `app:before-close` 后（无论是 `leave()` 翻回 Launcher 还是 `confirmClose()` 真关）都 ack 一下，让 main 清掉 failsafe timer。renderer 端 WorkspaceGate 在 leave 后调 `cancelClose()`。

**为什么** — 上一条 patch 加的 2 秒 `forceCloseTimer` 是给"renderer 死了"做兜底。但 leave 路径里 renderer **不调** confirmClose（leave 是"留着窗口"），所以 timer 永远没人清。用户点 X 进 Launcher，再点 workspace 进 editor → 2 秒后 timer 触发 → `isQuitting = true` + `win.close()` → 窗口关 → app 退。

加 cancelClose 让 leave 路径也能 ack，timer 正常清掉。confirmClose 路径不影响（confirmClose 自己清 timer + 走 close）。

**为什么** — 不在 main 里让 timer 只在 renderer 死了时存在：需要 renderer 状态。phase 住 renderer state，main 不知道当前是 editor 还是 launcher。给 renderer 一个 ack 接口比让 main 问 phase 干净。

---

## Patch — packaged build 白屏 + 关不掉 — 2026-08-21

**做了什么** — 修两个 release-mode bug：
- `vite.config.ts` 加 `base: './'`，让 `dist/index.html` 引用 `./assets/...` 而不是 `/assets/...`。
- `electron/main.ts` close 拦截加 2 秒 `forceCloseTimer` 兜底，renderer 没响应就强退。

**为什么** — vite.base：Vite 默认 `base: '/'` 让 index.html 里 `<script src="/assets/...">` 用绝对路径。Dev 模式走 `http://localhost:5173`，绝对路径解析到 dev server 没问题。**Packaged Electron 用 `loadFile` → `file://` 协议**，绝对路径解析到文件系统根（Windows 上 `file:///C:/assets/...`），404 → JS 不加载 → 白屏。`base: './'` 让路径相对 HTML 文件自身，`file://` 协议下能解析。

**为什么** — close failsafe：`c11d49d` 提的 close handshake（X → ping renderer → renderer 调 `confirmClose`）假设 renderer 活着。如果 renderer boot 时崩了（白屏），ping 永远没回，`preventDefault` 让窗口关不掉，用户只能 task manager 杀进程。Failsafe：setTimeout 2 秒，renderer 没响应就 `isQuitting = true` + `close()`。`confirmClose` handler 调时会 clear 这个 timer。

**为什么** — 是 2 秒不是更长：2 秒够健康 renderer 响应（state transition 是同步的），又不至于让崩溃场景下的用户等太久。如果以后发现不够可以调高，但先短。

---

## Patch — 修 packaged build 空白（prod dist 路径少一层）— 2026-08-21

**做了什么** — `electron/main.ts` 的 `loadFile` 路径从 `path.join(__dirname, '..', 'dist', 'index.html')` 改成 `'..', '..', 'dist', 'index.html'`。

**为什么** — tsconfig.node.json 的 `rootDir: "."` 加上 `include: ["electron/**/*"]` 把 `electron/main.ts` 编译到 `dist-electron/electron/main.js`。Packaged 后 main.js 落在 `<app.asar>/dist-electron/electron/main.js`，`__dirname` 就在那。原代码 `..` 只上一级到 `dist-electron/`，找不到 `dist/index.html`。Dev 模式走 `loadURL('http://localhost:5173')` 不碰这条路径，所以一直没暴露。

**为什么** — 不在 tsconfig 里改 rootDir：改成 `"electron"` 让 main.js 落到 `dist-electron/main.js`，路径就只 `..` 一层。但 vite.config.ts 也被 include 且依赖项目根的 node_modules/alias，改 rootDir 会破坏 vite 的解析。改 runtime 路径是更局部的修复。

---

## Patch — 关窗口回 Launcher，不退出应用 — 2026-08-21

**做了什么** — 点 X（OS 关闭手势 = 标题栏 X / Alt+F4 / Cmd+W）不再退出应用；编辑器 phase 下点 X 自动回到 Launcher，Launcher phase 下点 X 才真退。Cmd+Q / Quit 菜单仍正常退出。

- `electron/main.ts` 加 `isQuitting` 标志 + `mainWindow.on('close', ...)` 拦截：非 quit 状态下 `event.preventDefault()` 并 `webContents.send('app:before-close')` 通知渲染端。`app.on('before-quit', ...)` 把 `isQuitting` 置 true 让真退走正常路径。新 IPC `app:confirmClose` 让渲染端在"该真关了"时把标志置 true 再调 `mainWindow.close()`。
- `electron/preload.ts` 给 `H5Bridge` 加 `onBeforeClose` / `offBeforeClose` / `confirmClose` 三个方法。`ipcRenderer.on` 没有返回 unsubscribe token，用模块级 `Set<() => void>` 自己广播。
- `src/systems/persistence/electronBridge.ts` 镜像这三个方法。`onBeforeClose` 捕获 `window.h5` 到本地变量再做 narrowing（全局上的 narrowing 不能跨闭包保持）。
- `src/app/WorkspaceGate.tsx` 在 mount 时挂 `onBeforeClose` 单 listener：拿到事件时读 `useWorkspaceStore.getState().phase` 的**当前值**（不是 React state 快照）— phase === 'editor' → 调 `leave()`；phase === 'launcher' → 调 `confirmClose()`。EditorShell 自身的 cleanup（tool teardown、log 卸载、title 复位）走原本的卸载路径。
- 测试 mocks（recentWorkspaces / workspaceIO / documentIO 三个 `H5Bridge` mock）补上三个新方法。

**为什么** — 单一 listener 在 WorkspaceGate 而非 EditorShell / Launcher：EditorShell 只在 editor phase 挂载，Launcher 只在 launcher phase 挂载。任何一边挂都意味着 phase 翻转时要重挂，且可能漏掉"phase 切换瞬间到达"的关闭事件。WorkspaceGate 是 phase 的真相之源，且永不卸载 — 单一 listener 永不重复。

**为什么** — listener 读 `getState()` 而非组件 props 闭包：listener 是普通函数，闭包里捕获的 `phase` 是 mount 时的快照；phase 翻转后 listener 仍指向旧 phase。`getState()` 拿到当前真值，零 stale 风险。

**为什么** — 是 `event.preventDefault()` + 二次握手而非 `mainWindow.hide()`：`hide()` 会让窗口从屏幕消失但仍占着资源；用户会以为"应用挂了"。prevent + ping 让 renderer 决定下一步，UX 上是无缝的 phase 翻转（EditorShell 卸载动画、Launcher 立即出现）。

---

## Patch — dev 模式 BrowserWindow 不显 icon — 2026-08-21

**做了什么** — `electron/main.ts` 的 `BrowserWindow` 构造加 `icon: path.join(__dirname, '..', '..', 'build', 'icon.png')`。

**为什么** — packaged .exe 的图标来自 electron-builder 把 `build/icon.png` 嵌进 .exe 资源（OS 从可执行文件读），所以 packaged 任务栏/Alt-Tab 显示正常。dev 模式 `npm run electron:dev` 用的是 stock electron.exe，没嵌入图标；BrowserWindow 不显式设 `icon` 选项时显示 Electron 默认 logo。

dev 路径解析：`__dirname` = `dist-electron/electron/`，`'..', '..'` 回到项目根 → `build/icon.png` ✓。Packaged 路径解析：`__dirname` = `<app.asar>/dist-electron/electron/`，回到 `<app.asar>/`，但 `build/` 不在 asar（electron-builder.yml 的 files 列表没包含）→ 文件找不到 → Windows OS 兜底用 .exe 嵌入图标，不影响。

**为什么** — 不用 `isDev` 分支：一份代码双行为更稳；packaged 路径找不到 icon 时 OS 兜底，不需要 if/else 切换。

---

## Patch — 加应用 icon — 2026-08-21

**做了什么** — 接入设计师交付的 app icon：
- 根目录 `icon.png`（1254×1254 RGBA，1.2 MB）→ `build/icon.png`（electron-builder 母版）
- `ffmpeg` 生成 256×256 favicon → `public/favicon.png`（浏览器 tab + Readme 头图）
- `electron-builder.yml` 给 `win` / `linux` 加 `icon: build/icon.png`
- `index.html` 把 `<link rel="icon" href="/vite.svg">` 换成 `./favicon.png`
- `README.md` 头部加 `![icon](./public/favicon.png)`

**为什么** — electron-builder 标准约定 `build/icon.{png,ico,icns}`。PNG 直接接，electron-builder 自动按平台转 ICO（Win 多分辨率）/ ICNS（mac）/ Linux 用 PNG。

**为什么** — favicon 单独一份 256×256：浏览器读 1254×1254 太重，256 是 retina tab 的甜点。ffmpeg 一行：`ffmpeg -i build/icon.png -vf scale=256:256 public/favicon.png`。

**为什么** — 不动 Mac icon：用户没给 .icns，PNG 能凑合用（electron-builder 自动转 ICNS）。Mac 用户更挑剔，真要交付 mac build 时再考虑出 .icns。

---
