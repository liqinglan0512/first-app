# v1.5.0 安全审查

## 审查范围

审查当前 Git 跟踪内容、环境变量示例、认证/会话/权益实现、数据库迁移和部署文档。扫描关键词包括内测码、password、secret、token、cookie、数据库 URL 与私钥头。

## 结论

- 未发现用户指定禁止提交的真实内测码、生产密码、Session secret、GitHub Token、SSH/PEM 私钥或生产数据库凭据。
- `.env.example` 仅包含 `change-me` 和本地 SQLite URL 等无效示例；`.env` 被忽略且未提交。
- 密码经哈希保存，认证 Cookie 为 HttpOnly；生产模式强制足够强的 `CMS_AUTH_SECRET` 和 `CMS_COOKIE_SECURE=true`。
- 内测码只从 `CMS_INTERNAL_INVITE_CODE` 读取；服务端保存 HMAC 指纹而不是原文，并限制有效期、用户数和地址尝试数。
- 测试中的密码、Token、Cookie 与内测码均为隔离的虚构夹具，不是生产秘密。

## 部署要求

1. 通过密钥管理服务注入随机 `CMS_AUTH_SECRET`、数据库凭据和可选内测码，不写入仓库、镜像层、命令历史、日志或 URL。
2. 生产设置 `CMS_ENV=production`、`CMS_COOKIE_SECURE=true`，只经 HTTPS 暴露。
3. 为生产数据库账户配置最小权限，部署前备份并验证恢复。
4. 发布后检查日志脱敏、会话撤销、权限边界和内测码轮换；不用内测通道时不设置该变量。

## 清理审计

旧 QA 截图、JSON、源码 ZIP、校验清单与重复 PDF 已按逐项引用审计删除；当前源代码、测试、迁移、依赖文件和唯一公开历史说明书均保留。本次未推送 GitHub、未连接阿里云、未切换正式服务。
