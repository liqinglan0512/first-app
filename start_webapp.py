from __future__ import annotations

import argparse
import json
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main() -> int:
    parser = argparse.ArgumentParser(description="Start the mechanics MVP web app in the background.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=18765)
    args = parser.parse_args()

    port = first_available_port(args.host, args.port)
    stdout = (ROOT / ".webapp.out.log").open("ab")
    stderr = (ROOT / ".webapp.err.log").open("ab")
    creationflags = 0
    if os.name == "nt":
        creationflags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    command = [
        sys.executable,
        str(ROOT / "run_webapp.py"),
        "--host",
        args.host,
        "--port",
        str(port),
    ]
    process = subprocess.Popen(
        command,
        cwd=ROOT,
        stdout=stdout,
        stderr=stderr,
        stdin=subprocess.DEVNULL,
        creationflags=creationflags,
        env=clean_environment(),
    )

    url = f"http://{args.host}:{port}/"
    wait_for_http(url)
    (ROOT / ".webapp.pid").write_text(str(process.pid), encoding="utf-8")
    print(json.dumps({"url": url, "pid": process.pid}, ensure_ascii=False))
    return 0


def first_available_port(host: str, preferred: int) -> int:
    for port in range(preferred, preferred + 100):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind((host, port))
            except OSError:
                continue
            return port
    raise RuntimeError(f"No available port found from {preferred} to {preferred + 99}.")


def clean_environment() -> dict[str, str]:
    env: dict[str, str] = {}
    seen: set[str] = set()
    for key, value in os.environ.items():
        normalized = key.upper()
        if normalized in seen or normalized == "PYTHONPATH":
            continue
        seen.add(normalized)
        env[key] = value
    env["PYTHONIOENCODING"] = "utf-8"
    return env


def wait_for_http(url: str) -> None:
    last_error: Exception | None = None
    for _ in range(30):
        try:
            with urllib.request.urlopen(url, timeout=1.0) as response:
                if response.status == 200:
                    return
        except (OSError, urllib.error.URLError) as exc:
            last_error = exc
            time.sleep(0.2)
    raise RuntimeError(f"Web app did not become ready: {last_error}")


if __name__ == "__main__":
    raise SystemExit(main())
