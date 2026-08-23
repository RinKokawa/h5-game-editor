# 2026-07 · Electron

> 主进程、preload、IPC、Electron 打包相关问题的演进。
> 2026-08 的打包 / 启动 / icon 系列补丁见 [../2026-08/electron.md](../2026-08/electron.md)。

---

## Post-Step 28 patch 2 — 预加载 sandbox 修复 — 2026-07-18

**做了什么** — 第一个 patch 让"needs Electron"横幅可见；这暴露了更深层的 bug：即使在 `npm run electron:dev` 下跑，`window.h5` 还是 undefined。原因：`electron/main.ts` 有 `webPreferences.sandbox: true`，而 Electron 43 在 ESM preload 用 named imports 从虚拟 `electron` 模块时会静默失败（`import { contextBridge, ipcRenderer } from 'electron'`）。preload 加载、撞上 import、永远到不了 `contextBridge.exposeInMainWorld('h5', api)`，渲染端看见一个缺失的 bridge。

- `electron/main.ts` 把 `sandbox: true` 翻成 `sandbox: false`。`contextIsolation: true` 和 `nodeIntegration: false` 保持 — 这两个才是真正把渲染端从 Node 隔开的。Sandbox 的威胁模型（不信任远程脚本）不适用于加载 Vite（dev）或 `dist/index.html`（prod）的本地编辑器。
- 文件头注释现在记录了这个选择和原因，未来读者不会因为"为了安全"重新开 sandbox 又把 bridge 撞坏。
- `electron/preload.ts` 源码不动 — 关掉 sandbox 就够；只要 `electron` 模块可到达，named-import 形式就正常。

**为什么** — `sandbox: false` 在这里是可接受的：编辑器从不加载远端内容。`contextIsolation: true` 下渲染端仍然不能直连 Node；它只看见 preload 暴露的强类型表面。`sandbox: true` 对纯本地 app 唯一加的就是 polyfilled preload 环境的成本 — 而这就是咬我们的成本。Step 18 原本的选择（`sandbox: true`）是 Electron 文档的默认值；文档写的是通用场景，不是整个渲染端表面都是 localhost 或 file:// URL 的 app。
