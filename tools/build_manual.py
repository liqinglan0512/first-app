"""Build the v1.3.2 Chinese user and technical manual from Markdown.

The builder intentionally supports a small, documented Markdown subset so the
manual stays reviewable without introducing a browser or an HTML-to-PDF runtime.
"""

from __future__ import annotations

import argparse
import hashlib
import re
import shutil
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    Image,
    KeepTogether,
    LongTable,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "docs" / "manual" / "v1.3.2" / "manual.md"
DEFAULT_OUTPUT = ROOT / "web" / "downloads" / "computational-mechanics-solver-v1.3.2-manual.pdf"
DEFAULT_RELEASE_COPY = ROOT / "release" / "v1.3.2" / "computational-mechanics-solver-v1.3.2-manual.pdf"
CHECKSUM_FILE = ROOT / "release" / "v1.3.2" / "checksums.sha256.txt"

TITLE = "Computational Mechanics Solver v1.3.2 用户与技术说明书"
AUTHOR = "Leo Li+ Studio"


def _register_fonts() -> tuple[str, str, str]:
    candidates = [
        (
            Path("C:/Windows/Fonts/Deng.ttf"),
            Path("C:/Windows/Fonts/Dengb.ttf"),
            Path("C:/Windows/Fonts/consola.ttf"),
        ),
        (
            Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
            Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"),
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"),
        ),
        (
            Path("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"),
            Path("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"),
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"),
        ),
    ]
    for regular, bold, mono in candidates:
        if not regular.exists() or not bold.exists():
            continue
        try:
            pdfmetrics.registerFont(TTFont("CMSManual", str(regular)))
            pdfmetrics.registerFont(TTFont("CMSManualBold", str(bold)))
            if mono.exists():
                pdfmetrics.registerFont(TTFont("CMSManualMono", str(mono)))
                mono_name = "CMSManualMono"
            else:
                mono_name = "Courier"
            pdfmetrics.registerFontFamily(
                "CMSManual",
                normal="CMSManual",
                bold="CMSManualBold",
                italic="CMSManual",
                boldItalic="CMSManualBold",
            )
            return "CMSManual", "CMSManualBold", mono_name
        except Exception:
            continue

    from reportlab.pdfbase.cidfonts import UnicodeCIDFont

    pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
    return "STSong-Light", "STSong-Light", "Courier"


BODY_FONT, BOLD_FONT, MONO_FONT = _register_fonts()


class CoverMark(Flowable):
    def __init__(self, height: float = 205 * mm) -> None:
        super().__init__()
        self.width = 170 * mm
        self.height = height

    def draw(self) -> None:
        canvas = self.canv
        width = self.width
        canvas.saveState()
        canvas.setFillColor(colors.HexColor("#08131f"))
        canvas.roundRect(0, 0, width, self.height, 5 * mm, fill=1, stroke=0)

        accents = ["#f25a38", "#f4b93f", "#54af63", "#2799cc", "#7667d9"]
        band_width = width / len(accents)
        for index, color in enumerate(accents):
            canvas.setFillColor(colors.HexColor(color))
            canvas.rect(index * band_width, self.height - 4 * mm, band_width + 0.2, 4 * mm, fill=1, stroke=0)

        canvas.setFillColor(colors.HexColor("#eaf4ff"))
        canvas.setFont(BOLD_FONT, 22)
        canvas.drawCentredString(width / 2, self.height - 52 * mm, "Computational Mechanics Solver")
        canvas.setFont(BOLD_FONT, 17)
        canvas.drawCentredString(width / 2, self.height - 68 * mm, "v1.3.2 用户与技术说明书")

        canvas.setStrokeColor(colors.HexColor("#3d91c7"))
        canvas.setLineWidth(1.2)
        canvas.line(28 * mm, self.height - 80 * mm, width - 28 * mm, self.height - 80 * mm)

        canvas.setFillColor(colors.HexColor("#b9d1e2"))
        canvas.setFont(BODY_FONT, 10.5)
        canvas.drawCentredString(width / 2, self.height - 97 * mm, "二维静力学 · 独立质点动力学 · 工程文件 · 计算报告")
        canvas.drawCentredString(width / 2, self.height - 107 * mm, "用户操作、数值边界、API 与验证证据")

        canvas.setFillColor(colors.HexColor("#112c40"))
        canvas.roundRect(38 * mm, self.height - 154 * mm, width - 76 * mm, 27 * mm, 3 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor("#d8e8f3"))
        canvas.setFont(BODY_FONT, 10)
        canvas.drawCentredString(width / 2, self.height - 138 * mm, "产品发布名称：v1.3.2")
        canvas.drawCentredString(width / 2, self.height - 147 * mm, "运行时构建：1.3.2-beta.2 · Git 87b683d")

        canvas.setFillColor(colors.HexColor("#dce9f2"))
        studio_prefix = "Leo Li"
        studio_suffix = " Studio"
        prefix_width = pdfmetrics.stringWidth(studio_prefix, BODY_FONT, 10.5)
        plus_width = pdfmetrics.stringWidth("+", BODY_FONT, 7)
        suffix_width = pdfmetrics.stringWidth(studio_suffix, BODY_FONT, 10.5)
        studio_x = (width - prefix_width - plus_width - suffix_width) / 2
        canvas.setFont(BODY_FONT, 10.5)
        canvas.drawString(studio_x, 34 * mm, studio_prefix)
        canvas.setFont(BODY_FONT, 7)
        canvas.drawString(studio_x + prefix_width, 37.2 * mm, "+")
        canvas.setFont(BODY_FONT, 10.5)
        canvas.drawString(studio_x + prefix_width + plus_width, 34 * mm, studio_suffix)
        canvas.setFillColor(colors.HexColor("#8eabbf"))
        canvas.setFont(BODY_FONT, 9)
        canvas.drawCentredString(width / 2, 23 * mm, "文档发布日期：2026-07")
        canvas.restoreState()


class ManualDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str, **kwargs: object) -> None:
        super().__init__(filename, **kwargs)
        self._heading_counter = 0
        cover_frame = Frame(
            20 * mm,
            18 * mm,
            A4[0] - 40 * mm,
            A4[1] - 36 * mm,
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
            id="cover-frame",
        )
        body_frame = Frame(
            18 * mm,
            17 * mm,
            A4[0] - 36 * mm,
            A4[1] - 34 * mm,
            leftPadding=0,
            rightPadding=0,
            topPadding=7 * mm,
            bottomPadding=5 * mm,
            id="body-frame",
        )
        self.addPageTemplates(
            [
                PageTemplate("Cover", [cover_frame], onPage=self._draw_cover, autoNextPageTemplate="Body"),
                PageTemplate("Body", [body_frame], onPage=self._draw_body),
            ]
        )

    def beforeDocument(self) -> None:
        self._heading_counter = 0

    @staticmethod
    def _set_metadata(canvas: object) -> None:
        canvas.setTitle(TITLE)
        canvas.setAuthor(AUTHOR)
        canvas.setSubject("v1.3.2 user and technical manual")
        canvas.setCreator("tools/build_manual.py")

    def _draw_cover(self, canvas: object, _doc: object) -> None:
        self._set_metadata(canvas)
        canvas.setFillColor(colors.HexColor("#f5f8fa"))
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)

    def _draw_body(self, canvas: object, _doc: object) -> None:
        self._set_metadata(canvas)
        page_number = max(canvas.getPageNumber() - 1, 1)
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#b9c9d4"))
        canvas.setLineWidth(0.45)
        canvas.line(18 * mm, A4[1] - 13 * mm, A4[0] - 18 * mm, A4[1] - 13 * mm)
        canvas.setFont(BODY_FONT, 7.8)
        canvas.setFillColor(colors.HexColor("#617887"))
        canvas.drawString(18 * mm, A4[1] - 10 * mm, "Computational Mechanics Solver v1.3.2")
        canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"第 {page_number} 页")
        canvas.restoreState()

    def afterFlowable(self, flowable: Flowable) -> None:
        if not isinstance(flowable, Paragraph):
            return
        level = getattr(flowable, "toc_level", None)
        if level is None:
            return
        self._heading_counter += 1
        key = f"heading-{self._heading_counter}"
        text = flowable.getPlainText()
        page = self.page - 1
        self.canv.bookmarkPage(key)
        self.canv.addOutlineEntry(text, key, level=level, closed=level > 0)
        self.notify("TOCEntry", (level, text, page, key))


def _styles() -> dict[str, ParagraphStyle]:
    sample = getSampleStyleSheet()
    return {
        "body": ParagraphStyle(
            "ManualBody",
            parent=sample["BodyText"],
            fontName=BODY_FONT,
            fontSize=9.4,
            leading=15.2,
            textColor=colors.HexColor("#263844"),
            alignment=TA_LEFT,
            spaceAfter=4.8,
            splitLongWords=True,
        ),
        "h1": ParagraphStyle(
            "ManualHeading1",
            parent=sample["Heading1"],
            fontName=BOLD_FONT,
            fontSize=17,
            leading=23,
            textColor=colors.HexColor("#0f6d9a"),
            spaceBefore=4,
            spaceAfter=8,
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "ManualHeading2",
            parent=sample["Heading2"],
            fontName=BOLD_FONT,
            fontSize=13.2,
            leading=18,
            textColor=colors.HexColor("#175b78"),
            spaceBefore=8,
            spaceAfter=5,
            keepWithNext=True,
        ),
        "h3": ParagraphStyle(
            "ManualHeading3",
            parent=sample["Heading3"],
            fontName=BOLD_FONT,
            fontSize=10.8,
            leading=15,
            textColor=colors.HexColor("#2e5264"),
            spaceBefore=6,
            spaceAfter=3,
            keepWithNext=True,
        ),
        "bullet": ParagraphStyle(
            "ManualBullet",
            parent=sample["BodyText"],
            fontName=BODY_FONT,
            fontSize=9.2,
            leading=14.5,
            leftIndent=6 * mm,
            firstLineIndent=-3.5 * mm,
            bulletIndent=1.5 * mm,
            textColor=colors.HexColor("#2d404c"),
            spaceAfter=2,
        ),
        "quote": ParagraphStyle(
            "ManualQuote",
            parent=sample["BodyText"],
            fontName=BODY_FONT,
            fontSize=9.2,
            leading=14.5,
            leftIndent=7 * mm,
            rightIndent=5 * mm,
            borderColor=colors.HexColor("#4b9cc4"),
            borderWidth=1.6,
            borderPadding=5,
            backColor=colors.HexColor("#eef7fb"),
            textColor=colors.HexColor("#244151"),
            spaceBefore=4,
            spaceAfter=6,
        ),
        "caption": ParagraphStyle(
            "ManualCaption",
            parent=sample["BodyText"],
            fontName=BODY_FONT,
            fontSize=8.2,
            leading=12,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#617887"),
            spaceBefore=3,
            spaceAfter=7,
        ),
        "table": ParagraphStyle(
            "ManualTable",
            parent=sample["BodyText"],
            fontName=BODY_FONT,
            fontSize=7.5,
            leading=10.5,
            textColor=colors.HexColor("#263844"),
            alignment=TA_LEFT,
        ),
        "table_header": ParagraphStyle(
            "ManualTableHeader",
            parent=sample["BodyText"],
            fontName=BOLD_FONT,
            fontSize=7.6,
            leading=10.5,
            textColor=colors.white,
            alignment=TA_LEFT,
        ),
        "code": ParagraphStyle(
            "ManualCode",
            parent=sample["Code"],
            fontName=MONO_FONT,
            fontSize=7.3,
            leading=10.2,
            leftIndent=4 * mm,
            rightIndent=4 * mm,
            borderColor=colors.HexColor("#c8d5dd"),
            borderWidth=0.5,
            borderPadding=6,
            backColor=colors.HexColor("#f3f6f8"),
            textColor=colors.HexColor("#1f3440"),
            spaceBefore=3,
            spaceAfter=7,
        ),
        "toc_title": ParagraphStyle(
            "ManualTOCTitle",
            parent=sample["Heading1"],
            fontName=BOLD_FONT,
            fontSize=18,
            leading=24,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#0f6d9a"),
            spaceAfter=10,
        ),
    }


def _inline(text: str) -> str:
    rendered = escape(text.strip())
    rendered = rendered.replace("Li⁺", "Li<super>+</super>")
    rendered = re.sub(r"`([^`]+)`", lambda match: f'<font name="{MONO_FONT}">{match.group(1)}</font>', rendered)
    rendered = re.sub(r"\*\*([^*]+)\*\*", lambda match: f"<b>{match.group(1)}</b>", rendered)
    rendered = re.sub(
        r"\[([^\]]+)\]\((https?://[^)]+)\)",
        lambda match: f'<link href="{match.group(2)}" color="#0b70a4"><u>{match.group(1)}</u></link>',
        rendered,
    )
    return rendered


def _paragraph(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(_inline(text), style)


def _make_heading(text: str, level: int, styles: dict[str, ParagraphStyle]) -> Paragraph:
    style = styles[{1: "h1", 2: "h2", 3: "h3"}[level]]
    paragraph = _paragraph(text, style)
    paragraph.toc_level = level - 1
    return paragraph


def _make_table(rows: list[list[str]], styles: dict[str, ParagraphStyle], width: float) -> LongTable:
    column_count = max(len(row) for row in rows)
    normalized = [row + [""] * (column_count - len(row)) for row in rows]
    data: list[list[Paragraph]] = []
    for row_index, row in enumerate(normalized):
        style = styles["table_header"] if row_index == 0 else styles["table"]
        data.append([_paragraph(cell, style) for cell in row])

    if column_count == 2:
        col_widths = [width * 0.28, width * 0.72]
    elif column_count == 3:
        col_widths = [width * 0.22, width * 0.21, width * 0.57]
    elif column_count == 4:
        col_widths = [width * 0.18, width * 0.17, width * 0.30, width * 0.35]
    else:
        col_widths = [width / column_count] * column_count

    table = LongTable(data, colWidths=col_widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f6f94")),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#bccbd4")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f6f8")]),
            ]
        )
    )
    return table


def _make_image(source_dir: Path, relative_path: str, caption: str, width: float) -> list[Flowable]:
    path = (source_dir / relative_path).resolve()
    if not path.is_file():
        raise FileNotFoundError(f"Manual image does not exist: {path}")
    image_width, image_height = ImageReader(str(path)).getSize()
    max_width = width
    max_height = 155 * mm
    scale = min(max_width / image_width, max_height / image_height, 1.0)
    report_image = Image(str(path), width=image_width * scale, height=image_height * scale)
    report_image.hAlign = "CENTER"
    styles = _styles()
    return [report_image, _paragraph(caption, styles["caption"])]


def _parse_markdown(source: Path, styles: dict[str, ParagraphStyle], available_width: float) -> list[Flowable]:
    lines = source.read_text(encoding="utf-8").splitlines()
    story: list[Flowable] = []
    index = 0
    in_code = False
    code_lines: list[str] = []

    while index < len(lines):
        raw = lines[index]
        stripped = raw.strip()

        if stripped.startswith("```"):
            if in_code:
                code_text = "\n".join(code_lines)
                code_style = styles["code"]
                if any(ord(char) > 127 for char in code_text):
                    code_style = ParagraphStyle("ManualCodeCJK", parent=code_style, fontName=BODY_FONT)
                story.append(Preformatted(code_text, code_style, maxLineLength=100))
                code_lines = []
                in_code = False
            else:
                in_code = True
            index += 1
            continue
        if in_code:
            code_lines.append(raw)
            index += 1
            continue

        if not stripped:
            index += 1
            continue
        if stripped == "[[COVER]]":
            story.extend([CoverMark(), PageBreak()])
            index += 1
            continue
        if stripped == "[[TOC]]":
            story.append(_paragraph("目录", styles["toc_title"]))
            toc = TableOfContents()
            toc.levelStyles = [
                ParagraphStyle(
                    "TOC1",
                    fontName=BOLD_FONT,
                    fontSize=9.4,
                    leading=14,
                    leftIndent=0,
                    firstLineIndent=0,
                    textColor=colors.HexColor("#244151"),
                ),
                ParagraphStyle(
                    "TOC2",
                    fontName=BODY_FONT,
                    fontSize=8.4,
                    leading=12,
                    leftIndent=6 * mm,
                    firstLineIndent=0,
                    textColor=colors.HexColor("#4b6170"),
                ),
            ]
            story.extend([toc, PageBreak()])
            index += 1
            continue
        if stripped == "<!-- pagebreak -->":
            story.append(PageBreak())
            index += 1
            continue
        if stripped.startswith("<!--"):
            index += 1
            continue

        image_match = re.fullmatch(r"!\[([^\]]*)\]\(([^)]+)\)", stripped)
        if image_match:
            story.extend(_make_image(source.parent, image_match.group(2), image_match.group(1), available_width))
            index += 1
            continue

        heading_match = re.match(r"^(#{1,3})\s+(.+)$", stripped)
        if heading_match:
            story.append(_make_heading(heading_match.group(2), len(heading_match.group(1)), styles))
            index += 1
            continue

        if stripped.startswith("|"):
            table_lines: list[str] = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                table_lines.append(lines[index].strip())
                index += 1
            rows = [[cell.strip() for cell in line.strip("|").split("|")] for line in table_lines]
            if len(rows) > 1 and all(re.fullmatch(r":?-{3,}:?", cell) for cell in rows[1]):
                rows.pop(1)
            story.extend([_make_table(rows, styles, available_width), Spacer(1, 5 * mm)])
            continue

        if stripped.startswith("- "):
            while index < len(lines) and lines[index].strip().startswith("- "):
                item = lines[index].strip()[2:]
                story.append(Paragraph(_inline(item), styles["bullet"], bulletText="•"))
                index += 1
            story.append(Spacer(1, 1.5 * mm))
            continue

        numbered = re.match(r"^(\d+)\.\s+(.+)$", stripped)
        if numbered:
            while index < len(lines):
                match = re.match(r"^(\d+)\.\s+(.+)$", lines[index].strip())
                if not match:
                    break
                story.append(Paragraph(_inline(match.group(2)), styles["bullet"], bulletText=f"{match.group(1)}."))
                index += 1
            story.append(Spacer(1, 1.5 * mm))
            continue

        if stripped.startswith("> "):
            quote_lines: list[str] = []
            while index < len(lines) and lines[index].strip().startswith("> "):
                quote_lines.append(lines[index].strip()[2:])
                index += 1
            story.append(_paragraph(" ".join(quote_lines), styles["quote"]))
            continue

        paragraph_lines = [stripped]
        index += 1
        while index < len(lines):
            next_line = lines[index].strip()
            if not next_line:
                break
            if (
                next_line.startswith(("#", "- ", "> ", "|", "```", "[[", "<!--", "!["))
                or re.match(r"^\d+\.\s+", next_line)
            ):
                break
            paragraph_lines.append(next_line)
            index += 1
        story.append(_paragraph(" ".join(paragraph_lines), styles["body"]))

    if in_code:
        raise ValueError("Manual Markdown has an unclosed code block.")
    return story


def build_manual(source: Path, output: Path) -> bytes:
    if not source.is_file():
        raise FileNotFoundError(source)
    output.parent.mkdir(parents=True, exist_ok=True)
    styles = _styles()
    doc = ManualDocTemplate(
        str(output),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=17 * mm,
        bottomMargin=17 * mm,
        title=TITLE,
        author=AUTHOR,
    )
    story = _parse_markdown(source, styles, A4[0] - 36 * mm)
    doc.multiBuild(story)
    return output.read_bytes()


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _update_checksums(path: Path, filename: str, digest: str) -> None:
    entries: dict[str, str] = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            parts = line.strip().split(maxsplit=1)
            if len(parts) == 2 and re.fullmatch(r"[0-9a-fA-F]{64}", parts[0]):
                entries[parts[1].lstrip("* ")] = parts[0].lower()
    entries[filename] = digest
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(f"{value}  {name}\n" for name, value in sorted(entries.items())), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the v1.3.2 user and technical manual PDF.")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--release-copy", type=Path, default=DEFAULT_RELEASE_COPY)
    args = parser.parse_args()

    source = args.source.resolve()
    output = args.output.resolve()
    release_copy = args.release_copy.resolve()
    data = build_manual(source, output)
    release_copy.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(output, release_copy)
    digest = _sha256(data)
    _update_checksums(CHECKSUM_FILE, release_copy.name, digest)
    print(f"Built: {output}")
    print(f"Release copy: {release_copy}")
    print(f"Bytes: {len(data)}")
    print(f"SHA256: {digest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
