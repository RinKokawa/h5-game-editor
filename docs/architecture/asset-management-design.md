# Asset Management Design · Step 30-A 前置

> 日期：2026-08-23
> 状态：草案，待 review
> 上下文：UI 编辑器侦察 (`docs/architecture/ui-editor-recon.md`) 锁定 Step 30-A = assets 基础设施；本文档覆盖其 4 个先决问题
> 当前生效规则：[`CLAUDE.md`](../../CLAUDE.md)

---

## 0. 摘要

`AssetRef` 和 `AssetBrowserPanel` 已存在（Step 30 / 30a），但缺 import / IO / rename / 多 kind 扩展。**Step 30-A 是「扩展 + 补 import 流程」，不是从零开始**。本文档覆盖 4 个先决问题：

| # | 问题 | 当前 | 缺口 |
|---|------|------|------|
| 1 | Kind 分类 | 仅物理 kind（image/audio/data/font） | 缺语义 kind（tileset/sprite/theme） |
| 2 | 路径结构 | workspace.assets/ 存在但空；builtin 走 Vite import | 无 import 落盘规则 |
| 3 | 引用方式 | `AssetRef { kind, path, hash? }` | 缺语义 kind 字段 |
| 4 | builtin vs import | builtin const 数组 + Vite import；import 无 | 缺统一接口；AssetBrowserPanel 不展示 import |

---

## 1. Kind 分类

### 1.1 当前

```ts
// src/editor/map/schema/asset.ts
export type AssetKind = 'image' | 'audio' | 'data' | 'font';
```

物理类型（image / audio / data / font）。builtin tilesets 用 `AssetRef.kind = 'image'`。

### 1.2 选项

- **A — 两层**：`kind` 物理（image/audio/data/font）+ `semanticKind` 语义（tileset/sprite/theme/font/audio）。物理决定 IO，语义决定编辑器消费。
- **B — 单层语义**：`kind = 'tileset' | 'sprite' | 'theme' | 'font' | 'audio'`。
- **C — 单层混合**：`kind = 'tileset' | 'sprite' | 'image' | 'audio' | 'data' | 'theme' | 'font'`。

### 1.3 推荐

**A**。理由：

- 物理 kind 决定**解码 / IO**（image → PNG decode，audio → audio decode）。
- 语义 kind 决定**编辑器消费**（tileset → Map 编辑器有 grid meta；theme → UI 编辑器有 color/font 字段）。
- 单层让 AssetRef 同时承担解码和渲染职责，职责不清。
- B 缺点：丢失物理 kind 时，无法决定如何读字节流；同一个 tileset 物理上是 image，必须知道。
- C 缺点：枚举膨胀，物理 vs 语义混在一起。

### 1.4 实现

```ts
export type PhysicalKind = 'image' | 'audio' | 'data' | 'font';
export type SemanticKind = 'tileset' | 'sprite' | 'theme' | 'font' | 'audio';
// 映射：tileset/sprite → image；theme → data；font → font；audio → audio
```

---

## 2. 路径结构

### 2.1 当前

- `ASSETS_DIRNAME = 'assets'`（`core/workspace/schema.ts`）—— schema 里规定了 assets 目录名，但 v0.1 是空目录。
- builtin 用 Vite import（`src/assets/tilesets/sprout-lands/*.png`）—— 走 `src/assets/`，**不走 workspace.assets/**。

### 2.2 选项

- **A — semanticKind 子目录**：`workspace.assets/<semanticKind>/<filename>`。
- **B — 扁平 + manifest**：`workspace.assets/<filename>` + manifest 标记 semanticKind。
- **C — 物理 kind 子目录**：`workspace.assets/image/<filename>`、`workspace.assets/audio/...`。

### 2.3 推荐

**A**。理由：

- 用户在 OS 资源管理器看 `workspace.assets/` 直接是「tileset / sprite / theme / font」—— 不读 manifest 就能分类。
- IO 简单：import 时按 semanticKind 决定子目录；删除 / 验证按子目录查。
- builtin 用 Vite import 仍走 `src/assets/`，与 import 隔离；用 `_builtin/<semanticKind>/<name>` 作为虚拟 id。

### 2.4 实现

- **import 资产路径**：`workspace.assets/tileset/forest.png`
- **builtin 资产虚拟 id**：`_builtin/tileset/sprout-lands-grass.png`
- **id = path**（无独立 UUID）；DocumentMeta 引用 `id: 'tileset/forest.png'`
- 不允许子目录嵌套；asset path 始终是 `<semanticKind>/<filename>`

### 2.5 待定

- 同一文件能否同时是 sprite 和 tileset？—— 不能；import 时必须选一种 semanticKind。
- 用户 OS 拖入时如何推断 semanticKind？—— 文件扩展名 / 用户在导入对话框选；推断规则写 manifest。

---

## 3. 引用方式

### 3.1 当前

```ts
// src/editor/map/schema/asset.ts
export interface AssetRef {
  readonly kind: AssetKind;          // 'image' | 'audio' | 'data' | 'font'
  readonly path: string;             // 相对 project root 或 builtin 的绝对 URL
  readonly hash?: string;            // 内容 hash，缓存失效
}
```

### 3.2 选项

- **A — 扩展 AssetRef**：加 `semanticKind` 字段。
- **B — 替换 AssetRef**：新结构。
- **C — 加 wrapper**：`SemanticAssetRef { ref: AssetRef; semanticKind }`，DocumentMeta 持 wrapper。

### 3.3 推荐

**A**。理由：

- AssetRef 已被 Map 编辑器使用；扩展比替换影响小。
- 字段语义清晰：`kind` 物理 / `semanticKind` 语义。
- 兼容：旧 AssetRef（无 semanticKind）的解析降级为「按 path 推断 semanticKind」（`_builtin/tileset/...` → `tileset`）。

### 3.4 形状

```ts
export interface AssetRef {
  readonly kind: PhysicalKind;          // 'image' | 'audio' | 'data' | 'font'
  readonly semanticKind: SemanticKind;  // 'tileset' | 'sprite' | 'theme' | 'font' | 'audio'
  readonly path: string;                // workspace.assets/<semanticKind>/<filename> 或 _builtin/...
  readonly hash?: string;
}
```

### 3.5 id 约定

- **id = path**（无独立 UUID）。
- 删除 / 移动资产时引用自动失效（deleted）—— 这是 desired behavior；Document load 时检测 broken ref。
- 重命名走 Command 同步所有引用（Step 30-A 实现时定）；B2 决策下 UI / Map 独立文档，rename 不跨文档。

---

## 4. builtin vs import 共存

### 4.1 当前

- `editor/map/palette/builtinTilesets.ts`：硬编码 const 数组 + Vite import。
- `panels/asset-browser/AssetBrowserPanel.tsx`：仅展示 builtin tilesets（按 `palette.tileset.*` i18n key）。

### 4.2 选项

- **A — builtin 也走 asset store**：注册 `_builtin/tileset/<name>` id 到同一 store。
- **B — builtin 单独 registry**：与 asset store 并列。
- **C — builtin 保留 const 数组**：asset store 只管 import。

### 4.3 推荐

**A**。理由：

- **统一接口**：DocumentMeta / TileLayer 不需要分支判断 builtin / import。
- **统一 Panel**：AssetBrowserPanel 只看 asset store，builtin 和 import 渲染同一组件。
- **重构成本低**：把 `builtinTilesets.ts` 改成 `registerBuiltinAssets()` 调用即可，文件数不变。
- B 缺点：双接口、双 Panel、双 validation 路径——后续每加一种 kind 都分裂一次。
- C 缺点：DocumentMeta / PalettePanel 永远要写「if builtin / if import」。

### 4.4 builtin 注册

- **入口**：`core/asset/registerBuiltinAssets()` 在 app boot 调用一次（在 `app/main.tsx` 或 `EditorShell` mount 时）。
- **每条 builtin** 是一个 AssetRef（id `_builtin/tileset/sprout-lands-grass.png`，path 走 Vite asset URL，semanticKind `tileset`）。
- **只读**：尝试重命名 / 删除 builtin 的 Command 直接拒绝（runtime guard，不是 schema 限制）。

### 4.5 AssetBrowserPanel 变化

- 顶部 tab / filter：按 semanticKind 分组（Tileset / Sprite / Theme / Font / Audio）。
- 同 semanticKind 内排序：builtin 在前，import 在后，按 name 字典序。
- 当前 builtin 的展示逻辑（`palette.tileset.*` i18n key）保留。

### 4.6 待定

- builtin 是否能被用户 disable？—— 不需要；用户要 override 是创建 import 资产，asset id 优先（import id 不与 builtin 重叠）。
- builtin 资产加载时机：app boot（同步，阻塞 UI）vs lazy（首次引用时加载）。—— 推荐 lazy（避免 boot 时间膨胀）；但 builtin tileset texture 需要 preload 给 Pixi —— 保留现有 `preloadBuiltinTilesets()` 路径。

---

## 5. 待 review 项（提交给用户）

- [ ] §1.3 推荐 A（kind 两层：物理 + 语义）是否接受？
- [ ] §2.3 推荐 A（workspace.assets/<semanticKind>/）是否接受？
- [ ] §3.3 推荐 A（扩展 AssetRef，加 semanticKind）是否接受？
- [ ] §4.3 推荐 A（builtin 也走 asset store）是否接受？

---

## 附录 A · 关键代码引用

| 文件 | 关注点 |
|------|--------|
| `src/editor/map/schema/asset.ts` | AssetRef 已存在；PhysicalKind = image/audio/data/font |
| `src/editor/map/palette/builtinTilesets.ts` | builtin 用 Vite import，硬编码 const 数组；用 `AssetRef` |
| `src/assets/tilesetTextureCache.ts` | texture 加载和缓存；`preloadBuiltinTilesets()` |
| `src/assets/index.ts` | 导出 `preloadBuiltinTilesets`, `textureFor` |
| `src/assets/tilesets/sprout-lands/*.png` | builtin tileset 物理文件（Vite import） |
| `src/panels/asset-browser/AssetBrowserPanel.tsx` | 仅展示 builtin tilesets；v0.1 骨架，扩展点已留 |
| `src/core/workspace/schema.ts` | `ASSETS_DIRNAME = 'assets'`；v0.1 没强制子结构 |
| `src/editor/map/schema/document.ts` | `DocumentMeta { tileSize, mapSize }`；不动，但 TileLayer 元数据会引用 AssetRef |

---

## 附录 B · 与其他 step 的衔接

- **Step 31（Map → EditorExtension refactor）**：tileset 引用从 `'placeholder.tileset'` 形式改为 `'_builtin/tileset/sprout-lands-grass.png'` 形式（id 统一）；DocumentMeta 不变。
- **Step 32（UI 编辑器骨架）**：`UIDocumentMeta` 引用 theme / font / sprite id（同 AssetRef 格式）。
- **Step 33（UI viewport DOM 渲染）**：UI widget 引用 theme / font asset；WidgetLibrary 面板消费 asset store。

---

## 附录 C · 实现后置（不进 Step 30-A 范围）

下列项 Step 30-A 实现时**先不解决**，留到后续 step：

- asset 重命名 / 删除的 Command 化（写入 history stack）
- asset 失效检测（Document load 时 broken ref 警告）
- manifest 冲突解决（用户拖入两个同名文件）
- asset 版本管理 / 升级
- audio 资产（kind `audio` 在 §1 列出但 Step 30-A 不实现 import 流程）