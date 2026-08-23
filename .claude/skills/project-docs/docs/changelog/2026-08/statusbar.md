# 2026-08 · StatusBar

> 底部状态栏的演进：dirty 指示。

---

## Patch — dirty 指示（Saved / Modified）— 2026-08-22

**做了什么** — `documentStore` 加 `savedSnapshot: string | null` 字段 + `markClean(snapshot)` action；新增 `useDocumentDirty()` hook（`currentJSON !== savedSnapshot`）；`saveDocument` / `loadDocument` 完成后调 `markClean(compactJson)`；`StatusBar` 把原来占位的 "Ready" 项换成 dirty 指示：

- `○ Saved`（绿色，`data-kind="ok"`）
- `● Modified`（黄色，`data-kind="warn"`）

`reset()` 也清空 `savedSnapshot`（reset 文档是新基线）。`savedSnapshot` 为 `null` 时不显示 Modified（避免新工作区打开就闪 Modified）。

i18n 加 `statusbar.row.modified` / `statusbar.row.saved` / `.title` 三 bundle；删 `statusbar.row.ready`。

**为什么** — JSON 比较而不是 edit counter：用 edit 计数不准（撤销 / 重做会双向变；mutation 内部可能 no-op）；JSON 比较准确反映"内容是否真的不同"。

**为什么** — 用 compact JSON 比较（`JSON.stringify(serialized)` 无 indent）：disk 上保存的是 indented JSON，但磁盘读取时反序列化得 V1 对象后再 stringify 出来跟 disk indent 无关。两边都走 `serializeDocument()` → compact stringify，保证字段集相同（不是格式化不同）。

**为什么** — dirty 不在 Save / Load 之外的路径标 false：`markClean` 只在写盘成功 + 反序列化成功后调，确保"saved"总是真的写到了 disk 或真的从 disk 读到了。失败路径（如 write 失败）不清 savedSnapshot，UI 仍显示 Modified（对：失败时文档状态没被保存）。

**为什么** — StatusBar 不是 MenuBar / 标题栏：用户明确选 StatusBar（"左侧画笔 + 屏幕坐标 + 右侧缩放 这个组件里面放"），且 StatusBar 24px 高度 + 持续可见，dirty 指示跟其他状态行（工具 / 坐标 / 缩放）放一起语义连贯。

---
