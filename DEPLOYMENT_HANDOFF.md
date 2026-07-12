# v1.5.0-alpha.1 人工部署与回滚交接

> 本次任务没有连接阿里云、没有更新公网服务、没有停止或替换容器。本文件只提供后续人工候选验证与回滚步骤；执行正式切换前必须另行取得明确批准。

## 1. 固定发布范围

- 候选分支：`release/v1.5.0-alpha.1`
- 基线：`main`（`87b683d11bf028ca2db419ca607e5f915f15288f`）
- 版本：`1.5.0-alpha.1`
- 静力学工程 Schema：`cms-static-project@1`
- 动力学工程 Schema：`cms-dynamics-project@2`
- 目标交付：草稿 PR，不自动合并、不创建标签、不自动部署

部署人员必须在操作开始时把候选分支 HEAD 固定为不可变的完整提交号：

```bash
git fetch origin --prune
RELEASE_COMMIT="$(git rev-parse origin/release/v1.5.0-alpha.1^{commit})"
test -n "$RELEASE_COMMIT"
git show --no-patch --oneline "$RELEASE_COMMIT"
```

后续构建、检查和回滚记录都必须使用该完整提交号，不得在部署中途重新解析变化的分支名。

## 2. 生产配置要求

生产环境至少配置：

```text
CMS_ENV=production
CMS_AUTH_SECRET=<独立生成的至少 32 字节随机秘密>
CMS_DATABASE_URL=<持久 PostgreSQL URL，或明确持久化的 SQLite URL>
CMS_DATA_DIR=<持久头像/数据目录>
CMS_COOKIE_SECURE=true
CMS_INTERNAL_INVITE_CODE=<可选；独立随机秘密>
CMS_INTERNAL_INVITE_TTL_DAYS=90
CMS_INTERNAL_INVITE_USER_LIMIT=5
CMS_INTERNAL_INVITE_ADDRESS_LIMIT=20
```

要求：

- Secret 只能通过平台密钥管理、受限环境文件或编排系统注入；不得写入 Git、镜像层、命令历史、日志或 URL。
- 公网入口必须是 HTTPS；反向代理应保留正确 Host/Origin，并设置合理请求体和超时上限。
- SQLite 只适合单实例；多实例或需要高可用时使用 PostgreSQL。
- 数据库与 `CMS_DATA_DIR` 必须持久化并纳入备份。
- 应用启动会自动执行可追踪迁移，因此候选环境必须使用生产库的隔离备份/克隆，不能直接拿生产主库做第一次试跑。

## 3. 本地与 CI 发布门禁

在干净检出中执行：

```powershell
git switch release/v1.5.0-alpha.1
git status --short
.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py"
$files = rg --files tests | Where-Object { $_ -like '*.test.js' }
foreach ($file in $files) { node $file; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
node tools\physics_validation_metrics.js --json
node --check web\app.js
node --check web\dynamics-world.js
git diff --check
```

验收要求：工作区干净、Python 77/77、全部 JavaScript 测试通过、物理验证脚本退出码为 0、语法和 Diff 检查通过。

## 4. 构建可追踪候选镜像

建议使用独立 worktree：

```bash
test ! -e "/opt/projects/first-app-${RELEASE_COMMIT:0:12}"
git worktree add --detach "/opt/projects/first-app-${RELEASE_COMMIT:0:12}" "$RELEASE_COMMIT"
cd "/opt/projects/first-app-${RELEASE_COMMIT:0:12}"
test -z "$(git status --porcelain)"
test "$(git rev-parse HEAD)" = "$RELEASE_COMMIT"
```

构建镜像：

```bash
docker build \
  --build-arg APPLICATION_VERSION=1.5.0-alpha.1 \
  --build-arg GIT_COMMIT="$RELEASE_COMMIT" \
  --build-arg GIT_DIRTY=false \
  --label org.opencontainers.image.version=1.5.0-alpha.1 \
  --label org.opencontainers.image.revision="$RELEASE_COMMIT" \
  -t "mechanics:${RELEASE_COMMIT:0:12}" .
```

检查标签和镜像内版本：

```bash
docker image inspect "mechanics:${RELEASE_COMMIT:0:12}" --format '{{json .Config.Labels}}'
docker run --rm "mechanics:${RELEASE_COMMIT:0:12}" python -m unittest discover -s tests -p 'test_*.py'
```

## 5. 隔离候选验证

使用独立候选数据库、独立数据目录和仅本机端口。示意命令中的 Secret 由部署系统注入，不在交接文档中填写真实值：

```bash
docker run -d \
  --name "mechanics-candidate-${RELEASE_COMMIT:0:12}" \
  --restart unless-stopped \
  -p 127.0.0.1:8768:8765 \
  --env-file /root/mechanics-v15-candidate.env \
  -v /opt/mechanics-v15-candidate-data:/app/data \
  "mechanics:${RELEASE_COMMIT:0:12}"
```

候选环境文件权限必须是 `0600`，并指向隔离数据库。确认端口没有绑定 `0.0.0.0:8768`。

只读烟雾测试：

```bash
python3 - <<'PY'
import json
from urllib.request import urlopen

base = "http://127.0.0.1:8768"
version = json.load(urlopen(base + "/api/version", timeout=10))
assert version["application"] == "computational-mechanics-solver", version
assert version["version"] == "1.5.0-alpha.1", version
assert version["schema_static"] == "cms-static-project@1", version
assert version["schema_dynamics"] == "cms-dynamics-project@2", version
html = urlopen(base + "/", timeout=10).read().decode("utf-8")
assert "v1.5.0-alpha.1" in html
print(json.dumps(version, ensure_ascii=False, indent=2))
PY
```

随后在候选域名/HTTPS 入口完成注册、登录、CSRF、刷新持久化、Free/Tester 权益、撤销、工程保存打开、三个 v1.5 示例和三视口浏览器验收。候选日志不得出现迁移失败、500、认证密钥警告或前端控制台错误。

## 6. 正式切换前检查

只有用户明确批准后才可执行：

1. 记录当前生产提交、镜像 ID、容器 inspect、环境变量名称（不输出值）、网络、端口、卷和重启策略。
2. 对生产数据库和数据目录做可恢复备份，并实际验证备份可读取。
3. 保留旧镜像和旧容器配置；准备不依赖网络下载的回滚命令。
4. 选择维护窗口，停止写入或进入维护模式，避免切换期间出现双写。
5. 用与候选一致的生产 Secret、数据库、持久卷和 HTTPS 配置启动新容器。
6. 先在本机检查 `/api/version`、首页、登录和一个求解，再切换反向代理/端口。
7. 切换后观察错误率、登录、数据库连接、迁移、报告与求解日志；未达到门禁立即回滚。

## 7. 回滚

应用回滚：

1. 停止新容器，但不要立即删除。
2. 恢复切换前保留的旧容器/镜像、端口、网络、卷和环境配置。
3. 恢复反向代理到旧容器，验证旧版本 `/api/version` 和关键路径。
4. 保存新容器日志、inspect 和数据库迁移记录供复盘。

数据回滚：

- 当前迁移以新增认证/权益表为主，旧版本通常会忽略新表；仍不得假设所有未来迁移都可向后兼容。
- 如果 v1.5 运行期间发生了需要撤销的业务写入，应在维护窗口根据审核记录决定保留、导出或从切换前备份恢复。
- 只有确认需要恢复数据库时才执行恢复；不得在应用回滚时自动覆盖生产库。

## 8. 清理与审计

- 稳定观察期结束后再删除候选容器、临时 worktree 和隔离数据库。
- Secret 文件和备份保持最小权限，并按组织保留策略处理。
- 在发布记录中保存：完整提交号、镜像摘要、迁移版本、测试结果、审批人、切换/回滚时间和未解决问题。
- 不使用 `--force` 推送，不移动既有 v1.3.2 标签；只有另行批准后才创建 v1.5 标签。

## 9. 当前状态声明

截至 2026-07-12，本交接仅在本地完成并用于 GitHub 草稿 PR。阿里云服务器和公网容器未连接、未更新、未重启、未替换；不存在由本任务造成的线上状态变化。
