# 架构演进史 · CHANGELOG

> H5 游戏编辑器项目的 step 历史 + Why 决策。
> 当前生效规则见 [`CLAUDE.md`](../../../../../CLAUDE.md)（项目根）。
> 按"**时间目录 + 模块文件**"组织；时间逆序，模块内也逆序。

## 时间索引

| 月份 | 主题 |
|------|------|
| [2026-08](./2026-08/README.md) | UI 抛光期 — MenuBar / 菜单 / 弹窗 / StatusBar / 内置 tilesets / PanelStack / Electron 打包 |
| [2026-07](./2026-07/README.md) | 架构期 — Document / Renderer 基类 / Workspace / Extension / Shortcuts / 测试套 |

## 早期 step（Step 1-12）

v0.1 closed loop + 5-year skeleton 阶段。详细叙述只在 `README.md` 的 Roadmap 表里列；架构决策（Document 单一源、Command 总线、模块边界、命名约定）从那时沉淀下来，作为 `CLAUDE.md` 当前生效的 §1-§15 规则。

## 路线图（计划中 / 推迟）

- **Step 29 — SelectionStrategy 注册表 (A5)** — 推迟到第 4 种选区 kind 落地才做。
- **Step 31 candidates** — terrain edges 的 autotile/bitmap 期望、brush 的 flip/rotation UI、workspace asset import。
- **Detachable Panels** — Unity / Cocos / Photoshop 风格单窗口浮窗面板。Phase 1（MVP：detach/drag/persist）+ Phase 2（snap-to-edge/minimized/workspace presets），**不含** Phase 3 Tab 模式（一个 dock 多 panel tab）。用户多次提"面板堆左边"，当前**暂不实现**，留作未来 step。详见 `memory/project_detachable_panels_plan.md`。
