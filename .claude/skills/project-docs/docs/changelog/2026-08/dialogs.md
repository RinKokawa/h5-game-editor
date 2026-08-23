# 2026-08 · Dialogs

> Modal 弹窗：About、Preferences、User-facing dialogs。
> PreferencesDialog 的入口移动（Edit 菜单加 Preferences 项）见 [menubar.md](./menubar.md) §"语言切换从 View 移到 Edit → Preferences"。

---

## Patch — About 弹窗填真值（author / description / license）— 2026-08-22

**做了什么** — AboutDialog 字段改成真值：

- `AUTHOR = '泠泠子川'`（用户真名）
- 描述：`t('about.projectDescription')` — i18n 三 bundle（en/zh-CN/ja-JP）加 key，en/zh-CN 内容是 README.md / README.zh-CN.md 第一句
- `LICENSE = 'Apache 2.0'`（用户指定）
- Repository 链接保留（项目信息，不是个人联系方式）
- 删了之前自己加的 `Early scaffolding` 状态行（没依据）、`Copyright © 2026`（License 已涵盖）
- 三 bundle 加 5 个 `about.*` key（projectDescription / author / repository / license / builtWith），让标签也跟着 locale 切换

**为什么** — description 走 i18n 而不是 hardcoded：About 整体是英文 UI 但描述文字各 locale 应该用对应语言版本。zh-CN 弹窗显示中文描述更自然。

**为什么** — repository 不算"联系方式"：GitHub 仓库链接是项目本身的信息（去哪里看源码），不是联系作者的方式。用户的"联系方式已够"我理解为"不另外加邮箱/网站/社交媒体"，但 Repository 字段是项目 metadata 不是 contact info，保留。

**为什么** — Copyright 删除：Apache 2.0 License 已经隐含版权声明（"Copyright © [year] [owner]"，无显式 owner 信息时归作者），保留一条重复的 © 2026 既冗余又 owner 不明（用户真名 ≠ git 提交者名字）。

---

## Patch — Help → About 弹窗 — 2026-08-22

**做了什么** — 新建 `src/panels/about/AboutDialog.tsx`（modal 组件）+ `AboutDialog.module.css`。Help → About 改成弹模态框（之前是 console.log marker）。

弹窗含：版本号（v0.1.0）、状态（Early scaffolding）、Repository（点击跳 GitHub — 复用 `openExternal`）、Copyright (© 2026)、License（All rights reserved）、技术栈致谢（React 19 · PixiJS 8 · Zustand 5 · Vite 6 · TypeScript 5.6）。

交互：
- 点击 backdrop 关
- 点击 dialog 内部 `stopPropagation` 不关
- Esc 关（document keydown listener，只 open 时挂）
- 右上角 × 按钮 + 底部 Close 按钮
- z-index 200（高于 menu backdrop 的 99）

`i18n` 加 `about.close` 三 bundle。`onShowAbout` + `onOpenExternal` 都通过 prop 注入（panels 不能 import systems/）。

**为什么** — `onShowAbout` 用 prop 而不是 MenuBar 自管 state：Dialog 是 EditorShell 拥有挂载点的（EditorShell 是唯一能 import bridge 的层，能传 `openExternal` callback）。把 state 上提到 EditorShell 一处管。

**为什么** — `open` 为 false 时返回 null：DOM 里没 dialog 节点，省渲染；useEffect 也跳过 listener 挂载。

**为什么** — 版本号硬编码 0.1.0：v0.1 阶段不变；后续要么从 `package.json` import（build-time 替换），要么从 `window.h5.app.getVersion()` IPC 读。先简单硬编码。

---
