# H5 游戏编辑器 — 使用说明

> H5 游戏编辑器（v0.1）使用指南。当前聚焦地图编辑器；未来 Dialogue、
> Animation 等编辑器会复用同一外壳。
>
> **语言：** [English](./USER_GUIDE.md) · [简体中文](./USER_GUIDE.zh-CN.md)

---

## 1. 快速开始

### 1.1 安装

环境要求：**Node ≥ 20**。

```bash
git clone https://github.com/RinKokawa/h5-game-editor
cd h5-game-editor
npm install
```

### 1.2 启动

```bash
npm run electron:dev
```

弹出原生窗口。第一次启动看到 **Launcher** — 选个工作区就能进。

> **注意：** `npm run dev`（仅 Vite）也能在浏览器打开 UI，但工作区持久化
>（Ctrl+S、Ctrl+O、Launcher 操作）需要桌面端。用 `npm run electron:dev`
> 跑完整功能。

### 1.3 创建或打开工作区

**工作区**是磁盘上一个文件夹，含编辑器项目文件：

- `h5-editor.json` — 配置（名字、活动文档 id…）
- `documents/<docId>.json` — 每张地图一个
- `assets/` — 你的资源（v0.1 预留目录，未来步骤接入；当前只有 builtin）

**新建工作区**

1. 点 **New Workspace**。
2. 输入名字（例如 `my-game`）。
3. 选**空**文件夹。编辑器写入骨架，跳进编辑界面。

**打开文件夹…**

点 **Open Folder…**，选含 `h5-editor.json` 的文件夹。编辑器验证配置后
载入活动文档。

**最近的工作区**

Launcher 右侧列出最近打开的文件夹。点任一项直接跳进去。鼠标移到条目
上显 ×（从列表删除）和 →（打开这个）。当前工作区也可以从编辑器
**File → Back to Launcher** 回到 Launcher。

### 1.4 编辑器界面

```
┌─────────────────────────────────────────────────┐
│ MenuBar                                          │
├─────────────────────────────────────────────────┤
│ Toolbar (V / H / B / E / O / C / R)              │
├──────────┬──────────────────────┬────────────────┤
│ Palette  │                      │ Inspector      │
│ Assets   │      CANVAS          │ Properties     │
│ Layers   │                      │                │
├──────────┴──────────────────────┴────────────────┤
│ Console                                          │
├─────────────────────────────────────────────────┤
│ StatusBar (selection / doc / zoom)                │
└─────────────────────────────────────────────────┘
```

- **左侧栏**（堆叠，可拖动重排 / 调尺寸）：
  - **Palette** — 从 builtin sheet 选 tile，或选橡皮。
  - **Asset Browser** — builtin tileset 列表。
  - **Layers** — 加 / 删 / 显隐 / 锁 / 重排图层。
- **Canvas** — 你在编辑的地图。按 **H**（Pan 工具，按住拖）平移，鼠标滚轮缩放。
- **右侧栏**：
  - **Inspector** — v0.1 占位；属性编辑随 Extension Registry 接入。
  - **Properties** — 当前选区（tile / entity / collider）的实时只读 key/value。
- **Console** — `console.info` / 保存 / 加载 / 错误的日志。诊断"保存没写"
  类问题很有用。
- **StatusBar** — 选区大小 / cell 数、当前 tile size、缩放百分比。

### 1.5 你的第一张地图

1. 默认工作区以一个空 Tile 图层（"Layer 1"）启动。
2. 工具栏点 **Brush**（B）。
3. 从 **Palette** 选 tile — 四个 builtin sheet：`grass`、`hills`、
   `tilled-dirt`、`water`。橡皮在最下面。
4. 在画布上单击画一个 cell，按住拖画连续笔触。
5. 按 **Ctrl+S** 保存。文档写到 `<workspace>/documents/<docId>.json`。

加新图层：Layers 面板头部点 **+**。弹窗选项 **Tile / Object / Collision**：

- **Tile** — 平涂图层（大多数地图会有多层 — 地面、装饰…）。
- **Object** — 实体图层（放 sprite / spawn-point / door / pickup）。
- **Collision** — collider 图层（强类型盒子 — solid / trigger / platform）。
  v0.1 只支持 **box** 形状。

---

## 2. 快捷键

### 工具

| 键 | 工具 | 用途 |
| --- | --- | --- |
| V | Select | 选 cell / entity / collider |
| H | Pan | 按住拖动平移相机 |
| B | Brush | 画活动 tile |
| E | Eraser | 清除 cell |
| R | Rect | 填充或 Shift 描边矩形 |
| O | Entity | 放 sprite / spawn-point / door / pickup |
| C | Collider | 画 box collider |

> 单字母快捷键（V/H/B/E/O/C/R）不带修饰键。注册表会丢可编辑字段的事件 —
> 在未来的搜索框里输入 "v" 不会中途切工具。

### 文件

| 快捷键 | 动作 |
| --- | --- |
| Ctrl+S | 保存（覆盖当前文档） |
| Ctrl+O | 打开（文件对话框，替换当前文档） |

### 历史

| 快捷键 | 动作 |
| --- | --- |
| Ctrl+Z | 撤销 |
| Ctrl+Y | 重做 |
| Ctrl+Shift+Z | 重做（备选绑定） |

### 选区

| 快捷键 | 动作 |
| --- | --- |
| Delete / Backspace | 删除当前选区 |
| Escape | 清选区 / 关菜单 / 关对话框 |

### 窗口

| 快捷键 | 动作 |
| --- | --- |
| X / Alt+F4 / Cmd+W | 回到 Launcher（窗口留着） |
| Cmd+Q / Quit 菜单 | 退出应用 |

> OS 关窗口手势回 Launcher；只有真正的 quit 菜单 / 快捷键才退应用。这让你
> 不重启就能切换工作区。

### 菜单

| 快捷键 | 菜单项 |
| --- | --- |
| Ctrl+S | File → Save |
| Ctrl+O | File → Open |
| — | File → Back to Launcher |
| — | Help → Documentation（打开 GitHub 仓库） |
| — | Help → About（版本 + 许可证对话框） |

### 语言

MenuBar → **View → Language** 在 English / 简体中文 / 日本語 间切换，
跨会话保留。

---

还需要帮助？在
[GitHub 仓库](https://github.com/RinKokawa/h5-game-editor) 开 issue。