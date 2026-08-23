# 2026-07 · Shortcuts

> 键盘 shortcut 系统：声明式 binding、中央 registry。

---

## Step 25 — Shortcut 中央化 (B5) — 2026-07-18

**做了什么** — 四个 shortcut 类变成四个声明式数组；`keydown` listener 从四个塌成一个。

- `systems/shortcut/Shortcut.ts` 声明 `ShortcutBinding`（三 variant discriminated union：`key`、`ctrlKey`、`ctrlShiftKey`）和 `Shortcut` 接口（`id`、`binding`、可选 `when(event)`、`run(event)`）。`matchesBinding` 单独导出让测试可直接驱动。
- `systems/shortcut/registry.ts` 实现 `ShortcutRegistry`：`register()`（重复 id 抛）、`registerAll()`、`list()`、`attach()`（一个 window keydown listener）、`detach()`、`dispatch(event)`（first-match-wins、丢 `repeat`、委托 `isEditableTarget`）。双 attach 时 listener 短路。
- 四个 shortcut 文件（`HistoryShortcuts`、`SelectionShortcuts`、`ToolShortcuts`、`persistence/DocumentIOShortcuts`）变成 `readonly Shortcut[]` 导出 — 没有类，没有 `addEventListener` 调用点。`isEditableTarget` copy-paste 没了；registry 默认守卫委托给 `@utils/index` 的单一实现。
- `EditorShell` 实例化一个 `ShortcutRegistry`，调四次 `registerAll(...)`，挂上并在清理时摘下。旧的 `historyShortcuts.attach()` / `historyShortcuts.detach()` 行没了。
- 测试覆盖：`registry.test.ts`（10 个用例用于 `matchesBinding` 和 `dispatch`），加 Step 24 的 8 个 `isEditableTarget` 用例仍然通过 registry 的默认守卫。

**为什么** — 声明式 `Shortcut[]` 而不是类层级：四个现有 shortcut 类 80% 相同 — 同样的 listener 挂/摘、同样的 editable-target 守卫、同样的 `preventDefault` 舞步。类形式让每个新 shortcut 成了 copy-paste 任务，不可能共享 `id` 命名空间。声明式值走一个拥有所有水管的 registry，给测试一个攻击点（`registry.dispatch(ev)`）。

**为什么** — first-match-wins 而不是 longest-prefix 或其他策略：四个 shortcut 今天的 binding 不相交，所以实践中策略不起作用。First-match-wins 是最便宜推理和测试的策略："如果 shortcut `a` 在 `b` 之前注册，`a` 的 binding 在两个都匹配时赢"。如果未来 shortcut 需要和另一个共享 binding，契约就是"把更具体的那个先注册" — 没有 priority 字段，没有 runtime 注册表。

**为什么** — registry 默认丢 `repeat` 和 editable-target 事件，没有 opt-out：`repeat=true` 事件是按住键发重复笔触的机制；对工具切换 shortcut 那是噪音。可编辑目标抑制是四个 shortcut 文件都各自记得加的安全网 — 提到 registry 意味着未来 shortcut 作者不会意外忘掉。真要在 repeat 上触发的 shortcut 可以自己在 `run()` 里读 `event.repeat`。
