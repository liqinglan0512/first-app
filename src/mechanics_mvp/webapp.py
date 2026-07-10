"""Small HTTP app for the drawing UI."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from .engine import solve_with_backend
from .project_io import project_from_dict
from .report import build_report_pdf, build_text_report_pdf


WEB_ROOT = Path(__file__).resolve().parents[2] / "web"


def solve_project_payload(raw: dict[str, Any]) -> dict[str, Any]:
    project = project_from_dict(raw)
    result = solve_with_backend(project, _solver_backend(raw))
    return {
        "displacements": result.displacements,
        "reactions": result.reactions,
        "element_end_forces": result.element_end_forces,
        "element_diagrams": result.element_diagrams,
        "summary": result.summary,
    }


def report_project_payload(raw: dict[str, Any]) -> bytes:
    project = project_from_dict(raw)
    result = solve_with_backend(project, _solver_backend(raw))
    images = raw.get("report_images", {})
    options = raw.get("report_options", [])
    if isinstance(options, str):
        options = [item for item in options.split(",") if item]
    if not isinstance(options, list):
        options = []
    return build_report_pdf(project, result, images=images, options=options)


def dynamics_report_payload(raw: dict[str, Any]) -> bytes:
    text = str(raw.get("report_text", "")).strip()
    if not text:
        raise ValueError("Dynamics report text is empty.")
    if len(text) > 200_000:
        raise ValueError("Dynamics report text is too large.")
    return build_text_report_pdf(text, images=raw.get("report_images", {}), title="动力学计算书")


def _solver_backend(raw: dict[str, Any]) -> str:
    metadata = raw.get("metadata", {})
    return str(raw.get("solver") or metadata.get("solver") or "frame2d")


class MechanicsWebHandler(BaseHTTPRequestHandler):
    server_version = "MechanicsMVP/0.2"

    def do_GET(self) -> None:
        if self.path in ("", "/"):
            self._serve_static("index.html")
            return

        if self.path.startswith("/static/"):
            self._serve_static(self.path.removeprefix("/static/"))
            return

        self.send_error(404, "Not found")

    def do_POST(self) -> None:
        if self.path not in {"/api/solve", "/api/report", "/api/dynamics-report"}:
            self.send_error(404, "Not found")
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(length)
            payload = json.loads(raw_body.decode("utf-8"))
            if self.path == "/api/dynamics-report":
                self._send_bytes(
                    dynamics_report_payload(payload),
                    content_type="application/pdf",
                    headers={"Content-Disposition": 'attachment; filename="dynamics-report.pdf"'},
                )
                return
            if self.path == "/api/report":
                self._send_bytes(
                    report_project_payload(payload),
                    content_type="application/pdf",
                    headers={"Content-Disposition": 'attachment; filename="mechanics-report.pdf"'},
                )
                return
            response = solve_project_payload(payload)
        except Exception as exc:  # noqa: BLE001 - user-facing API boundary.
            self._send_json({"error": str(exc)}, status=422)
            return

        self._send_json(response)

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _serve_static(self, relative_path: str) -> None:
        web_root = WEB_ROOT.resolve()
        target = (WEB_ROOT / relative_path).resolve()
        if not target.is_relative_to(web_root) or not target.is_file():
            self.send_error(404, "Not found")
            return

        content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_json(self, payload: dict[str, Any], *, status: int = 200) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self._send_bytes(data, content_type="application/json; charset=utf-8", status=status)

    def _send_bytes(
        self,
        data: bytes,
        *,
        content_type: str,
        status: int = 200,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(data)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the mechanics MVP drawing app.")
    parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8765")))
    args = parser.parse_args(argv)

    server = ThreadingHTTPServer((args.host, args.port), MechanicsWebHandler)
    print(f"Mechanics MVP web app: http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
