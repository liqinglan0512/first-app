# v1.5.0-alpha.1 安全审查

- 审查日期：2026-07-12
- 候选分支：`release/v1.5.0-alpha.1`
- 对比基线：`main`（`87b683d11bf028ca2db419ca607e5f915f15288f`）
- 集成节点：`c23c390`，以及本安全审查所随附的发布文档、验证脚本和 Docker 版本修正
- 结论：未发现真实凭据、私钥、访问令牌、带认证信息的 URL、生产数据库连接串或被跟踪的运行时数据库；允许进入 alpha 草稿 PR。

## 1. 审查范围与方法

审查覆盖 Git 跟踪内容和 `main..release/v1.5.0-alpha.1` 新增历史，而不只检查当前工作目录。

自动扫描项目包括：

- PEM/RSA/EC/OpenSSH/DSA 私钥头；
- AWS `AKIA...`、GitHub `gh*`/`github_pat_*`、OpenAI `sk-*`、Slack `xox*` 与 JWT 形态；
- URL 内嵌用户名/密码；
- `.env`、`.pem`、`.key`、`.p12`、`.pfx`、SQLite/数据库文件是否被 Git 跟踪；
- `CMS_AUTH_SECRET`、`CMS_DATABASE_URL`、`CMS_INTERNAL_INVITE_CODE` 的赋值与引用；
- `src/`、`web/`、`tools/` 中静态密码、Secret、Token、Cookie 或 API Key 字符串赋值；
- 新增提交的文本补丁以及二进制文件解码后可见的 ASCII/UTF-8 凭据形态。

在集成节点 `c23c390` 上，扫描了 150 个 Git 跟踪文件和 `main..HEAD` 的 16 个提交，通用凭据模式命中数为 0。加入发布文档、验证脚本和 Docker 版本修正后，提交前复扫范围扩大为 155 个 Git 跟踪文件，并同时扫描候选历史与暂存补丁；通用凭据模式命中数仍为 0。推送前继续使用同一规则复扫。

## 2. 人工复核结果

### 2.1 环境配置

唯一被跟踪的环境文件是 `.env.example`。其中：

- `CMS_AUTH_SECRET=change-me` 与 `CMS_INTERNAL_INVITE_CODE=change-me` 是明确的无效占位符；
- `CMS_DATABASE_URL=sqlite:///data/mechanics.db` 只指向本地开发相对路径；
- `CMS_COOKIE_SECURE=false` 仅适用于示例中的 `CMS_ENV=development`。

这些值不得直接用于生产。生产启动会拒绝缺失或不足 32 字节的认证密钥，并拒绝在生产模式关闭安全 Cookie。

测试中的 `a-production-secret-with-at-least-32-bytes` 是固定测试夹具，不是任何环境的真实密钥。未发现真实内测码；浏览器验收使用的临时值只存在于本地进程环境，没有写入 Git。

### 2.2 认证与会话

- 密码使用 Argon2id，不保存或回传明文密码。
- 会话、CSRF、同源检查、登录限速和可撤销会话均在服务端执行。
- 权益来源为服务端会话；前端自报角色不能提升权限。
- Internal Tester 不继承 Admin；正式报告和高级导出由 HTTP 服务端再次鉴权。
- 内测码只从 `CMS_INTERNAL_INVITE_CODE` 读取，数据库保存 HMAC 指纹而非原文，并具备失败限速、有效期、人数/地址上限和管理员撤销测试。

### 2.3 表达式与资源边界

- 变化场表达式使用自建词法分析、受控 AST 和白名单求值器。
- 未使用 `eval`、`new Function` 或 Python `eval` 执行工程内容。
- 表达式长度、token、AST 深度、参数数量和单次求值操作数均有限制。
- 世界积分限制最大步数、样本数、接触子步和最坏工作量；调用项目不能提高宿主安全上限。
- 不支持的碰撞几何 fail-closed，不以包围圆静默近似。

## 3. 残余风险与部署前必做项

1. 这是 alpha 候选，不应直接替换公网生产容器。
2. 部署人员必须生成新的随机 `CMS_AUTH_SECRET`，并通过密钥管理或受限环境文件注入；不得写入仓库、镜像层、命令历史或 URL。
3. `CMS_INTERNAL_INVITE_CODE` 为可选生产秘密；若启用，应单独随机生成、设置最小权限，并在发布后轮换。
4. 生产必须置 `CMS_ENV=production`、`CMS_COOKIE_SECURE=true`，只经 HTTPS 暴露。
5. 数据库与头像目录必须使用持久卷；升级前备份数据库和上传文件，并在隔离候选库上先跑迁移。
6. 草稿 PR 合并前应启用 GitHub secret scanning/依赖审查（若仓库策略支持），并再次运行本文件所列本地扫描。

## 4. 明确未执行的操作

- 未连接或修改阿里云服务器。
- 未停止、重建、替换或重启任何公网容器。
- 未向 Git URL、文件、日志或 PR 文本写入凭据。
- 未创建或移动 `v1.3.2-beta.1`、`v1.3.2-beta.2` 或任何 v1.5 标签。
