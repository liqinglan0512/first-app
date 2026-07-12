# ADR 0001：服务器账户、会话与云存储边界

- 状态：已接受
- 日期：2026-07-12
- 目标版本：v1.4.0-beta.1

## 1. 背景

v1.3.2 的“账户”只存在浏览器 `localStorage`，没有密码验证、服务器会话、跨设备身份或可撤销登录。该状态只能称为本地配置，不能继续作为云账户基础。v1.4.0-beta.1 需要建立真实服务器账户，同时保留现有静力学、动力学和工程文件工作流。

本 ADR 只决定账户、会话、数据库、头像与旧配置迁移边界。套餐权益在 ADR 0002 中定义，云工程版本历史在后续独立 ADR 中定义。

## 2. 决策

### 2.1 数据库

- 开发和自动测试默认使用 SQLite。
- 生产通过 `CMS_DATABASE_URL=postgresql://...` 使用 PostgreSQL。
- 应用只通过参数化 DB-API 仓储访问数据库，不在路由中拼接 SQL。
- 主键使用随机 UUID 文本，避免依赖数据库自增方言。
- 时间统一保存为 UTC ISO 8601 文本。
- SQL 迁移位于 `src/mechanics_mvp/migrations/`，由 `schema_migrations` 记录版本和应用时间。
- 应用启动前自动执行尚未应用的向前迁移；生产回滚依赖数据库备份和上一镜像，不自动执行破坏性降级迁移。

初始迁移至少建立：

- `users`
- `sessions`
- `roles`
- `entitlements`
- `subscription_plans`
- `user_entitlements`
- `login_attempts`

### 2.2 密码

- 使用 `argon2-cffi` 的 Argon2id `PasswordHasher`。
- 数据库只保存 Argon2 编码哈希，永不保存、返回或记录明文密码。
- 不存在的用户名也执行一次虚拟 Argon2 验证，并返回与密码错误相同的状态和文案，降低用户名枚举风险。
- 密码限制为 10 到 128 个字符；不要求会诱导弱密码模式的固定字符组合。
- 修改密码必须验证原密码；成功后撤销该用户除当前请求外的其他会话，并轮换当前会话。

### 2.3 会话 Cookie

- 浏览器只保存随机会话令牌，Cookie 名为 `cms_session`。
- 数据库只保存令牌的 SHA-256 摘要，不保存原令牌。
- Cookie 设置 `HttpOnly`、`SameSite=Lax`、`Path=/` 和有限 `Max-Age`。
- 生产环境强制 `Secure`；`CMS_COOKIE_SECURE=false` 会使应用拒绝启动。
- 退出登录、密码修改、账户停用和服务端管理操作可以撤销会话。
- 会话接口只返回必要用户资料、会话到期时间和 CSRF Token，不返回密码哈希、Cookie 或数据库路径。

### 2.4 CSRF 与同源检查

- 登录和注册要求请求 `Origin` 与 `Host` 同源；非浏览器客户端也必须显式发送匹配的 `Origin`。
- 已认证的资料、头像、密码和退出接口必须同时满足同源检查与 `X-CSRF-Token` 验证。
- CSRF Token 由随机会话令牌和服务端密钥通过域分离 HMAC 派生；数据库只保存其 SHA-256 摘要。Token 在同一会话内稳定，避免多个标签页互相轮换失效。
- `SameSite` 是附加防线，不能替代 Token 验证。

### 2.5 登录限速

- 登录失败按“规范化用户名摘要”和“来源地址摘要”分别计数。
- 摘要使用服务端 HMAC 密钥，日志与数据库不记录明文密码、Cookie、内测码或密码哈希。
- 默认窗口为 15 分钟；用户名失败上限 8 次，来源地址上限 30 次。
- 注册按来源地址设置独立窗口和上限。
- 超限返回统一错误代码和 `Retry-After`，不透露账号是否存在。
- 多实例生产部署后应把同一仓储迁移到共享 PostgreSQL；无需先引入 Redis。

### 2.6 头像

- 头像为可选 multipart 文件，默认显示 CM 头像。
- 允许 PNG、JPEG、WebP；同时核对文件扩展名、声明 MIME 和 Pillow 解码后的真实格式。
- 默认上限 2 MiB、最大边长 4096 像素，拒绝损坏文件和路径穿越文件名。
- 服务端使用用户 UUID 和验证后的扩展名生成文件名，不使用客户端路径。
- 文件写入临时文件后原子替换；数据库只保存服务端相对路径。
- 头像目录在运行数据目录中，不进入 Git。

### 2.7 前端与旧本地配置

- 当前用户身份只能来自 `GET /api/auth/session`。
- 前端不得从 `localStorage` 恢复、创建或修改用户身份。
- `localStorage` 只保留字体大小等设备偏好。
- 检测到旧 `cms_users` 或 `cms_current_user` 时，只显示迁移提示：用户应使用同名账号重新注册或登录。
- 不解析、显示或上传旧密码；服务器注册或登录成功后，前端只按键名删除旧身份键，不读取其中的值。

### 2.8 日志和错误

- 认证错误使用稳定代码和用户可读中文，不向客户端返回堆栈、SQL、绝对路径或内部异常。
- HTTP 响应统一设置内容安全策略、防嵌入、最小权限和无引用来源等安全头。
- 服务器日志不得包含密码、密码哈希、Session Cookie、CSRF Token 或内测码。
- 用户名不可用、账号停用和凭据错误采用尽量统一的登录响应。

## 3. API 合同

| 方法 | 路径 | 用途 |
|---|---|---|
| `GET` | `/api/auth/session` | 获取当前会话和 CSRF Token |
| `POST` | `/api/auth/register` | 注册并自动登录；可随后调用头像接口 |
| `POST` | `/api/auth/login` | 用户名和密码登录 |
| `POST` | `/api/auth/logout` | CSRF 验证后撤销当前会话 |
| `PATCH` | `/api/auth/profile` | 修改昵称 |
| `POST` | `/api/auth/password` | 使用原密码修改密码并轮换会话 |
| `POST` | `/api/auth/avatar` | 验证并替换头像 |

成功响应中的用户对象只包含：`id`、`username`、`displayName`、`avatarUrl`、`role`、`createdAt`。错误统一为：

```json
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "用户名或密码错误。"
  }
}
```

## 4. PostgreSQL 兼容策略

- SQL 迁移只使用 SQLite 与 PostgreSQL 共有的基础 DDL。
- 应用查询源代码使用 `?` 占位符，数据库适配层在 PostgreSQL 下转换为 `%s`。
- SQLite 每个请求使用独立连接并开启 `foreign_keys`、WAL 与 busy timeout。
- PostgreSQL 通过 `psycopg` 和 `dict_row` 使用独立连接；生产连接池作为后续性能优化，不改变仓储合同。
- CI 至少执行 SQLite 全量认证测试；有 PostgreSQL 服务的流水线执行同一仓储合同测试。

## 5. 被拒绝的方案

### 5.1 继续使用 localStorage

拒绝。它无法安全验证密码、撤销会话、跨设备同步或实施服务端权限。

### 5.2 自制密码加密或可逆加密

拒绝。密码使用成熟的单向、内存困难哈希，不发明算法。

### 5.3 把访问令牌保存到 localStorage

拒绝。脚本可读取的长期令牌会扩大 XSS 后果；会话令牌使用 HttpOnly Cookie。

### 5.4 只隐藏前端按钮实现权限

拒绝。下一阶段的报告与商业权益必须在服务端验证。

### 5.5 立即引入大型 Web 框架和任务队列

暂不采用。当前路由规模可以在现有 HTTP 边界内建立独立 AuthService 和 Repository；后续迁移框架时保留领域合同。此决策不把轻量服务器宣称为完整生产平台。

## 6. 结果与后续工作

- v1.4.0-beta.1 可以形成真实、可撤销的服务器账户。
- 数据库和认证逻辑与静力学、动力学求解器解耦。
- 旧浏览器配置不会静默变成云账户，也不会上传旧密码。
- ADR 0002 将在该会话与角色基础上定义 Free、Plus、Pro 和 Internal Tester 权益。
- 云工程、自动保存、版本历史、分享和对象存储不在本 ADR 的实现范围内。
