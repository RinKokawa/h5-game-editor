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

## docs/ 目录（未来）

如果某主题需要超过 CHANGELOG 的篇幅（教程、API 参考、ADR 集合），建 `docs/<topic>.md` 并在 CLAUDE.md §13 旁加一行指针。

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