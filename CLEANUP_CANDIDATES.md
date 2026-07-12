# v1.5.0 发布前清理候选与引用审计

- 审计日期：2026-07-12
- 审计分支：`chore/v1.5.0-release-cleanup`
- Git 跟踪文件：155 个（清理前）
- 原则：只有可由 Git/bundle 恢复、且不被当前代码、测试、构建、数据库迁移或部署依赖的文件才删除。

## 1. 文件分类

| 分类 | 内容 | 处理原则 |
|---|---|---|
| A 当前源码 | `src/`、`web/*.js`、`web/*.css`、`web/index.html` | 保留 |
| B 当前测试 | `tests/` | 保留；随版本和说明书规则更新测试 |
| C 数据库迁移 | `src/mechanics_mvp/migrations/` | 全部保留 |
| D 依赖和构建 | Docker、Python 依赖、启动脚本、当前说明书构建脚本 | 保留 |
| E 网站静态资源 | 当前背景、PNG 头像、唯一下载 PDF | 保留；删除未引用的重复 JPG |
| F 当前保留说明书 | v1.3.2 唯一公开 PDF、`manual-source.md`、4 个必要图片、当前构建/导出脚本 | 保留并标记为历史版本 |
| G 历史说明书 | 旧 DOCX、重复 `manual.md`、旧 QA 报告、4 个只被旧稿使用的截图 | 删除 |
| H 旧 release 产物 | `release/v1.3.2`、`v1.4.0-beta.1`、`v1.5.0-alpha.1` | 删除 |
| I 旧 QA | release 浏览器 QA、截图、JSON、manual QA | 删除 |
| J 旧计划/部署 | v1.3.2 计划、旧交接、alpha 发布说明 | 由 v1.5.0 文件替代后删除 |
| K 临时输出 | 未跟踪的 `advanced-report.pdf` | 确认仅为 README 示例输出后删除 |
| L 无法归入本产品 | 未跟踪且本地排除的 `insert_report_images.py` | 与本仓库产品无关，视为用户文件，保留且不提交 |

## 2. 说明书结论

- 唯一公开下载 PDF：`web/downloads/computational-mechanics-solver-v1.3.2-manual.pdf`
- 文件头：`%PDF`
- 大小：1,347,207 字节
- SHA256：`0599a6019cc0ed4245a1869a16d3d6f8d2a4b6ac4f38b979085f06018ef1cf17`
- 重复 release PDF：8,581,850 字节，SHA256 `ac34853723db4844554c9167f062b83482e23146c63455337160f738b0f04cf5`，与网站下载 PDF 不同；网站实际下载版本优先。
- 维护源：`docs/manual/v1.3.2/manual-source.md`
- 当前构建脚本：`tools/build_public_manual.py`、`tools/export_public_manual.ps1`
- 必要图片：`cover-v1.3.2.png`、`static-triangle-frame-case.png`、`dynamics-magnetic-case.png`、`dynamics-spiral-case.png`
- 旧 DOCX 已由用户明确授权删除；测试改为验证维护源与唯一 PDF，不再要求仓库提交生成 DOCX。

## 3. 逐文件删除候选

| 文件 | 类型 | 是否被引用 | 可由 Git/快照恢复 | 删除理由 | 处理决定 |
|---|---|---:|---:|---|---|
| `CODEX_PLAN_v1.3.2.md` | 旧计划 | 仅自引用/旧文件引用 | 是 | 已由主计划替代 | 删除 |
| `DEPLOYMENT_HANDOFF.md` | alpha 交接 | 主计划、alpha Notes | 是 | 由 v1.5.0 交接替代 | 删除并更新引用 |
| `DEPLOYMENT_HANDOFF_v1.3.2.md` | 旧交接 | 旧计划 | 是 | 旧容器与版本流程 | 删除 |
| `RELEASE_NOTES_v1.5.0-alpha.1.md` | alpha Notes | 当前无运行依赖 | 是 | 由正式 v1.5.0 Notes 替代 | 删除 |
| `docs/internal/Computational-Mechanics-Solver-v1.3.2-开发与发布附录.md` | 旧内部附录 | 只引用旧 release | 是 | 不用于当前部署 | 删除 |
| `docs/manual/v1.3.2/Computational-Mechanics-Solver-v1.3.2-用户与技术说明书.docx` | 生成 DOCX | 旧测试/README | 是 | 用户授权删除；PDF 与源稿已保留 | 删除并更新测试 |
| `docs/manual/v1.3.2/QA-REPORT.md` | 旧 QA | 旧 README | 是 | 生成期 QA 已由当前测试替代 | 删除并更新 README |
| `docs/manual/v1.3.2/manual.md` | 重复旧源稿 | 旧构建脚本 | 是 | `manual-source.md` 是唯一维护源 | 删除 |
| `docs/manual/v1.3.2/assets/current-homepage.png` | 旧截图 | 仅旧 `manual.md` | 是 | 不被当前源稿引用 | 删除 |
| `docs/manual/v1.3.2/assets/module-choice.png` | 旧截图 | 仅旧 `manual.md` | 是 | 不被当前源稿引用 | 删除 |
| `docs/manual/v1.3.2/assets/static-workspace.png` | 旧截图 | 仅旧 `manual.md` | 是 | 不被当前源稿引用 | 删除 |
| `docs/manual/v1.3.2/assets/dynamics-workspace.png` | 旧截图 | 仅旧 `manual.md` | 是 | 不被当前源稿引用 | 删除 |
| `release/v1.3.2/archive-manifest.txt` | 旧清单 | 旧计划 | 是 | 旧源码包清单 | 删除 |
| `release/v1.3.2/browser-qa.json` | 旧 QA | 仅自引用截图 | 是 | 被当前测试替代 | 删除 |
| `release/v1.3.2/case-verification.md` | 旧核验 | 旧说明/附录 | 是 | 不用于当前运行；移除旧引用 | 删除 |
| `release/v1.3.2/checksums.sha256.txt` | 旧校验 | 旧构建脚本/旧说明 | 是 | 对应将删除的重复 PDF/ZIP | 删除 |
| `release/v1.3.2/computational-mechanics-solver-v1.3.2-manual.pdf` | 重复 PDF | 旧 QA/旧构建 | 是 | 与网站唯一 PDF 不同且非下载源 | 删除 |
| `release/v1.3.2/feature-matrix.md` | 旧审计 | 旧说明 | 是 | 已由当前代码/测试/Notes 替代 | 删除 |
| `release/v1.3.2/known-limitations.md` | 旧审计 | 旧说明 | 是 | 由 v1.5.0 Notes/物理验证替代 | 删除 |
| `release/v1.3.2/manual-qa.md` | 旧 QA | 无当前依赖 | 是 | 已被当前测试替代 | 删除 |
| `release/v1.3.2/mechanics-v1.3.2-source.zip` | 旧 ZIP | 旧清单/说明 | 是 | Git 已保存源码历史 | 删除 |
| `release/v1.3.2/version.txt` | 旧版本记录 | 旧说明/工具 | 是 | 当前版本由代码/API提供 | 删除 |
| `release/v1.3.2/screenshots/announcement-v1.3.2.png` | 旧截图 | 旧 QA JSON | 是 | 当前测试替代 | 删除 |
| `release/v1.3.2/screenshots/dynamics-manual-download.png` | 旧截图 | 旧 QA JSON | 是 | 当前测试替代 | 删除 |
| `release/v1.3.2/screenshots/homepage-v1.3.2-mobile.png` | 旧截图 | 旧 QA JSON | 是 | 当前测试替代 | 删除 |
| `release/v1.3.2/screenshots/homepage-v1.3.2.png` | 旧截图 | 旧 QA JSON | 是 | 当前测试替代 | 删除 |
| `release/v1.3.2/screenshots/static-manual-download.png` | 旧截图 | 旧 QA JSON | 是 | 当前测试替代 | 删除 |
| `release/v1.4.0-beta.1/browser-qa-1366x768.png` | 旧 QA 截图 | QA JSON | 是 | 被当前测试替代 | 删除 |
| `release/v1.4.0-beta.1/browser-qa-1692x960.png` | 旧 QA 截图 | QA JSON | 是 | 被当前测试替代 | 删除 |
| `release/v1.4.0-beta.1/browser-qa-390x844.png` | 旧 QA 截图 | QA JSON | 是 | 被当前测试替代 | 删除 |
| `release/v1.4.0-beta.1/browser-qa.json` | 旧 QA | 主计划历史记录 | 是 | 被当前测试替代；主计划改为历史说明 | 删除 |
| `release/v1.5.0-alpha.1/browser-qa-desktop-1366x768.png` | alpha QA 截图 | QA JSON | 是 | 正式 v1.5.0 以自动测试为门禁 | 删除 |
| `release/v1.5.0-alpha.1/browser-qa-mobile-390x844.png` | alpha QA 截图 | QA JSON | 是 | 正式 v1.5.0 以自动测试为门禁 | 删除 |
| `release/v1.5.0-alpha.1/browser-qa-wide-1692x960.png` | alpha QA 截图 | QA JSON | 是 | 正式 v1.5.0 以自动测试为门禁 | 删除 |
| `release/v1.5.0-alpha.1/browser-qa.json` | alpha QA | 主计划/alpha Notes | 是 | 正式验证与报告替代 | 删除并更新引用 |
| `tools/build_manual.py` | 旧构建脚本 | 仅旧 `manual.md` | 是 | 当前构建为 `build_public_manual.py` | 删除 |
| `tools/build_release_metadata.py` | 旧 release 工具 | 仅旧计划 | 是 | 只生成将删除的 ZIP/清单 | 删除 |
| `web/brand-avatar.jpg` | 重复静态资源 | 仅旧 archive manifest | 是 | 与被引用的 PNG 字节完全相同 | 删除 |
| `advanced-report.pdf` | 未跟踪临时报告 | README 仅把同名文件作为命令输出 | 补丁前状态/可重新生成 | 不参与运行、测试、下载或示例输入 | 删除未跟踪输出；README 改用明确的临时输出路径 |

## 4. 明确保留

- `Dockerfile`、`.dockerignore`、`.env.example`、`pyproject.toml`、`requirements.txt`、`requirements-docs.txt`、`Procfile`、启动脚本。
- `src/`、`web/`（除上述重复 JPG）、`tests/`、`examples/`。
- 两个数据库迁移及认证、会话、权益、碰撞、刚体、轨道、变化场、安全表达式实现。
- `docs/adr/`、`SECURITY_REVIEW.md`、`PHYSICS_VALIDATION.md`、`CODEX_MASTER_PLAN.md`。
- v1.3.2 唯一网站 PDF、维护源稿、当前说明书构建/导出脚本和四个必要图片。
- 与本产品无关的用户本地脚本 `insert_report_images.py`：保持未跟踪、不修改、不提交。
