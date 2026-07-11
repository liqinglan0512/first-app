# Computational Mechanics Solver v1.3.2 部署交接

> 本文件只提供人工操作步骤。本次本地任务没有推送 GitHub、连接或更新阿里云，也没有执行候选或正式部署。

## 1. 固定发布信息

- 当前分支：`work/v1.3.2-manual-homepage`
- GitHub：`https://github.com/liqinglan0512/first-app.git`
- 源码审计基线：`87b683d11bf028ca2db419ca607e5f915f15288f`
- 大目标一提交：`38c6292532bebe2c2f97da646fb688ff9fb946b4`
- 大目标二产品提交：`0083040e7a3db1b5a1e06bba68a04bebd2f5d98e`
- 候选镜像版本：`1.3.2`
- 候选镜像名：`mechanics:0083040`
- 候选容器名：`mechanics-candidate-0083040`
- 建议内网候选端口：`127.0.0.1:8768`
- 正式容器：`mechanics`
- 正式地址：`http://8.130.33.10:8765`
- 服务器仓库：`/opt/projects/first-app`
- 独立构建 worktree：`/opt/projects/first-app-0083040`
- PDF 下载 URL：`/downloads/computational-mechanics-solver-v1.3.2-manual.pdf`
- PDF SHA256：`ac34853723db4844554c9167f062b83482e23146c63455337160f738b0f04cf5`

部署候选必须从产品提交 `0083040e7a3db1b5a1e06bba68a04bebd2f5d98e` 构建。后续仅包含交接文档的提交不改变产品构建内容。

## 2. 本地最终检查与人工推送

在 Windows PowerShell 中逐行执行：

```powershell
cd "C:\Users\lijiahao\Desktop\软件开发"
git branch --show-current
git status --short
git log -3 --oneline
python -m unittest discover -s tests
node --check web\units.js
node --check web\project-schema.js
node --check web\project-adapter.js
node --check web\dynamics-field-geometry.js
node --check web\dynamics-field-placement.js
node --check web\dynamics-core.js
node --check web\dynamics-report.js
node --check web\app.js
node tests\avatar_layout.test.js
node tests\dynamics_core.test.js
node tests\dynamics_field_placement.test.js
node tests\dynamics_report.test.js
node tests\imported_text_safety.test.js
node tests\project_adapter.test.js
node tests\project_schema.test.js
node tests\release_ui.test.js
node tests\units_frontend.test.js
git diff --check
git status --short
git push -u origin work/v1.3.2-manual-homepage
git ls-remote origin refs/heads/work/v1.3.2-manual-homepage
```

验收要求：

- 推送前 `git status --short` 无输出；
- 分支历史包含 `38c6292`、`0083040` 和本交接文档提交；
- Python 测试全部通过；
- 远端分支包含产品提交 `0083040`；
- 不使用 `--force`，不移动既有 `v1.3.2-beta.1` 或 `v1.3.2-beta.2` 标签。

## 3. 服务器只读预检

人工连接服务器：

```powershell
ssh root@8.130.33.10
```

在服务器中逐行执行：

```bash
cd /opt/projects/first-app
git status --short
git branch --show-current
git log -6 --oneline --decorate
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
ss -ltnp
docker inspect mechanics > /root/mechanics-before-0083040.inspect.json
chmod 600 /root/mechanics-before-0083040.inspect.json
```

此时不得停止、重命名或删除 `mechanics`，不得修改公网 `8765`。如正式容器不存在或公网服务异常，先停止发布流程并排查。

## 4. 获取固定提交并建立独立 worktree

```bash
cd /opt/projects/first-app
git fetch origin --prune
git cat-file -e 0083040e7a3db1b5a1e06bba68a04bebd2f5d98e^{commit}
git show --no-patch --oneline 0083040e7a3db1b5a1e06bba68a04bebd2f5d98e
test ! -e /opt/projects/first-app-0083040
git worktree add --detach /opt/projects/first-app-0083040 0083040e7a3db1b5a1e06bba68a04bebd2f5d98e
cd /opt/projects/first-app-0083040
test -z "$(git status --porcelain)"
test "$(git rev-parse HEAD)" = "0083040e7a3db1b5a1e06bba68a04bebd2f5d98e"
```

任一 `test` 失败都必须停止，不得改用变化中的服务器工作区构建。

## 5. 构建可追踪镜像

```bash
cd /opt/projects/first-app-0083040
docker build --build-arg APPLICATION_VERSION=1.3.2 --build-arg GIT_COMMIT=0083040e7a3db1b5a1e06bba68a04bebd2f5d98e --build-arg GIT_DIRTY=false --label org.opencontainers.image.version=1.3.2 --label org.opencontainers.image.revision=0083040e7a3db1b5a1e06bba68a04bebd2f5d98e -t mechanics:0083040 .
docker image inspect mechanics:0083040 --format '{{.Id}} {{index .Config.Labels "org.opencontainers.image.revision"}} {{index .Config.Labels "org.opencontainers.image.version"}}'
docker run --rm mechanics:0083040 python -m unittest discover -s tests
```

镜像检查必须显示完整提交号和版本 `1.3.2`，容器内 Python 测试必须全部通过。

## 6. 启动仅限本机访问的候选容器

先确认名称和端口空闲：

```bash
test -z "$(docker ps -aq --filter name=^/mechanics-candidate-0083040$)"
python3 - <<'PY'
import socket

with socket.socket() as sock:
    sock.bind(("127.0.0.1", 8768))
print("127.0.0.1:8768 is available")
PY
```

然后启动候选：

```bash
docker run -d --name mechanics-candidate-0083040 --restart unless-stopped -p 127.0.0.1:8768:8765 mechanics:0083040
docker ps --filter name=mechanics-candidate-0083040 --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
docker inspect mechanics-candidate-0083040 --format '{{json .HostConfig.PortBindings}}'
docker logs --tail 100 mechanics-candidate-0083040
```

端口绑定必须只出现 `127.0.0.1:8768`，不能出现 `0.0.0.0:8768`。

## 7. 候选网站烟雾测试

### 7.1 版本与首页

```bash
python3 - <<'PY'
import json
from urllib.request import urlopen

base = "http://127.0.0.1:8768"
payload = json.load(urlopen(base + "/api/version", timeout=10))
assert payload["application"] == "computational-mechanics-solver", payload
assert payload["version"] == "1.3.2", payload
assert payload["git_commit"] == "0083040e7a3db1b5a1e06bba68a04bebd2f5d98e", payload
assert payload["git_dirty"] is False, payload
assert payload["schema_static"] == "cms-static-project@1", payload
assert payload["schema_dynamics"] == "cms-dynamics-project@1", payload
print(json.dumps(payload, ensure_ascii=False, indent=2))

html = urlopen(base + "/", timeout=10).read().decode("utf-8")
assert "Computational Mechanics Solver" in html
assert 'id="releaseVersion"' in html
assert ">v1.3.2<" in html
assert html.count("/downloads/computational-mechanics-solver-v1.3.2-manual.pdf") >= 3
print("Homepage smoke test passed.")
PY
```

### 7.2 PDF 下载

```bash
python3 - <<'PY'
import hashlib
from urllib.request import urlopen

url = "http://127.0.0.1:8768/downloads/computational-mechanics-solver-v1.3.2-manual.pdf"
with urlopen(url, timeout=30) as response:
    body = response.read()
    assert response.status == 200
    assert response.headers.get_content_type() == "application/pdf"
    assert response.headers["Content-Disposition"] == 'attachment; filename="computational-mechanics-solver-v1.3.2-manual.pdf"'
digest = hashlib.sha256(body).hexdigest()
assert body.startswith(b"%PDF-")
assert len(body) == 8581850, len(body)
assert digest == "ac34853723db4844554c9167f062b83482e23146c63455337160f738b0f04cf5", digest
print(len(body), digest)
PY
```

### 7.3 正式服务仍在线

```bash
python3 - <<'PY'
from urllib.request import urlopen

with urlopen("http://127.0.0.1:8765/", timeout=10) as response:
    body = response.read(1000).decode("utf-8", errors="replace")
    assert response.status == 200
    assert "Computational Mechanics Solver" in body
    print("Production remains online:", response.status)
PY
```

完成候选验证后仍然不要修改正式容器。

## 8. 正式切换前检查

以下步骤必须由用户明确决定后人工执行。先确认正式容器结构仍符合当前单容器部署：

```bash
docker inspect mechanics --format 'restart={{.HostConfig.RestartPolicy.Name}} network={{.HostConfig.NetworkMode}} mounts={{len .Mounts}} image={{.Config.Image}}'
docker ps --filter name=^/mechanics$ --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
docker ps --filter name=^/mechanics-candidate-0083040$ --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
test -z "$(docker ps -aq --filter name=^/mechanics-rollback-before-0083040$)"
```

预期正式容器使用默认网络、无挂载且 restart policy 为 `unless-stopped`。如果 `mounts` 不为 `0`、网络不是默认 `bridge`，或存在额外业务环境变量，必须先根据 `/root/mechanics-before-0083040.inspect.json` 补齐对应参数，不得直接执行下一节。

建议再次运行第 7 节全部烟雾测试，并确认候选日志无异常。

## 9. 人工正式切换命令

只有第 8 节预期完全满足时，才逐行执行：

```bash
docker stop mechanics
docker rename mechanics mechanics-rollback-before-0083040
docker update --restart=no mechanics-rollback-before-0083040
docker run -d --name mechanics --restart unless-stopped -p 0.0.0.0:8765:8765 mechanics:0083040
docker ps --filter name=^/mechanics$ --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
```

立即核验公网版本、首页和 PDF：

```bash
python3 - <<'PY'
import hashlib
import json
from urllib.request import urlopen

base = "http://127.0.0.1:8765"
payload = json.load(urlopen(base + "/api/version", timeout=10))
assert payload["version"] == "1.3.2", payload
assert payload["git_commit"] == "0083040e7a3db1b5a1e06bba68a04bebd2f5d98e", payload
assert payload["git_dirty"] is False, payload
assert "Computational Mechanics Solver" in urlopen(base + "/", timeout=10).read().decode("utf-8")
manual = urlopen(base + "/downloads/computational-mechanics-solver-v1.3.2-manual.pdf", timeout=30).read()
assert hashlib.sha256(manual).hexdigest() == "ac34853723db4844554c9167f062b83482e23146c63455337160f738b0f04cf5"
print(json.dumps(payload, ensure_ascii=False, indent=2))
print("Production homepage and manual passed.")
PY
```

再从服务器外部浏览器访问 `http://8.130.33.10:8765`，人工检查登录页、静力学、动力学、公告、两处说明书入口和 PDF 下载。

## 10. 人工回滚命令

如新正式容器启动失败、API 身份不符、首页异常或 PDF 下载失败，立即逐行执行：

```bash
docker rm -f mechanics
docker rename mechanics-rollback-before-0083040 mechanics
docker update --restart=unless-stopped mechanics
docker start mechanics
docker ps --filter name=^/mechanics$ --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
```

然后确认旧服务恢复：

```bash
python3 - <<'PY'
from urllib.request import urlopen

with urlopen("http://127.0.0.1:8765/", timeout=10) as response:
    body = response.read(1000).decode("utf-8", errors="replace")
    assert response.status == 200
    assert "Computational Mechanics Solver" in body
    print("Rollback service online:", response.status)
PY
```

回滚后保留新镜像和候选容器用于排查，不要立即删除证据。

## 11. 切换稳定后的可选清理

至少观察一个发布窗口并确认无需回滚后，才考虑清理旧容器和 worktree：

```bash
docker rm mechanics-rollback-before-0083040
docker rm -f mechanics-candidate-0083040
cd /opt/projects/first-app
git worktree remove /opt/projects/first-app-0083040
```

清理前再次确认容器名称和绝对路径，且保留 `/root/mechanics-before-0083040.inspect.json` 至发布审计结束。
