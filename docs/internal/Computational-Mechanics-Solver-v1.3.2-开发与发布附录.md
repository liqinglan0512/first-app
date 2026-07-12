# Computational Mechanics Solver v1.3.2 开发与发布附录

本文档只供开发、复核和发布使用。公开用户说明书不包含 Git、API、源码包、内部路径、测试文件和发布流程；相应证据集中保存在这里，避免在用户文档重构时丢失。

## 1. 版本身份

| 项目 | 值 |
|---|---|
| 产品发布名称 | Computational Mechanics Solver v1.3.2 |
| 冻结运行时构建 | 1.3.2-beta.2 |
| 冻结 Git 提交 | `87b683d11bf028ca2db419ca607e5f915f15288f` |
| 短提交号 | `87b683d` |
| 提交日期 | 2026-07-11T16:14:12+08:00 |
| 静力学 Schema | `cms-static-project@1` |
| 动力学 Schema | `cms-dynamics-project@1` |
| 核验 Python | 3.12.9 |
| 文档月份 | 2026-07 |

`v1.3.2` 是公开产品版本；`1.3.2-beta.x` 是可追踪的运行时构建。不得移动或重写已经发布的 v1.3.2 标签。

冻结实例的版本响应记录为：

```json
{
  "application": "computational-mechanics-solver",
  "version": "1.3.2-beta.2",
  "git_commit": "87b683d",
  "git_dirty": false,
  "started_at": "2026-07-11T12:45:12Z",
  "python_version": "3.12.9",
  "schema_static": "cms-static-project@1",
  "schema_dynamics": "cms-dynamics-project@1"
}
```

`git_commit` 用来确认代码基线，`git_dirty` 用来判断实例是否包含未提交修改，`started_at` 用来区分同一提交上的旧进程。生产候选必须满足 `git_dirty=false`。

## 2. 冻结源码证据

| 项目 | 值 |
|---|---|
| 源码包 | `release/v1.3.2/mechanics-v1.3.2-source.zip` |
| 生成来源 | `git archive 87b683d11bf028ca2db419ca607e5f915f15288f` |
| 归档文件数 | 55 |
| SHA256 | `3a55ef342ebc769004d31ca9ad57332312ff7d3fca098226e1aec3c4c82662c1` |

归档核查确认包含 `Dockerfile`、依赖文件、启动脚本、`src/`、`web/`、`tests/` 和 `examples/`，不包含 `.git`、虚拟环境、缓存、密钥或服务器认证信息。固定证据文件包括：

- `release/v1.3.2/version.txt`
- `release/v1.3.2/feature-matrix.md`
- `release/v1.3.2/known-limitations.md`
- `release/v1.3.2/case-verification.md`
- `release/v1.3.2/checksums.sha256.txt`

## 3. 运行与构建

### 3.1 本地运行

```powershell
python -m pip install -r requirements.txt
python run_webapp.py --host 127.0.0.1 --port 8765
```

需要显式源码路径时：

```powershell
$env:PYTHONPATH = "src"
python -m mechanics_mvp.webapp --host 127.0.0.1 --port 8765
```

### 3.2 容器运行

```powershell
docker build -t mechanics:v1.3.2 .
docker run --rm -p 8765:8765 mechanics:v1.3.2
```

`.dockerignore` 排除 `.git/`、`venv/`、缓存、字节码和 `.env`。公网部署仍需反向代理补充 HTTPS、请求体限制、超时、安全响应头、访问日志、健康检查和可回滚镜像。

### 3.3 公开说明书构建

公开说明书的可审查源文件为：

```text
docs/manual/v1.3.2/manual-source.md
```

构建和 Word 字段更新命令为：

```powershell
python tools/build_public_manual.py
powershell -NoProfile -ExecutionPolicy Bypass -File tools/export_public_manual.ps1
```

文档构建依赖记录在 `requirements-docs.txt`。生成结果为：

```text
docs/manual/v1.3.2/Computational-Mechanics-Solver-v1.3.2-用户与技术说明书.docx
web/downloads/computational-mechanics-solver-v1.3.2-manual.pdf
```

生成器使用 `web/welcome-bg.jpg` 合成 300 dpi A4 封面，随后创建 Word 多级标题、目录、SEQ/REF 字段、公式对象、表格和页眉页脚。`tools/export_public_manual.ps1` 使用 Microsoft Word 更新目录、交叉引用、公式与页码，并导出匹配 PDF。源 DOCX 的用户修改通过临时快照审阅，构建流程不覆盖该源文件。

## 4. Web API 边界

当前 HTTP 服务基于 Python `ThreadingHTTPServer`。它没有真实账户数据库、令牌、云工程、配额、作业队列或跨设备持久化。

| 方法与路径 | 请求 | 成功响应 | 主要错误 |
|---|---|---|---|
| `GET /api/version` | 无 | 版本、提交、dirty、启动时间、Python 和 Schema | 未定义专用错误结构 |
| `POST /api/solve` | 静力学 Project JSON | 位移、反力、杆端力、内力图和 summary | HTTP 422 JSON error |
| `POST /api/report` | 静力学 Project 与可选图片/选项 | `application/pdf` | HTTP 422 JSON error |
| `POST /api/dynamics-report` | `report_text` 与可选图片 | `application/pdf` | HTTP 422 JSON error |
| `GET /` | 无 | `web/index.html` | 404 |
| `GET /static/<path>` | 静态相对路径 | 静态资源 | 404，并阻止目录穿越 |

验证分三层：前端 Schema、后端预处理/诊断和求解器数值错误。常见拒绝条件包括零长度杆件、无效材料或截面、无效单位、约束不足、悬空引用、自定义场无非零面积、动力学步数或总样本超限。

### 4.1 报告信任边界

- 静力学报告由服务器重新求解，不信任前端传入的计算结果。
- 动力学报告接收前端生成的 `report_text`，后端不重新运行 JavaScript 动力学核心；它是客户端结果的格式化导出，不是独立服务端复算证明。
- 动力学报告文本上限为 200000 字符；图片 data URL 仍可能扩大请求体。

### 4.2 并发与安全限制

服务按请求创建线程；NumPy 求解和 PDF 生成仍消耗同一进程资源。v1.3.2 没有认证、限流、CSRF 防护、结构化 request ID、通用请求体大小限制、统一超时和生产级访问日志。

## 5. 计算链与代码边界

静力学主链：

```text
画布模型
  -> ProjectAdapter / Schema 校验
  -> /api/solve
  -> project_from_dict（输入转 SI）
  -> diagnose_project / validate_project
  -> 单元矩阵与一致节点荷载组装
  -> 约束自由度划分
  -> numpy.linalg.solve(Kff, Pf)
  -> 杆端力和 N/V/M 图恢复
  -> 工程单位格式化与报告
```

后端关键模块：

```text
src/mechanics_mvp/models.py       领域数据结构
src/mechanics_mvp/project_io.py   工程解析和迁移
src/mechanics_mvp/preprocess.py   预处理和荷载转换
src/mechanics_mvp/solver.py       Frame2D 数值核心
src/mechanics_mvp/engine.py       后端选择和诊断入口
src/mechanics_mvp/diagnostics.py  拓扑、约束和问题列表
src/mechanics_mvp/report.py       中文静力学与文本 PDF
src/mechanics_mvp/webapp.py       轻量 HTTP、静态资源和 API 边界
src/mechanics_mvp/units.py        单位白名单与 SI 转换
```

前端关键模块：

```text
web/project-schema.js             工程迁移与输入校验
web/project-adapter.js            界面状态序列化与恢复
web/dynamics-core.js              无 DOM 的动力学数值核心
web/dynamics-field-geometry.js    场几何纯函数
web/dynamics-field-placement.js   无 DOM 的场放置状态机
web/dynamics-report.js            动力学结果和报告文本
```

当前主要架构债务是 `web/app.js` 同时承担状态、DOM 事件、项目读写、静力学渲染和动力学渲染。后续拆分顺序为 Store、Renderer、Results、Controller；该拆分不属于 v1.3.2 公开说明书工作。

PINN 仅为占位后端并会抛出明确错误，不能作为已实现求解器。高刚度杆通过放大普通杆件刚度近似，不是严格刚性约束。

## 6. 测试与验证证据

Python 测试覆盖单位、项目解析、诊断、引擎诊断、梁柱、桁架、端部释放、杆中集中作用、报告、Web API 和端到端 HTTP。JavaScript 测试覆盖单位、项目 Schema、适配器、动力学核心、场放置、导入文本安全、头像布局和动力学报告。

关键解析与回归案例包括：

- 悬臂梁端力 `PL^3/(3EI)`。
- 简支梁均布荷载对称反力和跨中弯矩。
- 桁架单杆 `u=PL/(EA)`。
- 单端弯矩释放静力凝聚。
- 杆中集中力、集中力偶和同杆多作用叠加。
- 自定义场非零面积与事务式放置。
- 重力抛体解析轨迹。
- 均匀磁场圆周运动与 RK4 收敛阶。
- PDF 中文提取、公式、结论和无 Unicode 替换字符。

自动测试不能覆盖全部像素布局、浏览器字体、下载对话框和真实交互顺序。发布前仍需浏览器人工验收和文档逐页渲染检查。

## 7. 案例证据等级

案例证据分为：

- A 级：存在完整输入，可由冻结代码复算并与解析解或独立平衡关系比较。
- B 级：只有界面与结果截图，可核查可见内容，但不能恢复全部输入。
- C 级：没有收到对应工程或截图。

当前状态以 `release/v1.3.2/case-verification.md` 为准。仓库内置的悬臂梁、简支均布梁、重力抛体和均匀磁场圆周运动用于 A 级补充验证，不得冒充用户案例。

## 8. 公开文档剥离规则

公开 DOCX/PDF 中不得出现：

- 本地用户目录或绝对路径。
- Git 提交、dirty、started_at 和开发分支。
- 源码 ZIP、SHA256 和内部文件清单。
- API 路由、HTTP 服务实现和测试文件清单。
- `app.js` 架构债务和发布流程。

公开文档可以保留 Euler-Bernoulli 梁、桁架轴向刚度、刚度法、一致节点荷载、RK4、能量、动量、洛伦兹力、数值误差、步长收敛和软件能力边界，但必须用用户语言解释。

## 9. 发布前复核清单

1. 确认 v1.3.2 历史标签未移动。
2. 确认候选提交工作区干净，`/api/version` 返回预期构建和当前启动时间。
3. 运行全部 Python 与 JavaScript 测试。
4. 逐页渲染公开 DOCX/PDF，检查封面、目录、中文字体、公式、表格、图题和页码。
5. 扫描公开文档，确认没有本地路径、Git、API、源码包和替换字符。
6. 核对三个用户案例的证据等级，不补造缺失输入或结果。
7. 检查 DOCX 与 PDF 内容一致，PDF 可搜索。
8. 核对下载入口指向最终 PDF。
9. 检查归档 SHA256，保留上一候选以便回滚。
