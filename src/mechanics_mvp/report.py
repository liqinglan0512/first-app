"""Calculation report generation."""

from __future__ import annotations

import json
import base64
import binascii
from datetime import datetime, timezone
from typing import Any

from .models import AnalysisResult, Project


def build_report_text(project: Project, result: AnalysisResult, *, options: list[str] | None = None) -> str:
    lines = [
        "Mechanics MVP Calculation Report",
        f"Generated UTC: {datetime.now(timezone.utc).isoformat(timespec='seconds')}",
        f"Project: {project.metadata.get('name', 'untitled')}",
        f"Selected options: {', '.join(options or []) or project.metadata.get('report_options', 'default')}",
        "",
        "Model",
        f"- Nodes: {len(project.nodes)}",
        f"- Elements: {len(project.elements)}",
        f"- Nodal loads: {len(project.nodal_loads)}",
        f"- Element loads: {len(project.element_loads)}",
        "",
        "Summary",
        json.dumps(result.summary, indent=2, sort_keys=True),
        "",
        "Displacements",
    ]
    for node_id, values in result.displacements.items():
        lines.append(
            f"- {node_id}: ux={values['ux']:.6e} m, uy={values['uy']:.6e} m, rz={values['rz']:.6e} rad"
        )

    lines.append("")
    lines.append("Reactions")
    for node_id, values in result.reactions.items():
        fx = values.get("fx", 0.0)
        fy = values.get("fy", 0.0)
        mz = values.get("mz", 0.0)
        lines.append(f"- {node_id}: fx={fx:.6e} N, fy={fy:.6e} N, mz={mz:.6e} N*m")

    lines.append("")
    lines.append("Element End Forces")
    for element_id, values in result.element_end_forces.items():
        lines.append(
            f"- {element_id}: Ni={values['n_i']:.6e}, Vi={values['v_i']:.6e}, "
            f"Mi={values['m_i']:.6e}, Nj={values['n_j']:.6e}, Vj={values['v_j']:.6e}, "
            f"Mj={values['m_j']:.6e}"
        )

    lines.append("")
    lines.append("Dangerous Sections")
    for item in result.summary.get("dangerous_sections", []):
        lines.append(
            f"- {item['element']} x={item['x']:.4f} m, ratio={item['ratio']:.3f}, "
            f"M={item['moment']:.6e} N*m"
        )
    return "\n".join(lines) + "\n"


def build_report_pdf(
    project: Project,
    result: AnalysisResult,
    *,
    images: dict[str, Any] | None = None,
    options: list[str] | None = None,
) -> bytes:
    text = build_report_text(project, result, options=options)
    source_lines = text.splitlines()
    pages = [source_lines[index : index + 48] for index in range(0, len(source_lines), 48)] or [[]]

    objects: dict[int, bytes] = {
        1: b"<< /Type /Catalog /Pages 2 0 R >>",
        3: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    }
    page_ids: list[int] = []
    for index, page_lines in enumerate(pages):
        page_id = 4 + index * 2
        content_id = page_id + 1
        page_ids.append(page_id)
        content = _page_content(page_lines)
        objects[content_id] = b"<< /Length " + str(len(content)).encode("ascii") + b" >>\nstream\n" + content + b"\nendstream"
        objects[page_id] = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 3 0 R >> >> /Contents {content_id} 0 R >>"
        ).encode("ascii")
    next_object_id = max(objects) + 1
    for image_index, (title, data) in enumerate(_report_images(images), start=1):
        width, height = _jpeg_size(data)
        image_name = f"Im{image_index}"
        image_id = next_object_id
        content_id = next_object_id + 1
        page_id = next_object_id + 2
        next_object_id += 3
        image_object = (
            f"<< /Type /XObject /Subtype /Image /Width {width} /Height {height} "
            f"/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {len(data)} >>\n"
        ).encode("ascii")
        objects[image_id] = image_object + b"stream\n" + data + b"\nendstream"
        content = _image_page_content(title, image_name, width, height)
        objects[content_id] = b"<< /Length " + str(len(content)).encode("ascii") + b" >>\nstream\n" + content + b"\nendstream"
        objects[page_id] = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 3 0 R >> /XObject << /{image_name} {image_id} 0 R >> >> "
            f"/Contents {content_id} 0 R >>"
        ).encode("ascii")
        page_ids.append(page_id)
    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects[2] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode("ascii")
    return _write_pdf(objects)


def _page_content(lines: list[str]) -> bytes:
    commands = ["BT", "/F1 9 Tf", "50 800 Td"]
    for index, line in enumerate(lines):
        if index > 0:
            commands.append("0 -14 Td")
        commands.append(f"({_escape_pdf_text(line[:110])}) Tj")
    commands.append("ET")
    return "\n".join(commands).encode("latin-1", errors="replace")


def _escape_pdf_text(text: str) -> str:
    ascii_text = text.encode("latin-1", errors="replace").decode("latin-1")
    return ascii_text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _report_images(images: dict[str, Any] | None) -> list[tuple[str, bytes]]:
    if not isinstance(images, dict):
        return []
    result: list[tuple[str, bytes]] = []
    for key, title in (("model", "Model View"), ("diagrams", "Selected Diagrams")):
        data_url = images.get(key)
        if not data_url:
            continue
        try:
            mime_type, data = _decode_data_url(str(data_url))
            if mime_type == "image/jpeg":
                _jpeg_size(data)
                result.append((title, data))
        except (ValueError, binascii.Error):
            continue
    return result


def _decode_data_url(data_url: str) -> tuple[str, bytes]:
    prefix, separator, payload = data_url.partition(",")
    if not separator or ";base64" not in prefix:
        raise ValueError("Unsupported image data URL")
    mime_type = prefix.removeprefix("data:").split(";")[0].lower()
    return mime_type, base64.b64decode(payload, validate=True)


def _jpeg_size(data: bytes) -> tuple[int, int]:
    if len(data) < 4 or data[0:2] != b"\xff\xd8":
        raise ValueError("Not a JPEG image")
    index = 2
    while index < len(data) - 9:
        if data[index] != 0xFF:
            index += 1
            continue
        marker = data[index + 1]
        index += 2
        if marker in {0xD8, 0xD9} or marker == 0x01 or 0xD0 <= marker <= 0xD7:
            continue
        if index + 2 > len(data):
            break
        segment_length = int.from_bytes(data[index : index + 2], "big")
        if marker in {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}:
            if index + 7 > len(data):
                break
            height = int.from_bytes(data[index + 3 : index + 5], "big")
            width = int.from_bytes(data[index + 5 : index + 7], "big")
            if width <= 0 or height <= 0:
                raise ValueError("Invalid JPEG dimensions")
            return width, height
        index += segment_length
    raise ValueError("JPEG dimensions not found")


def _image_page_content(title: str, image_name: str, width: int, height: int) -> bytes:
    max_width = 495.0
    max_height = 660.0
    scale = min(max_width / width, max_height / height)
    draw_width = width * scale
    draw_height = height * scale
    x = (595.0 - draw_width) / 2.0
    y = 78.0 + (max_height - draw_height) / 2.0
    commands = [
        "BT",
        "/F1 14 Tf",
        "50 800 Td",
        f"({_escape_pdf_text(title)}) Tj",
        "ET",
        "q",
        f"{draw_width:.3f} 0 0 {draw_height:.3f} {x:.3f} {y:.3f} cm",
        f"/{image_name} Do",
        "Q",
    ]
    return "\n".join(commands).encode("latin-1", errors="replace")


def _write_pdf(objects: dict[int, bytes]) -> bytes:
    chunks = [b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"]
    offsets: dict[int, int] = {}
    for object_id in sorted(objects):
        offsets[object_id] = sum(len(chunk) for chunk in chunks)
        chunks.append(f"{object_id} 0 obj\n".encode("ascii"))
        chunks.append(objects[object_id])
        chunks.append(b"\nendobj\n")

    xref_offset = sum(len(chunk) for chunk in chunks)
    max_object_id = max(objects)
    chunks.append(f"xref\n0 {max_object_id + 1}\n".encode("ascii"))
    chunks.append(b"0000000000 65535 f \n")
    for object_id in range(1, max_object_id + 1):
        offset = offsets.get(object_id, 0)
        chunks.append(f"{offset:010d} 00000 n \n".encode("ascii"))
    chunks.append(
        f"trailer\n<< /Size {max_object_id + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode("ascii")
    )
    return b"".join(chunks)
