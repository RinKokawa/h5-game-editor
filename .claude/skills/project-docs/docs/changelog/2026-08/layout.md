# 2026-08 · Layout

> 编辑器整体布局：侧栏、面板栈、splitter、布局持久化。

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
