"""Human-readable Chinese calculation report generation."""

from __future__ import annotations

import base64
import binascii
import math
import re
import textwrap
from datetime import datetime
from typing import Any, Iterable

from .models import AnalysisResult, Project


OPTION_LABELS = {
    "determinacy": "静定/超静定分析",
    "system": "体系判断",
    "internal": "各内力求解",
    "moment": "弯矩图",
    "shear": "剪力图",
    "axial": "轴力图",
    "displacement": "位移与转角",
    "reaction": "支座反力",
    "danger": "危险截面",
    "flexibility": "柔度",
    "stress": "组合正应力估算",
    "strain": "应变",
    "stress_strain": "应力-应变图",
}

DIAGNOSTIC_MESSAGES = {
    "duplicate_node_id": "存在重复节点编号。",
    "missing_node_i": "存在杆件引用了缺失的起点节点。",
    "missing_node_j": "存在杆件引用了缺失的终点节点。",
    "zero_length_element": "存在零长度杆件。",
    "disconnected_structure": "模型存在多个不连通部分。",
    "isolated_node": "存在未连接到任何杆件的孤立节点。",
    "no_free_dof": "模型没有可求解的自由自由度。",
    "likely_mechanism": "静定指数为负，模型可能为机构或约束不足。",
    "roughly_determinate": "静定指数为 0，拓扑估算可能为静定结构。",
    "roughly_indeterminate": "静定指数为正，拓扑估算可能为超静定结构。",
}


def build_report_text(project: Project, result: AnalysisResult, *, options: list[str] | None = None) -> str:
    """Build a concise engineering report without exposing raw JSON."""

    selected = [item for item in (options or []) if item in OPTION_LABELS]
    enabled = lambda name: not selected or name in selected
    scope = "选中隔离体" if project.metadata.get("report_scope") == "selection" else "整体模型"
    project_name = project.metadata.get("name", "未命名工程")
    if project_name == "canvas_project":
        project_name = "当前画布工程"
    labels = "、".join(OPTION_LABELS[item] for item in selected) or "完整结构分析"
    lines = [
        "计算力学求解计算书",
        f"生成时间：{datetime.now().astimezone().strftime('%Y-%m-%d %H:%M:%S %z')}",
        f"工程名称：{project_name}",
        "",
        "求解结果",
        f"求解范围：{scope}",
        f"求解内容：{labels}",
        f"体系判断：{_system_judgement(project)}",
        "",
        "模型概况",
        f"- 节点数：{len(project.nodes)}",
        f"- 杆件数：{len(project.elements)}",
        f"- 节点荷载数：{len(project.nodal_loads)}",
        f"- 杆件荷载数：{len(project.element_loads)}",
        "",
    ]

    _append_diagnostics(lines, result.summary.get("diagnostics"))

    if enabled("displacement"):
        lines.append("节点位移与转角")
        for node_id, values in _sorted_items(result.displacements):
            lines.append(
                f"- {node_id}: ux={_fmt(values.get('ux', 0.0) * 1000)} mm，"
                f"uy={_fmt(values.get('uy', 0.0) * 1000)} mm，"
                f"θ={_fmt(values.get('rz', 0.0))} rad"
            )
        lines.append("")

    if enabled("reaction"):
        lines.append("支座反力")
        reactions = _sorted_items(result.reactions)
        if not reactions:
            lines.append("- 未形成支座反力。")
        for node_id, values in reactions:
            lines.append(
                f"- {node_id}: Fx={_fmt(values.get('fx', 0.0) / 1000)} kN，"
                f"Fy={_fmt(values.get('fy', 0.0) / 1000)} kN，"
                f"Mz={_fmt(values.get('mz', 0.0) / 1000)} kN·m"
            )
        lines.append("")

    if enabled("internal"):
        lines.append("杆端内力")
        for element_id, values in _sorted_items(result.element_end_forces):
            lines.append(
                f"- {element_id}: Ni={_fmt(values.get('n_i', 0.0) / 1000)} kN，"
                f"Vi={_fmt(values.get('v_i', 0.0) / 1000)} kN，"
                f"Mi={_fmt(values.get('m_i', 0.0) / 1000)} kN·m；"
                f"Nj={_fmt(values.get('n_j', 0.0) / 1000)} kN，"
                f"Vj={_fmt(values.get('v_j', 0.0) / 1000)} kN，"
                f"Mj={_fmt(values.get('m_j', 0.0) / 1000)} kN·m"
            )
        lines.append("")

    extrema_specs = []
    if enabled("shear"):
        extrema_specs.append(("剪力 V", "v", 1 / 1000, "kN"))
    if enabled("moment"):
        extrema_specs.append(("弯矩 M", "m", 1 / 1000, "kN·m"))
    if enabled("axial"):
        extrema_specs.append(("轴力 N", "n", 1 / 1000, "kN"))
    if extrema_specs:
        lines.append("内力图极值")
        for label, component, scale, unit in extrema_specs:
            extrema = _diagram_extrema(result, component, scale)
            if extrema is None:
                lines.append(f"- {label}: 暂无可用数据。")
                continue
            maximum, minimum = extrema
            lines.append(
                f"- {label}: 最大 {_fmt(maximum['value'])} {unit}（{maximum['element']}, x={_fmt(maximum['x'])} m），"
                f"最小 {_fmt(minimum['value'])} {unit}（{minimum['element']}, x={_fmt(minimum['x'])} m）"
            )
        lines.append("")

    if enabled("stress") or enabled("strain") or enabled("stress_strain"):
        _append_stress_strain(lines, project, result, enabled)

    if enabled("danger"):
        dangerous = result.summary.get("dangerous_sections", [])
        lines.append("危险截面")
        if not dangerous:
            lines.append("- 未识别到可报告的危险截面。")
        for item in dangerous[:3]:
            lines.append(
                f"- {item.get('element', '?')}: x={_fmt(item.get('x', 0.0))} m，"
                f"|M|={_fmt(abs(float(item.get('moment', 0.0))) / 1000)} kN·m"
            )
        lines.append("")

    if enabled("flexibility"):
        flexibility = result.summary.get("load_point_flexibility", [])
        lines.append("柔度")
        if not flexibility:
            lines.append("- 当前荷载点没有可计算的柔度结果。")
        for item in flexibility:
            unit = "rad/(N·m)" if item.get("kind") == "rotation" else "m/N"
            lines.append(
                f"- {item.get('node', '?')}: 荷载={_fmt(item.get('load', 0.0))}，"
                f"响应={_fmt(item.get('displacement', 0.0))}，"
                f"柔度={_fmt(item.get('flexibility', 0.0))} {unit}"
            )
        lines.append("")

    lines.extend(
        [
            "计算推导过程",
            "1. 将界面输入统一换算到 SI 单位：力 N、长度 m、弹性模量 Pa、截面面积 m²、惯性矩 m⁴。",
            "2. 普通梁柱建立二维梁柱单元局部刚度矩阵；桁架杆只保留轴向刚度；端部铰接通过静力凝聚释放弯矩自由度。",
            "3. 用方向余弦构造坐标转换矩阵 T，并按 k=Tᵀk'T 转换到全局坐标系。",
            "4. 将集中荷载和分布荷载换算为等效节点荷载，组装总体方程 [K]{u}={P}。",
            "5. 按支座约束消去受限自由度，求得节点位移 ux、uy 和转角 θ。",
            "6. 由 {R}=[K]{u}-{P} 得到支座反力，由杆端位移反算 Ni、Vi、Mi、Nj、Vj、Mj，并沿杆长生成 N/V/M 数据。",
        ]
    )
    if enabled("stress") or enabled("strain") or enabled("stress_strain"):
        lines.append("7. 组合正应力按 σ=N/A+M·c/I 估算，应变按 ε=σ/E 计算；当前 c 采用等效截面值 sqrt(A)/2。")
    return "\n".join(lines).rstrip() + "\n"


def build_report_pdf(
    project: Project,
    result: AnalysisResult,
    *,
    images: dict[str, Any] | None = None,
    options: list[str] | None = None,
) -> bytes:
    return build_text_report_pdf(build_report_text(project, result, options=options), images=images)


def build_text_report_pdf(
    text: str,
    *,
    images: dict[str, Any] | None = None,
    title: str = "计算力学求解计算书",
) -> bytes:
    """Build a Unicode Chinese PDF from already formatted report text."""

    source_lines = _wrap_report_lines(text.splitlines())
    pages = [source_lines[index : index + 46] for index in range(0, len(source_lines), 46)] or [[]]
    ascii_widths = " ".join(str(width) for width in _ascii_cid_widths())
    objects: dict[int, bytes] = {
        1: b"<< /Type /Catalog /Pages 2 0 R >>",
        3: b"<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [4 0 R] >>",
        4: (
            "<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light "
            "/CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 4 >> "
            f"/DW 1000 /W [1 [{ascii_widths}]] >>"
        ).encode("ascii"),
    }
    page_ids: list[int] = []
    for index, page_lines in enumerate(pages):
        page_id = 5 + index * 2
        content_id = page_id + 1
        page_ids.append(page_id)
        content = _page_content(page_lines)
        objects[content_id] = _stream_object(content)
        objects[page_id] = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 3 0 R >> >> /Contents {content_id} 0 R >>"
        ).encode("ascii")

    next_object_id = max(objects) + 1
    for image_index, (image_title, data) in enumerate(_report_images(images), start=1):
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
        content = _image_page_content(image_title or title, image_name, width, height)
        objects[content_id] = _stream_object(content)
        objects[page_id] = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 3 0 R >> /XObject << /{image_name} {image_id} 0 R >> >> "
            f"/Contents {content_id} 0 R >>"
        ).encode("ascii")
        page_ids.append(page_id)
    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects[2] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode("ascii")
    return _write_pdf(objects)


def _append_diagnostics(lines: list[str], diagnostics: Any) -> None:
    if not isinstance(diagnostics, dict):
        return
    lines.extend(
        [
            "模型诊断",
            f"- 节点数：{diagnostics.get('node_count', 0)}",
            f"- 单元数：{diagnostics.get('element_count', 0)}",
            f"- 约束自由度数：{diagnostics.get('restrained_dof_count', 0)}",
            f"- 自由自由度数：{diagnostics.get('free_dof_count', 0)}",
            f"- 静定指数：{diagnostics.get('determinacy_index', 0)}",
        ]
    )
    issues = diagnostics.get("issues", [])
    if not issues:
        lines.append("- 提示：未发现拓扑级诊断问题。")
    for issue in issues:
        if not isinstance(issue, dict):
            continue
        level = {"error": "错误", "warning": "警告", "info": "信息"}.get(issue.get("level"), "信息")
        message = DIAGNOSTIC_MESSAGES.get(str(issue.get("code")), str(issue.get("message", "未知诊断信息。")))
        lines.append(f"- [{level}] {message}")
    lines.append("")


def _append_stress_strain(
    lines: list[str],
    project: Project,
    result: AnalysisResult,
    enabled: Any,
) -> None:
    elements = {element.id: element for element in project.elements}
    sections = {section.id: section for section in project.sections}
    materials = {material.id: material for material in project.materials}
    rows: list[dict[str, float | str]] = []
    for element_id, diagram in result.element_diagrams.items():
        element = elements.get(element_id)
        if element is None:
            continue
        section = sections.get(element.section)
        material = materials.get(element.material)
        if section is None or material is None:
            continue
        c = math.sqrt(max(section.area, 1e-30)) / 2
        for row in diagram:
            stress = float(row.get("n", 0.0)) / max(section.area, 1e-30)
            stress += float(row.get("m", 0.0)) * c / max(section.inertia, 1e-30)
            rows.append(
                {
                    "element": element_id,
                    "x": float(row.get("x", 0.0)),
                    "stress": stress,
                    "strain": stress / max(material.elastic_modulus, 1e-30),
                }
            )
    lines.append("应力与应变")
    if not rows:
        lines.append("- 暂无可用数据。")
        lines.append("")
        return
    max_stress = max(rows, key=lambda item: abs(float(item["stress"])))
    max_strain = max(rows, key=lambda item: abs(float(item["strain"])))
    if enabled("stress") or enabled("stress_strain"):
        lines.append(
            f"- 最大组合正应力估算：{_fmt(float(max_stress['stress']) / 1e6)} MPa"
            f"（{max_stress['element']}, x={_fmt(max_stress['x'])} m）"
        )
    if enabled("strain") or enabled("stress_strain"):
        lines.append(
            f"- 最大应变：{_fmt(float(max_strain['strain']) * 1e6)} με"
            f"（{max_strain['element']}, x={_fmt(max_strain['x'])} m）"
        )
    lines.append("")


def _system_judgement(project: Project) -> str:
    restrained = sum(sum(node.restraints) for node in project.nodes)
    if not project.nodes or not project.elements:
        return "未形成结构"
    if restrained < 3:
        return "常变或瞬变风险：约束自由度少于 3"
    if restrained == 3:
        return "外部静定近似，不变体系需结合几何继续判断"
    return f"外部超静定近似，冗余约束约 {restrained - 3}"


def _diagram_extrema(
    result: AnalysisResult, component: str, scale: float
) -> tuple[dict[str, float | str], dict[str, float | str]] | None:
    points: list[dict[str, float | str]] = []
    for element_id, rows in result.element_diagrams.items():
        for row in rows:
            points.append(
                {
                    "element": element_id,
                    "x": float(row.get("x", 0.0)),
                    "value": float(row.get(component, 0.0)) * scale,
                }
            )
    if not points:
        return None
    return max(points, key=lambda item: float(item["value"])), min(
        points, key=lambda item: float(item["value"])
    )


def _sorted_items(values: dict[str, Any]) -> list[tuple[str, Any]]:
    def key(item: tuple[str, Any]) -> tuple[str, int]:
        match = re.match(r"^(.*?)(\d+)$", item[0])
        return (match.group(1), int(match.group(2))) if match else (item[0], 0)

    return sorted(values.items(), key=key)


def _fmt(value: Any) -> str:
    numeric = float(value or 0.0)
    if not math.isfinite(numeric) or abs(numeric) < 1e-12:
        return "0"
    magnitude = abs(numeric)
    if magnitude >= 1e6 or magnitude < 1e-5:
        return f"{numeric:.4e}"
    return f"{numeric:.6f}".rstrip("0").rstrip(".")


def _wrap_report_lines(lines: Iterable[str], width: int = 54) -> list[str]:
    wrapped: list[str] = []
    for line in lines:
        if not line:
            wrapped.append("")
            continue
        chunks = textwrap.wrap(
            line,
            width=width,
            break_long_words=True,
            break_on_hyphens=False,
            replace_whitespace=False,
            drop_whitespace=False,
        )
        wrapped.extend(chunk.rstrip() for chunk in chunks or [""])
    return wrapped


def _ascii_cid_widths() -> list[int]:
    """Approximate proportional widths for Unicode U+0020..U+007E in Adobe-GB1."""

    widths: list[int] = []
    for codepoint in range(32, 127):
        character = chr(codepoint)
        if character == " ":
            width = 260
        elif character in "ilI.,:;!|'`":
            width = 280
        elif character in "mwMW@%&":
            width = 850
        elif character.isdigit():
            width = 540
        elif character.isupper():
            width = 650
        elif character.islower():
            width = 500
        else:
            width = 430
        widths.append(width)
    return widths


def _page_content(lines: list[str]) -> bytes:
    commands = ["BT", "/F1 9 Tf", "48 800 Td"]
    for index, line in enumerate(lines):
        if index > 0:
            commands.append("0 -16 Td")
        commands.append(f"{_unicode_pdf_text(line)} Tj")
    commands.append("ET")
    return "\n".join(commands).encode("ascii")


def _unicode_pdf_text(text: str) -> str:
    return f"<{text.encode('utf-16-be').hex().upper()}>"


def _stream_object(content: bytes) -> bytes:
    return b"<< /Length " + str(len(content)).encode("ascii") + b" >>\nstream\n" + content + b"\nendstream"


def _report_images(images: dict[str, Any] | None) -> list[tuple[str, bytes]]:
    if not isinstance(images, dict):
        return []
    result: list[tuple[str, bytes]] = []
    for key, title in (("model", "模型视图"), ("diagrams", "所选结果图")):
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
        f"{_unicode_pdf_text(title)} Tj",
        "ET",
        "q",
        f"{draw_width:.3f} 0 0 {draw_height:.3f} {x:.3f} {y:.3f} cm",
        f"/{image_name} Do",
        "Q",
    ]
    return "\n".join(commands).encode("ascii")


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
        f"trailer\n<< /Size {max_object_id + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode(
            "ascii"
        )
    )
    return b"".join(chunks)
