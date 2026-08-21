---
name: project-docs
description: 读写 H5 游戏编辑器项目文档（CLAUDE.md / CHANGELOG.md / README.md / docs/）的约定 — 文件角色、章节结构、写入格式、常见查询
type: project
---

# 项目文档管理（project-docs）

> 这个 skill 是给 AI 助手用的：每次需要读写项目文档前，先读本文件确认格式约定。

## 文档角色

| 文件 | 角色 | 谁读 | 何时写 |
|------|------|------|--------|
| `CLAUDE.md` | **活规则** — 项目契约。改源码前必读。 | AI 助手（每次对话） | 规则 / 边界 / 风格变了 |
| `CHANGELOG.md` | **历史** — 完成的 step + Why 决策 + Next 候选 | AI 助手（理解背景） | 每个 step 完成时 |
| `README.md` | **公开介绍** — 首次接触项目的人读 | 人类（招人 / 合作者） | 大版本变化时 |
| `docs/` (新加) | **详细文档** — API / 教程 / ADR | 人类 + AI | 按需 |

写之前先问："这条信息属于哪种角色？放错档会成为噪音。"

## 这个 skill 自带的 reference docs

为了让 skill 启动时能一次性把项目历史读全，CHANGELOG 也在 skill 目录里放了一份镜像：

```
.claude/skills/project-docs/
├── SKILL.md           ← 本文件：约定与查询路径
└── docs/
    └── CHANGELOG.md   ← 镜像（项目根 CHANGELOG.md 的快照）
```

**项目根 `CHANGELOG.md` 是权威源。** 每次新增 step 改项目根 CHANGELOG.md 后，**同步把改动 copy 一份到这个 `docs/` 子目录**。两份不一致以项目根为准；本 skill 启动时优先读项目根，找不到再读 skill 自带那份。

> Windows 上没法创建 symbolic link（需管理员），所以这里用 copy 而非 symlink。
> Linux/mac 上若有同等限制也走 copy。

## CLAUDE.md 怎么读

按这个顺序读，最有效：

1. **§3 不变式** — 不可破的硬约束
2. **§4 模块依赖** — 改动放哪一层
3. **§5 归属表** — 新代码放哪里
4. **§12 step 纪律** — 改完要做什么
5. **§14 陷阱** — 不要重蹈覆辙
6. **§15 加功能前的问题** — 五问清单

§1-§2 是项目背景；§6-§11 是风格细节（按需读）。

## CLAUDE.md 怎么写

**只放当前生效的规则。所有 step 历史搬到 `CHANGELOG.md`。**

§13 "当前 step" 必须只放一行指针：

```markdown
最新完成 + 历史 step 列表见 [CHANGELOG.md](./CHANGELOG.md)。
```

新增规则时：用 §16、§17… 编号（往下加，不复用）。已有规则修改：编辑该 section 内容，不改编号 — 否则历史交叉引用失效。

### 翻译与语言

从今往后 **CLAUDE.md 全用中文**。例外：API 名、文件名、类名、命令名、库名、保留英文术语（`Document`、`Command`、`Canvas`、`StrictMode` 等）保持原样。

## CHANGELOG.md 怎么写

每个 step 一节，**逆时序**（最新在最上）。每节三段式：**做了什么 / 为什么 / 未做**。

### 格式模板

```markdown
## Step N — 名字（简短描述）— YYYY-MM-DD

**做了什么** — 1-3 句概述。

- 关键改动 1
- 关键改动 2
- 关键文件 / 行数变化
- 测试覆盖（如有）

**为什么** — 决策依据。多 reasons 用 1. 2. 3. 编号。

**未做 / 留给** — 这个 step 故意没做的事（可选）。

> Next: Step N+1 候选 — ...

---
```

### Post-step patch（不打算单开 step 的小改）

```markdown
## Post-Step N patch — 标题 — YYYY-MM-DD

**做了什么** — ...

**为什么** — ...

---
```

### 写作纪律

- **保留完整 "Why" 段。** 这是为什么 CLAUDE.md 瘦身到 CHANGELOG 后仍然有意义的根因。
- **保留代码引用**（文件路径、函数名、行数）— 让读者能从 changelog 直接跳到代码。
- **不写合并提交**（"merge dev into main"）— 它们不携带架构信息。
- **不重复 README 的 capabilities 列表** — 那住 README.md。

## README.md 怎么写

英文。给**外部读者**第一眼看的简介。架构在 CLAUDE.md，不在 README 重复。

必含节：技术栈表 + 项目结构 + Getting Started + Current Capabilities + Roadmap + Contributing。

"Current Capabilities" 列**用户能做的事**（不是内部组件）。从源码事实写，不是从文档抄。

## docs/ 目录

`docs/` 是详细文档的家。第一个住户是 `docs/frontend-structure.md` —
描述前端层级（React 树 / PixiJS 场景图 / CSS module 映射）。脚本
`scripts/generate-frontend-tree.mjs`（`npm run docs:tree`）生成文件树
骨架。脚本输出与手写 narrative 配合。

如果某主题需要超过 CHANGELOG 的篇幅（教程、API 参考、ADR 集合），建
`docs/<topic>.md` 并在 CLAUDE.md §13 旁加一行指针。

### 维护触发

| 改动 | 必须同步 |
|------|----------|
| 加新 React 组件 / 面板 / 工具 | `docs/frontend-structure.md` 对应章节 |
| 改 EditorShell grid / PanelStack 行为 | §2.x |
| 加新 PixiJS 子系统 | §3 |
| 加新 CSS module | §4 |
| 任何 src/ 文件变动 | 重跑 `npm run docs:tree`，比对 §6 是否漂移 |

文档与代码漂移是技术债。改前端组件前先看文档，确认你即将做的事没破坏
文档承诺的层级关系；改完检查是否需要补文档。

## 常用查询（AI 助手用）

- **"现在进行到哪个 step？"** → 读 `CHANGELOG.md` 第一节标题 + "Next:" 行。
- **"为什么不做 X？"** → 在 `CHANGELOG.md` 搜 X 的 step 名 + "为什么" 段。
- **"X 改动的代码在哪？"** → `git log --oneline --grep="Step N"` 找 commit hash，然后 `git show --stat <hash>`。
- **"Step N 之后下一步是什么？"** → 看最新 step 的 "Next:" 引用 + `docs/` 目录（如有）。
- **"这条规则在哪？"** → 翻 `CLAUDE.md` 的 §1-§15 目录。
- **"这条规则有故事吗？"** → 在 `CHANGELOG.md` 搜相关 step。

## 自检清单（写之前问自己）

1. 这条信息是规则还是历史？规则放 CLAUDE.md，历史放 CHANGELOG.md。
2. 如果是规则，放哪个 §？新规则用下一个编号。
3. 如果是历史，能说清"为什么"吗？不能就别记 — 没有 why 的条目是噪音。
4. 如果是用户可见功能，README.md 也更新了吗？（仅 README 关心的事项。）
5. 中文写了吗？（CLAUDE.md / CHANGELOG.md 是中文，README.md 是英文。）
6. **项目根 CHANGELOG.md 改了吗？如果改了，skill 里 `docs/CHANGELOG.md` 同步 copy 了吗？**