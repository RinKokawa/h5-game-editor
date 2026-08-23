# 2026-07 · Testing

> 测试套件搭建：核心模块分阶段覆盖、IO 编排器、命令、Pixi overlay。

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

**为什么** — bridge mocks 用 `Promise.resolve({ ok: true as const, ... })` 而不是 `async () => ({ ... })`：`vi.fn(async () => ...)` 把字面量 `true` 加宽成 `boolean`，然后匹配不到 IPC 返回联合的 `{ ok: true }` 分支。`ok` 上显式 `as const` 让 TypeScript 的收窄穿过调用点，调用者不用自己强转。

**为什么** — mock `window.h5` 而不是改 IO 让它依赖 bridge：IO 函数故意在调用时（不是 import 时）读 `window.h5`，这样 vite 的 dev server 没 preload 也能启。mock 全局保住那个契约 — 生产代码路径不变。

---

## Step 26 — 核心测试 Phase 1 (B6-1) — 2026-07-18

**做了什么** — `core/` 现在有 4 个专用测试文件（之前 1 个）。套件从 86 涨到 146 测试。

- `core/command/CommandBus.test.ts`（9 个用例）：execute / undo / redo 顺序、redo 栈在 fresh execute 时清空、每次转移订阅通知、clearHistory 擦两栈、空 undo/redo no-op、一个 wiring 测试锁死 `Command.do(service)` 参数传递契约。
- `core/command/HistoryStack.test.ts`（8 个用例）：LIFO 顺序、push 让 redo 失效、空 pop 返回 null、clear 擦两、文档说明栈不调 `Command.do/undo` — 那是 bus 的活。
- `core/workspace/schema.test.ts`（13 个用例）：`isWorkspaceConfig` 接受格式良好的 config（含未知 extra 字段）、拒绝缺/错类型 `version` / `name` / `activeDocId` / `documents` / `lastSavedAt`。`isRecentList` 拒绝错版本 / 非数组 entries。锁死的行为匹配 IO 期望。
- `core/document/DocumentService.test.ts`（33 个用例）：每个公共 mutator（`setTileSize`、`setMapSize`、`setMeta`、`getMeta`、`setTile`、`getTile`、`addLayer`、`removeLayer`、`setLayerVisible`、`setLayerLocked`、`reorderLayer`、`findLayerIndex`、`layerCount`、`addEntity`、`setEntity`、`getEntity`、`removeEntity`、`appendToObjectLayer`、`removeFromObjectLayer`、`addCollider`、`setCollider`、`getCollider`、`removeCollider`、`appendToCollisionLayer`、`removeFromCollisionLayer`，外加 `snapshot` 和 `subscribe`）。断言 store mutation 和 discriminated `DocumentChange` 负载形状（如 `tile:set` 带 `layerId + coord`；`layer:add` 带 `atIndex`）。Orphan 清理端到端跑：removeEntity 从每个 `ObjectLayer.entityOrder` 剥 id；removeCollider 从每个 `CollisionLayer.colliderOrder` 剥 id。Snapshot / unsubscribe 行为锁死。

**为什么** — 测试断言 `events.length` 而不是 mock-spy 调用计数：service 的 emitter 是公共契约 — 每个订阅者（Pixi 视图、SelectionOverlay、history store 镜像）都从那里读。断言 `events.length` 和事件形状比数 store-mutation 调用是更强的保证，因为它锁死的是**可观察**契约，不是实现细节。

**为什么** — removeEntity / removeCollider 测试不期望每个层的 `objectLayer:remove` 事件：当前 service 实现只在 user-driven mutation（显式 `appendToObjectLayer` / `appendToCollisionLayer` 路径）上发每个层的事件。Orphan 清理直接走 store primitive 不重发 — `entity:remove` 是订阅者应该关心的"这东西没了"的规范信号。Step 28（Command 去重）整合 remove 命令时可能复审这点。

**为什么** — serializer 测试已经存在（Step 20）：它们覆盖 tile / object / collision 往返和坏 JSON 错误路径。Step 26 不重复；33 个新 DocumentService 测试是 Phase 1 的增量。
