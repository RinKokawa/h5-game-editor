# 2026-07 · Workspace

> Workspace 选择器、Launcher、recent workspaces、document IO 编排 的演进。

---

## Post-Step 28 patch — Launcher Electron-availability 提示 — 2026-07-18

**做了什么** — Launcher 以前在 `npm run dev` 下静默失败，因为 `window.h5` bridge 只由 Electron preload 装上 — `pickFolder` 会调一个 undefined 的函数，用户根本看不到反馈。

- `<Launcher/>` 挂载时调一次 `isElectron()`（一行 `typeof window.h5 !== 'undefined'` 检查）。bridge 缺失时，页面顶部挂一条持续琥珀色横幅，写可操作的 "Run `npm run electron:dev` to launch the editor"，**New Workspace** 和 **Open Folder…** 按钮视觉禁用。
- `handleOpen` 编程触发时短路返回同一条错误，内联在按钮下 — 所以键盘/焦点路径也拿同一提示。
- i18n key `launcher.error.noElectron` 在三个 bundle（en / zh-CN / ja-JP）更新为带 run-command 提示的版本，不只是裸错误。
- `README.md` 把 `npm run electron:dev` 提到首位 dev 命令，文档化 Vite-only preview 行为（Launcher 挂载；按钮禁用并显横幅）。

**为什么** — 横幅加禁用按钮而不是只横幅：两条都指向同一个修复比一条鲁棒：横幅回答"为什么页面不一样"，禁用按钮回答"我能点这个吗"，不用用户去试。`handleOpen` 里内联错误覆盖了焦点/键盘仍然走 handler 的边缘情况。

**为什么** — `isElectron()` 住 `systems/persistence/` 而不是共享 util：它是基于 `window.h5` 的一行探针，只有 Launcher 用得上。提到 `utils/` 会让一个没别的原因要知道 IPC 存在的层引入 bridge 模块。

---

## Step 20 — v0.1 hotfix (B4 + B2 + B1) — 2026-07-18

> 这个 step 是 hotfix bundle，三个改动打包：serializer 守卫、empty workspace bootstrap、MenuBar 项目名。
> Serializer 部分见 [document.md](./document.md) 的后续 step 引用；这里写另外两个 + bundle 的整体理由。

**做了什么** — 三个低风险 hotfix 打包：

- **Serializer 守卫 (B4)** — `core/serialization/documentSerializer.ts` 加输入守卫：缺 `version`、`layers` 非数组、cell 引用不存在的 tileset id 抛明确错（之前静默接受）。具体落到 [document.md](./document.md) 相关 step 的引用链里。
- **空 workspace 文档 bootstrap (B2)** — `systems/persistence/workspaceIO.ts` 让 `createNewWorkspace` 写出最小可加载 `documents/<activeDocId>.json`（seed 一个空 tile 层，meta 用项目默认 tileSize/mapSize），而不是让 launcher 进 editor 后看见空白。
- **MenuBar 项目名 (B1)** — `EditorShell` MenuBar 把项目名从硬编码 "Untitled Project" 换成 `workspaceStore.activeRef?.name`，OS 标题栏同步更新。

**为什么** — 打包三个 hotfix 而不是分三个 PR：都是面向 v0.1 首次运行用户的"裸跑不再尴尬"问题，没有一个独立值得拆 PR。打一起符合 §12 的精神 — 专注但允许单一原子主题的微批。

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

**为什么** — Launcher 住 `app/` 而不是 `panels/`：Launcher 存在的全部理由是在 React UI 和 Electron IPC（`systems/`）之间调停；ESLint 边界禁 `panels/` import `systems/`，所以唯一合法的家是 `app/`。`panels/` 保持"永远是被动的 core + state 消费者"身份。

**为什么** — localStorage fallback 被删而不是禁用：从不触发的 fallback 是死代码。Launcher 是 Step 18 的唯一合法入口；编辑器阶段外的 Ctrl+S / Ctrl+O 现在 log 清晰错误并停止，这正是有意"没 workspace 就没有文档"规则应该的样子。
