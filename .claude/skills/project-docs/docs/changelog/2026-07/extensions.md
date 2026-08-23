# 2026-07 · Extensions

> 编辑器扩展点：Extension Registry、Tool interface、stub 目录填充。

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

**为什么** — `Tool` 住 `shared/` 而不是 `editor/map/tools/`：`core/extension` registry 需要引用接口（它的 `ToolDefinition.factory: () => Tool` 返回它），但 ESLint 边界禁 `core` import `editor`。接口挪到 `shared/tool/` 让它在一个 `core` 和 `editor` 都能看见、不破坏规则的层。

**为什么** — `throttle` 是 timer-driven 而不是 `Date.now`-driven：旧 throttle 用 `Date.now()` 量窗口。Vitest 的 fake timer 在 happy-dom 下不自动推进 `Date.now()`，trailing-edge 测试发飘。换到只用 `setTimeout` 的实现，让 wrapper 在任何时钟 mock 下完全确定 — 这对未来任何性能敏感 caller 也是想要的属性。

**为什么** — stub 目录现在有内容了：CLAUDE.md 从 Step 1 就引用 `core/extension/`、`core/history/`、`utils/`、`shared/constants/`。把它们留为空的 `export {}` 是最糟的：它们暗含的契约不真，未来编辑器作者落进一个无东西可 import 的目录。Step 24 要么兑现契约（registry、history barrel、util helpers、shared constants），要么记录保留（`assets/`）。
