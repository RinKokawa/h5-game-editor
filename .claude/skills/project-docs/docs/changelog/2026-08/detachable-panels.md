# 2026-08 · Detachable Panels (Step 30-B)

> Step 30-B Phase 1：每个 panel 可以从 dock 弹出来变成浮窗。
> 参考：[`memory/project_detachable_panels_plan.md`](../../../../memory/project_detachable_panels_plan.md)。
> 设计依据：[`docs/frontend-structure.md`](../../../../docs/frontend-structure.md) §2 + [侦察 §2.4](../../2026-08/asset.md)（仅本 step 涉及）。

---

## Step 30-B Phase 1 — Detachable Panels MVP — 2026-08-23

**做了什么**

Data model（`src/state/layoutStore.ts`）：
- 新类型 `PanelDockState` = `'docked' | 'floating' | 'minimized'`。
- 新类型 `FloatingRect` = `{ x, y, w, h }`。
- 新增字段：`panelDockState` / `floatingPosition` / `floatingZ` / `topZ`；默认所有 panel `docked`、位置在视口左上角散开。
- 新增 actions：`setPanelDockState(id, state)` / `setFloatingPosition(id, rect)` / `raisePanel(id)`。
- persist middleware `partialize` 加新字段（localStorage 持久化）。

UI 层：
- 新组件 `src/layout/FloatingPanel.tsx` + `.module.css` — 绝对定位浮窗，header 拖动（pointer events，无 react-draggable 依赖），body，minimize / close 按钮；mount 时自动 raise 到最前；点击 body 也 raise。
- `src/layout/PanelDock.tsx` — 加 `onDetach` prop；detach 按钮（⇗）在 header actions slot。
- `src/layout/PanelStack.tsx` — 读 `panelDockState[id]`，非 `docked` 时跳过 PanelDock 渲染（让 FloatingPanelsLayer 接管）；传 `onDetach` 让 PanelDock 触发 floating。
- 新组件 `src/app/FloatingPanelsLayer.tsx` + `.module.css` — 渲染所有 floating panel；i18n title；panel 注册表（id → title + render）内联，方便加新 panel 时单点改动。
- `src/app/EditorShell.tsx` — 在底部（AboutDialog / PreferencesDialog 之后）挂载 `<FloatingPanelsLayer />`。
- `src/app/EditorShell.module.css` — `.shell` 加 `position: relative`，让绝对定位的 FloatingPanelsLayer 填满网格。

测试：
- `src/state/layoutStore.test.ts` — 加 7 个新测试覆盖 `setPanelDockState` / `setFloatingPosition` / `raisePanel` / 持久化。

**为什么** — 用户多次反馈"panels 都堆在左边"，对比 Unity / Cocos / Photoshop 工作流后决定做单窗口浮窗面板。Phase 1 MVP 解 80% 问题（每个 panel 能从 dock 独立出来）；Phase 2（drag-out-of-dock / snap-to-edge / workspace presets）推迟到下一 step，Tab 模式（Phase 3）永久入计划。

**为什么** — 不用 react-draggable 第三方库：pointer events 够用，无新依赖；FloatingPanel header 拖动只需 `pointerdown / pointermove / pointerup` 三件套，避免给项目加 ~10KB 依赖。

**为什么** — `panelDockState` 走 layoutStore 而不是各 panel 自己 state：跟 column 宽度 / 面板顺序一样是 layout 概念，persist 中 一致；统一走 layoutStore 让后续 Phase 2 的 workspace presets 直接复用。

**为什么** — `topZ` 单调递增 + `floatingZ` 每 panel 一个值：避免两 panel z 相同导致不确定的堆叠顺序；`raisePanel` 只 bump `topZ` 不重置其他 panel 的 z，所以历史顺序保留。

**为什么** — PanelStack 用 `if (state !== 'docked') continue` 跳过渲染：让 PanelStack 和 FloatingPanelsLayer 各自负责自己状态，互不耦合；同一 panel 不会同时出现在两处。

**为什么** — 不在 EditorShell 里直接做 registry：单写一份（FloatingPanelsLayer 内联）+ PanelStack 已经有 leftPanels / rightPanels const ——避免 registry 模块变成共享大对象；后续如要共享再重构。

---

## Phase 2 推迟到下一 step

下列项**不在本期范围**，推到下一 step：

- **Drag-out-of-dock**：从 dock header 拖出 dock 自动变 floating（替换 / 补充 detach 按钮）
- **Snap-to-edge**：拖到 dock 边缘附近显示高亮，drop 后吸附
- **Workspace Presets**：保存当前 layout 为命名 preset（save / apply / switch）

---

## Phase 2A — Cross-column drag — 2026-08-23

**做了什么**

数据 / utility（`src/utils/list.ts` 新建；`src/layout/panelStackMath.ts` re-export）：
- `moveItem` 从 `panelStackMath.ts` 提到 `utils/list.ts`（`utils/` 可被 `state/` import，无 ESLint 边界冲突）。
- `panelStackMath.ts` 改用 `@utils/index` 并 re-export，保持向后兼容。

Store（`src/state/layoutStore.ts`）：
- 新增 action `movePanelToSide(panelId, sourceSide, targetSide, targetIndex)`：
  - `sourceSide === targetSide` → 走原有 `moveItem` 在同栏重排。
  - `sourceSide !== targetSide` → 从源栏 order 移除，插入目标栏 order；`targetIndex` clamp 到 `[0, length]`。

UI（`src/layout/PanelStack.tsx`）：
- `handleDragStart` 把 `sourceSide` 也写到 `dataTransfer`（key `application/x-panel-source`）。`text/plain` 保留给 devtools / e2e 看。
- `handleDrop` 解析 sourceSide：
  - `sourceSide === side` → 同栏 reorder（原有路径）。
  - `sourceSide !== side` → 调 `movePanelToSide`，target index 按 drop hint（above / below）调整。

测试（`src/state/layoutStore.test.ts`）：
- 加 5 个测试覆盖跨栏 move / 同栏 reorder 边界 / clamp 边界 / 不在源 order 时 no-op。

**为什么** — 用户反馈 Phase 1「不自由」，具体指「不能跨栏拖」。把 panel 从一个栏拖到另一个栏是 Unity / Cocos / PS 都有的体验，Phase 1 button-detach 不够。

**为什么** — `moveItem` 提到 `utils/` 而非放回 `panelStackMath`：`state/layoutStore.ts` 不能 import `@layout/*`（CLAUDE.md §4 ESLint 边界），但需要同一份 `moveItem` 做跨栏插入时的目标 order 调整。`utils/` 是 pure helpers 的合法归宿（CLAUDE.md §5），两边都能用。

**为什么** — `sourceSide` 用自定义 mime type `application/x-panel-source` 而非塞进 `text/plain`：避免与 devtools / e2e 测试看到的 panel id 混淆；解析时按 key 显式读，不会被 `text/plain` 误读。

**为什么** — 跨栏 drop 的 `targetIndex` clamp 到 `[0, length]`：用户从左栏拖 panel 到右栏 dock 区下方空白处（无 drop hint）时，落点 index 可能等于右栏 order length（追加），需要允许；负数 / 越界值也安全降级到边界。

---

## 关联

- `core/extension/` 不需要扩——这是 layout 概念，不是编辑器扩展。
- Step 31 / Step 32+ 不阻塞（detachable panels 平行工作流）。
- 已同步文档：
  - [`docs/frontend-structure.md`](../../../../docs/frontend-structure.md) §9 未改（Phase 1 / 2A 主要影响 §2.4 行为，UI 文本已通过 i18n 自动反映；§9 等 Step 32 UI 编辑器时再补）。
  - CLAUDE.md §1 / §3 不需要改——invariant 仍然成立（panel 不画 Tile，浮窗也不画）。
- Tab 模式（Phase 3）永久入 [`memory/project_detachable_panels_plan.md`](../../../../memory/project_detachable_panels_plan.md) 计划。
- Phase 2B（drag-out-of-dock / snap-to-edge / workspace presets）仍在 backlog，下次用户提及时拆 step。

---

## Phase 2C — Window 菜单（panel toggle 显隐） — 2026-08-23

**做了什么**

Store（`src/state/layoutStore.ts`）：
- 新增字段 `panelHidden: Record<PanelId, boolean>`，默认全 `false`。
- 新增 action `togglePanelHidden(id)`。
- persist `partialize` 加新字段。

UI 渲染过滤：
- `src/layout/PanelStack.tsx` — `normalizeOrder` 多吃一个 `hidden` 参数；geometry 计算 / render loop 都用过滤后的 order。Hidden panel 在原 order 里**保留位置**，不删除，re-show 时回到原位。
- `src/app/FloatingPanelsLayer.tsx` — render 前再过滤一次 `hidden`（floating panel 也吃这条）。

菜单（`src/panels/menubar/MenuBar.tsx`）：
- `windowItems` 替换空数组：6 个 panel（palette / assets / layers / inspector / properties / console）按固定顺序列在 **Window** 子菜单下，每条 `labelKey: 'dock.<id>'` 复用现有 i18n key，`checkMark: !panelHidden[id]`，点击 `togglePanelHidden(id)`。
- 注释更新——之前留的「v0.1 has nothing here」作废。

测试（`src/state/layoutStore.test.ts`）：
- +5 测试：`panelHidden` 默认全 false / toggle 翻转 / 不影响其他 panel / 不影响 `panelDockState` 与 `floatingPosition`（保留「重显时回到原位」语义）/ 持久化。

**为什么** — 用户反馈「这些窗口是否开启应该从窗口菜单栏中开启或关闭」。Unity / Cocos / Photoshop 的 Window 菜单都是这种 checkbox toggle 形式。

**为什么** — `panelHidden` 是独立 flag，不挤进 `panelDockState`：dockState 是「位置」语义（docked / floating / minimized），hidden 是「可见性」语义——两个独立维度不该用 union 类型塞一起。

**为什么** — Hidden panel **保留**在 leftPanelOrder / rightPanelOrder 里，不删：用户重显时位置完全一致（VS Code / Unity 行为）。删了再插回会丢位置信息。

**为什么** — Hidden floating panel 保留 `floatingPosition`：同上，重显时浮窗出现在原坐标，不会跳到默认位置。

**为什么** — Window 菜单项复用 `dock.<id>` i18n key 而不是新增 `menu.window.*`：菜单显示文字与面板标题一致，用户认知统一；新增 key 等同于重复翻译。

---

## Phase 2B-1 — Workspace Presets — 2026-08-23

**做了什么**

Store（`src/state/layoutStore.ts`）：
- 新增 `Preset` interface：name + 全套 layout 字段（widths / collapses / orders / heights / collapsed / dockState / floatingPosition / floatingZ / topZ / panelHidden）。
- 新增字段 `presets: Record<string, Preset>`，默认 `{}`。
- 新增 actions：
  - `savePreset(name)` — 捕获当前所有 layout 字段；同名 overwrite；空 / 纯空白名字 no-op。
  - `applyPreset(name)` — 还原全字段；未知名字 no-op。
  - `deletePreset(name)` — 删除；未知名字 no-op。
- persist `partialize` 加 `presets` 字段。

UI（`src/panels/menubar/MenuBar.tsx`）：
- Window 菜单结构重组：
  - 上半：原 6 个 panel toggle checkbox（不变）。
  - 分隔线。
  - `Save current layout as…`（新 i18n key `menu.window.saveLayout`）：`window.prompt()` 取名 → `savePreset(trimmed)`。
  - 若有 preset：再一个分隔线 + 每个 preset 一对 `Apply: <name>` / `Delete: <name>` 条目；Delete 用 `window.confirm()` 防误删。
- `WindowItem` 类型 = `MenuItem | { kind: 'separator' }`，让 windowItems 能包含分隔符。

i18n：
- 三 bundle（zh-CN / en / ja-JP）加 `menu.window.saveLayout`。

测试（`src/state/layoutStore.test.ts`）：
- +8 测试：默认空 / savePreset 完整字段 / 同名 overwrite / 空名拒绝 / applyPreset 还原 / applyPreset 未知 no-op / deletePreset 选择性删除 / deletePreset 未知 no-op / 持久化。

**为什么** — 用户说"按照规划接下来应该做什么工作"——Phase 2B 是 Phase 1+2 的最后一块（drag-out / snap / presets 三选一，先做价值最高的 presets）。

**为什么** — `window.prompt()` 阻塞 renderer 线程：Electron `contextIsolation: true` 下仍可用 Chromium 标准 dialog API；UX 朴素但够用。后续要换 inline / custom dialog 不影响 store 接口。

**为什么** — `applyPreset` 全字段覆盖（含 `panelHidden`）：用户切到 preset 时不应残留旧 hidden 状态——一个 panel 在 preset A 里 visible，切到 preset B 里 hidden，就该 hidden。Unity / VS Code 都是这种"全部还原"语义。

**为什么** — 不存 `currentPresetId`：没追踪"当前是不是 custom"。Unity 也只在 preset 菜单上显示 "(modified)" 标记，但不阻断切其他 preset；UX 价值有限，省复杂度。

**为什么** — 名字用 `window.prompt()` 而不是新对话框组件：避免新增 `panels/dialogs/SavePresetDialog`（CLAUDE.md §5 「dialog 新组件 → panels/」会增加一级目录）。preset 命名场景简单，prompt 够用；以后真要 UX 升级再换。