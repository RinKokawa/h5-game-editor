# 2026-08 · Documentation

> 项目文档（README / USER_GUIDE）的演进。

---

## Patch — 加 USER_GUIDE 中英双语 — 2026-08-22

**做了什么** — 新建 `docs/USER_GUIDE.md`（英文，约 170 行）+ `docs/USER_GUIDE.zh-CN.md`（中文，约 170 行）。两章：§1 Quick Start（安装、启动、创建 / 打开工作区、界面布局、第一张地图）+ §2 Keyboard Shortcuts（工具 / 文件 / 历史 / 选区 / 窗口 / 菜单 / 语言）。

`CLAUDE.md` §13 加一行指针；`README.md` / `README.zh-CN.md` 加"Using the editor? See the User Guide" 链接；project-docs skill 维护触发表加两行（加 / 改 / 删快捷键 / 菜单项）。

**为什么** — docs/ 不放根目录：`docs/` 已经装 `frontend-structure.md`，集中起来；根目录 `README.md` / `CLAUDE.md` / `CHANGELOG.md` 是"项目级"档，USER_GUIDE 是"用户级"档，分目录区分。

**为什么不写更多章节（界面详解 / 进阶）** — 用户先选了"只快速开始 + 快捷键表"，其它章节等真出现"用户卡这里"的反馈再补。YAGNI：提前写不会被读的章节是文档技术债。

**为什么** — 双语：跟 README 一致：GitHub 自动按 locale 展示对应版本，URL 互通。

---

## Patch — 加中文 README — 2026-08-21

**做了什么** — 新建 `README.zh-CN.md`（完整中文翻译，226 行）；`README.md` 顶部加一行语言切换链接 `[English] · [简体中文]`。

**为什么** — GitHub 自动按浏览器/系统语言展示对应 README。两份都在仓库里：英文给国际开发者，中文给中文圈。

**为什么** — 不做一份合一的 bilingual README：段落交错视觉差，且 GitHub 单语自动识别失效。分开两份是约定俗成（vue / react / vite 等都这么干）。

---
