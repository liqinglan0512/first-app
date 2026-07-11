"""Build reproducible v1.3.2 release metadata from Git, API, and artifacts."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path
from urllib.request import urlopen


def git_value(repository: Path, *arguments: str) -> str:
    completed = subprocess.run(
        ["git", *arguments],
        cwd=repository,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return completed.stdout.strip()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_version_payload(api_url: str) -> dict[str, object]:
    with urlopen(api_url, timeout=15) as response:  # noqa: S310 - explicit local API URL supplied by operator.
        if response.status != 200:
            raise RuntimeError(f"Version API returned HTTP {response.status}.")
        payload = json.loads(response.read().decode("utf-8"))
    required = {
        "application",
        "version",
        "git_commit",
        "git_dirty",
        "started_at",
        "python_version",
        "schema_static",
        "schema_dynamics",
    }
    missing = sorted(required - payload.keys())
    if missing:
        raise RuntimeError(f"Version API is missing fields: {', '.join(missing)}")
    if payload["git_dirty"] is not False:
        raise RuntimeError("Version API reports git_dirty=true; refusing to freeze release metadata.")
    return payload


def update_checksum_file(path: Path, filename: str, digest: str) -> None:
    existing = path.read_text(encoding="ascii").splitlines() if path.is_file() else []
    kept = [line for line in existing if not line.rstrip().endswith(f"  {filename}")]
    kept.append(f"{digest}  {filename}")
    path.write_text("\n".join(kept) + "\n", encoding="ascii")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repository", type=Path, default=Path.cwd())
    parser.add_argument("--snapshot", required=True)
    parser.add_argument("--api-url", required=True)
    parser.add_argument("--source-zip", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--baseline-deployed", action="store_true")
    arguments = parser.parse_args()

    repository = arguments.repository.resolve()
    source_zip = arguments.source_zip.resolve()
    output_dir = arguments.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    if not source_zip.is_file():
        raise FileNotFoundError(source_zip)

    full_commit = git_value(repository, "rev-parse", arguments.snapshot)
    short_commit = git_value(repository, "rev-parse", "--short", full_commit)
    commit_date = git_value(repository, "show", "-s", "--format=%cI", full_commit)
    payload = load_version_payload(arguments.api_url)
    if str(payload["git_commit"]) not in {short_commit, full_commit}:
        raise RuntimeError(
            f"Version API commit {payload['git_commit']!r} does not match snapshot {short_commit!r}."
        )
    source_digest = sha256(source_zip)
    baseline_status = "是（线上 API 已验证为同一源码基线构建）" if arguments.baseline_deployed else "否"

    lines = [
        "产品名称：Computational Mechanics Solver",
        "文档显示版本：v1.3.2",
        f"运行时版本：{payload['version']}",
        f"Git 完整提交号：{full_commit}",
        f"Git 短提交号：{short_commit}",
        f"Git 提交日期：{commit_date}",
        "文档发布日期：2026-07",
        "开发者：Leo Li⁺ Studio",
        "运行方式：Web",
        f"本地地址：{arguments.api_url.removesuffix('/api/version')}",
        "当前线上地址：http://8.130.33.10:8765",
        f"本源码基线是否已经部署到线上：{baseline_status}",
        "本工作分支报告、说明书和主页改动是否已经部署到线上：否",
        "推荐浏览器：Chrome、Edge",
        f"静力学 Schema：{payload['schema_static']}",
        f"动力学 Schema：{payload['schema_dynamics']}",
        f"Python 版本：{payload['python_version']}",
        f"源码 ZIP：{source_zip.name}",
        f"源码 ZIP SHA256：{source_digest}",
        "",
        "说明：v1.3.2 为产品发布名称，1.3.2-beta.x 为具体构建标识。",
        "",
        "--- /api/version 原始响应 ---",
        json.dumps(payload, ensure_ascii=False, indent=2),
        "",
    ]
    (output_dir / "version.txt").write_text("\n".join(lines), encoding="utf-8")
    update_checksum_file(output_dir / "checksums.sha256.txt", source_zip.name, source_digest)
    print(json.dumps({"version_file": str(output_dir / "version.txt"), "sha256": source_digest}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
