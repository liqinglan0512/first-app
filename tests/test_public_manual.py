from __future__ import annotations

import re
import unittest
from pathlib import Path
from zipfile import ZipFile

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
MANUAL_DIR = ROOT / "docs" / "manual" / "v1.3.2"
PDF_PATH = ROOT / "web" / "downloads" / "computational-mechanics-solver-v1.3.2-manual.pdf"


class PublicManualTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        matches = list(
            MANUAL_DIR.glob("Computational-Mechanics-Solver-v1.3.2-*.docx")
        )
        if len(matches) != 1:
            raise AssertionError(f"Expected one generated public DOCX, found {len(matches)}")
        cls.docx_path = matches[0]
        with ZipFile(cls.docx_path) as archive:
            cls.document_xml = archive.read("word/document.xml").decode("utf-8")
            cls.numbering_xml = archive.read("word/numbering.xml").decode("utf-8")
            cls.package_text = "\n".join(
                archive.read(name).decode("utf-8", errors="ignore")
                for name in archive.namelist()
                if name.endswith((".xml", ".rels"))
            )
            cls.media_names = sorted(
                name for name in archive.namelist() if name.startswith("word/media/")
            )

        cls.pdf_reader = PdfReader(PDF_PATH)
        cls.pdf_text = "\n".join(
            page.extract_text() or "" for page in cls.pdf_reader.pages
        )

    def test_public_outputs_exist_and_are_substantial(self) -> None:
        self.assertGreater(self.docx_path.stat().st_size, 1_000_000)
        self.assertGreater(PDF_PATH.stat().st_size, 500_000)
        self.assertEqual(len(self.pdf_reader.pages), 26)
        self.assertGreater(len(self.pdf_text), 20_000)

    def test_docx_contains_real_document_structures(self) -> None:
        self.assertIn('TOC \\o "1-2"', self.document_xml)
        self.assertEqual(self.document_xml.count("<w:sectPr"), 2)
        self.assertEqual(self.document_xml.count("<w:tbl>"), 10)
        self.assertEqual(self.document_xml.count("<m:oMath"), 20)
        self.assertEqual(self.document_xml.count(" SEQ "), 33)
        self.assertEqual(len(self.media_names), 4)

        self.assertIn("chineseCountingThousand", self.numbering_xml)
        self.assertIn("%1.%2", self.numbering_xml)
        self.assertIn("%1.%2.%3", self.numbering_xml)

    def test_pdf_contains_required_user_facing_content(self) -> None:
        required = (
            "第一章 阅读本手册",
            "第七章 静力学案例",
            "第十二章 动力学案例",
            "用户静力学案例一：三角形平面刚架",
            "用户动力学案例一：有限磁场圆周轨迹",
            "用户动力学案例二：有限磁场中的螺旋状数值轨迹",
            "用户动力学案例一的有限磁场圆周轨迹与结果栏",
            "用户动力学案例二的有限磁场螺旋状数值轨迹与结果栏",
            "50.376575",
            "-89.216113",
            "无法完全复算",
            "Euler-Bernoulli",
            "Runge-Kutta",
        )
        for text in required:
            with self.subTest(text=text):
                self.assertIn(text, self.pdf_text)

    def test_public_document_does_not_leak_internal_release_details(self) -> None:
        forbidden = (
            "Git",
            "/api/",
            "SHA256",
            "ThreadingHTTPServer",
            "源码 ZIP",
            "release/v1.3.2",
            "git_commit",
            "git_dirty",
            "started_at",
        )
        searchable_docx = re.sub(r"<[^>]+>", " ", self.package_text)
        for text in forbidden:
            with self.subTest(text=text):
                self.assertNotIn(text, self.pdf_text)
                self.assertNotIn(text, searchable_docx)

        self.assertIsNone(re.search(r"[A-Za-z]:\\Users\\", self.pdf_text))
        self.assertIsNone(re.search(r"[A-Za-z]:\\Users\\", searchable_docx))
        self.assertNotIn("\ufffd", self.pdf_text)


if __name__ == "__main__":
    unittest.main()
