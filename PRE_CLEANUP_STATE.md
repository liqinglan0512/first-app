# v1.5.0 清理前状态

- 记录时间：2026-07-12 22:38:29（Asia/Shanghai）
- 清理分支：`chore/v1.5.0-release-cleanup`
- 起始分支：`release/v1.5.0-alpha.1`
- 完整提交号：`8a256c8a25b128f1e460fc6f7161d0c286c0a28c`
- 短提交号：`8a256c8`
- 本地备份标签：`backup/pre-v1.5.0-cleanup-20260712-223829`
- Git bundle：`C:\Users\lijiahao\Desktop\first-app-pre-v1.5.0-cleanup.bundle`
- 工作区补丁：`C:\Users\lijiahao\Desktop\first-app-pre-v1.5.0-cleanup.patch`

## Bundle 验证

- Bundle 大小：56,910,578 字节
- `git bundle verify`：通过
- Bundle 记录完整历史，哈希算法为 SHA-1。

## 清理前未提交状态

```text
 M CODEX_MASTER_PLAN.md
 D docs/manual/v1.3.2/Computational-Mechanics-Solver-v1.3.2-用户与技术说明书.docx
 M tests/release_ui.test.js
 M web/index.html
```

其中 DOCX 删除是用户已明确授权保留的删除；主页公告和 `release_ui` 测试是按 v1.5 发布说明完成的未提交修改；`CODEX_MASTER_PLAN.md` 为用户已有修改。以上差异已写入二进制补丁，清理过程中不得覆盖。

## 清理前标签

```text
backup/pre-v1.5.0-cleanup-20260712-223829
v1.3.2-beta.1
v1.3.2-beta.2
```

备份标签仅保留在本地，不推送。既有 v1.3.2 标签不得移动、删除或改写。
