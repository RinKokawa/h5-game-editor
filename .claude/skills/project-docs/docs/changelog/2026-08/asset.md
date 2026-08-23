# 2026-08 · Asset 基础设施 (Step 30-A)

> Step 30-A：framework-level 资产管理。`AssetRef` 加 `semanticKind`；`AssetService` / `AssetManifest` / `AssetStore` 落地；`AssetBrowserPanel` 按 semanticKind 分组 + 显示 builtin + import；`ImportAssetDialog` 文件选择 import。
> 设计依据：[`docs/architecture/asset-management-design.md`](../../../../docs/architecture/asset-management-design.md) + [前端 §8](../../../../docs/frontend-structure.md)。

---

## Step 30-A — Asset 基础设施落地 — 2026-08-23

**做了什么**

Schema 层：
- `src/editor/map/schema/asset.ts` — `AssetRef` 加 `semanticKind` 字段；新 `SemanticKind` 联合（`tileset | sprite | theme | font | audio`）；`semanticToPhysical` 映射；`extensionToSemantic`（排除图片歧义）；`AssetId` branded type + `asAssetId`；`isBuiltinAssetId`。
- `editor/map/schema/index.ts` barrel 同步导出新类型。
- `editor/map/palette/builtinTilesets.ts` — `defineTileset` 加 `semanticKind: 'tileset'` 到 `AssetRef`。

Runtime 层（新建 `src/core/asset/`）：
- `types.ts` — `AssetEntry` / `AssetManifest` / `MANIFEST_VERSION = 1` / `EMPTY_MANIFEST` / `isAssetManifest` / `isBuiltinEntry`。
- `manifest.ts` — `loadManifest(workspaceRoot)` / `saveManifest(workspaceRoot, manifest)`，走 Electron IPC（`fs:readJson` / `fs:writeJson`）；非 Electron 路径降级为 `EMPTY_MANIFEST` / 结构化失败。
- `AssetService.ts` — 唯一 manifest mutator：`addAsset` / `removeAsset` / `renameAsset` / `getAsset` / `listByKind` / `listBuiltins` / `listImported` / `subscribe`；builtin 操作抛 throw；`AssetChange` 事件。
- `assetServiceSingleton.ts` — 单例。
- `registerBuiltinAssets.ts` — boot 时调；idempotent（duplicate 注册 silent skip）。
- `index.ts` — barrel。

State 层：
- `src/state/assetStore.ts` — Zustand mirror；`activeKind` tab state；订阅 service 自动同步；`addAsset` / `removeAsset` / `renameAsset` / `setManifest` / `reset` / `setActiveKind`。

UI 层：
- `src/panels/asset-browser/AssetBrowserPanel.tsx` 重做 — semanticKind TabsRow + Built-in / Imported 子组 + AssetRow（缩略图 + name + meta + ⚲ builtin 徽章）+ 底部 "+ Import Asset" 按钮。
- `src/panels/asset-browser/AssetBrowserPanel.module.css` 重写（tabs / body / row / thumb / badge / footer）。
- `src/panels/asset-browser/ImportAssetDialog.tsx` 新建 — 模态：Kind select + Choose file + Target name + Cancel/Import；走 `pickFile` + `importAssetFile` IPC。
- `src/panels/asset-browser/ImportAssetDialog.module.css` 新建。

Bridge 扩展（`src/systems/persistence/electronBridge.ts` + `electron/preload.ts` + `electron/main.ts`）：
- `pickFile(filters?)` — 文件选择对话框（带 MIME filters）。
- `importAssetFile(workspacePath, sourcePath, semanticKind, targetName)` — 单 round-trip：读 bytes → sha256 → 复制到 `<workspace>/assets/<kind>/<name>` → 返回 `{ id, path, hash, size }`；target 已存在则 refuse。

Boot 接线：
- `src/app/EditorShell.tsx` — 加 `useEffect([])` 调 `registerBuiltinAssets(assetService)`；加 `useEffect([workspacePath])` 调 `loadManifest` + `setManifest`，离开时 `reset()`。

测试：
- `src/core/asset/AssetService.test.ts` — add/remove/rename/lookups/subscribe；builtin 拒绝；duplicate id 拒绝。
- `src/core/asset/manifest.test.ts` — `isAssetManifest` 类型守卫；非 Electron 路径的 `loadManifest` / `saveManifest`。

**为什么** — 侦察里 §8 把资产当 UI 子问题收窄了，用户第二轮反馈指出 assets 是 framework-level 基础设施（[架构侦察](../2026-08/asset.md)）。如果不做，Step 32 UI 编辑器骨架出来是空壳（没字体 / 主题 / icon），Step 31 Map refactor 后也没新增能力（tileset 引用没法切到用户导入资产）。

**为什么** — `semanticKind` 与 `kind`（physical）分两层：`kind` 决定 IO（image / data / font 解码），`semanticKind` 决定编辑器消费（tileset → Map editor 有 grid meta，theme → UI editor 有 color/font 字段）。单层会让 AssetRef 同时承担解码 + 渲染职责。

**为什么** — builtin 也走同一 AssetService（不并列单独 registry）：DocumentMeta / TileLayer 元数据不需要分支判断 builtin / import；AssetBrowserPanel 渲染 / validation 只看 asset store 不关心来源；后续每加一种 kind 不会分裂。重构成本低——把 `BUILTIN_TILESETS` const 拆 data + register 即可。

**为什么** — id = path（导入）或 `_builtin/<kind>/<name>`（内建）：删除 / 移动资产时引用自动失效（desired behavior），Document load 时检测 broken ref；不引入独立 UUID 因为用户阅读 / 调试痛苦。

**为什么** — `ImportAssetDialog` 在主进程做文件读 + hash + 复制（单 round-trip IPC）：renderer 不能直接走 Node fs（contextIsolation + nodeIntegration: false），且读一次不重复传输。`AssetEntry` 字段（id / path / hash / size）由 main 返回，renderer 只填 `name` + `importedAt`。

**为什么** — 不做：拖入 import、rename / delete Command 化、audio 资产 import、UI 编辑器引用 asset、AssetRef path 迁移（`'placeholder.tileset'` → `'_builtin/tileset/...'`）。这些推迟，避免 step 漂移。

---

## 关联

- Step 31（Map → EditorExtension refactor）将完成 `AssetRef` path 迁移。
- Step 32+（UI 编辑器）会引用 `theme` / `font` 资产（kind 已就位）。
- `core/extension/` 的 `ExtensionRegistry` 不需要扩——asset 是 framework-level，不是编辑器扩展。
- CLAUDE.md §1 / §3 已在侦察阶段同步；本 step 不改 CLAUDE.md。