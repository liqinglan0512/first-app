# 清理前状态

清理从提交 `8a256c8a25b128f1e460fc6f7161d0c286c0a28c` 开始。工作区原有修改已纳入二进制补丁，完整 Git 历史已写入 bundle，并创建本地备份标签。详细状态见 `PRE_CLEANUP_STATE.md`，逐项审计见 `CLEANUP_CANDIDATES.md`。

# 删除文件

| 文件 | 删除原因 | 是否被引用 | 恢复方式 |
|---|---|---:|---|
| `release/v1.3.2/**`（16 项） | 重复 PDF、旧 ZIP、截图、QA、清单与发布审计产物 | 仅旧产物互引；当前引用已移除 | Git 历史、备份标签或 bundle |
| `release/v1.4.0-beta.1/**`（4 项） | 旧浏览器 QA 截图与 JSON | 主计划历史引用已改写 | Git 历史、备份标签或 bundle |
| `release/v1.5.0-alpha.1/**`（4 项） | alpha 浏览器 QA 产物已由当前自动测试替代 | 主计划历史引用已改写 | Git 历史、备份标签或 bundle |
| 三份旧计划/部署交接 | 已由主计划和 v1.5.0 交接替代 | 引用已更新 | Git 历史、备份标签或 bundle |
| alpha Release Notes | 已由正式 v1.5.0 Notes 替代 | 无运行依赖 | Git 历史、备份标签或 bundle |
| 旧内部附录、QA 报告、旧 manual.md/DOCX | 过时或重复生成物 | 当前手册 README/测试已更新 | Git 历史、备份标签或 bundle |
| 四张无引用手册截图 | 当前说明书源与 PDF 不引用 | 否 | Git 历史、备份标签或 bundle |
| 两个旧构建脚本 | 已由当前公开手册流程替代 | 否 | Git 历史、备份标签或 bundle |
| `web/brand-avatar.jpg` | 与被引用 PNG 字节重复 | 否 | Git 历史、备份标签或 bundle |
| `advanced-report.pdf` | 未跟踪的临时报告输出 | README 仅描述生成行为 | 工作区补丁/原生成流程 |

# 保留的历史资产

- v1.3.2 用户与技术说明书：`web/downloads/computational-mechanics-solver-v1.3.2-manual.pdf`
- SHA256：`0599a6019cc0ed4245a1869a16d3d6f8d2a4b6ac4f38b979085f06018ef1cf17`
- 可维护源：`docs/manual/v1.3.2/manual-source.md`，配套当前构建脚本及必要图片保留。

# 当前 v1.5.0 资产

- `src/` 当前源代码、`tests/` 全部测试、数据库迁移、依赖文件和 Dockerfile 均保留。
- README、`RELEASE_NOTES_v1.5.0.md` 和 `DEPLOYMENT_HANDOFF_v1.5.0.md` 已按真实实现更新。

# 版本统一结果

- pyproject 通过 `src/mechanics_mvp/version.py` 动态读取 `1.5.0`。
- `/api/version`、页面标题/公告/显示版本、README 和 Docker 默认版本均为 1.5.0。

# Schema 兼容性

- 静力学 Schema：`cms-static-project@1`。
- 动力学 Schema：`cms-dynamics-project@2`。
- 保留 `cms-dynamics-project@1` 到 `@2` 的迁移和测试；账户数据库迁移完整保留。

# 测试结果

- Python：78 项通过。
- JavaScript：全部 19 个测试文件通过；web 下全部 JavaScript 语法检查通过。
- HTTP/数据库：单元 HTTP 服务覆盖首页、版本、PDF、注册/登录/退出、迁移和权益，全部通过。
- 安全：关键词扫描未发现真实秘密；仅命中环境变量名、占位符、实现标识与虚构测试夹具。
- 物理验证：弹性/非弹性碰撞、偏心冲量、滚动、轨道收敛、变化场 RK4 和加速接触全部通过。

# 未执行操作

- GitHub 未推送。
- 阿里云未连接、未部署。
- 正式服务未切换、未停止或替换。
