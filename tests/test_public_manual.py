from __future__ import annotations

import re
import unittest
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
MANUAL_DIR = ROOT / "docs" / "manual" / "v1.3.2"
PDF_PATH = ROOT / "web" / "downloads" / "computational-mechanics-solver-v1.3.2-manual.pdf"
SOURCE_PATH = MANUAL_DIR / "manual-source.md"


class PublicManualTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.source_text = SOURCE_PATH.read_text(encoding="utf-8")
        cls.pdf_reader = PdfReader(PDF_PATH)
        cls.pdf_text = "\n".join(
            page.extract_text() or "" for page in cls.pdf_reader.pages
        )

    def test_public_outputs_exist_and_are_substantial(self) -> None:
        self.assertGreater(SOURCE_PATH.stat().st_size, 20_000)
        self.assertGreater(PDF_PATH.stat().st_size, 500_000)
        self.assertEqual(len(self.pdf_reader.pages), 26)
        self.assertGreater(len(self.pdf_text), 20_000)

    def test_repository_keeps_one_source_and_no_generated_docx(self) -> None:
        self.assertEqual(list(MANUAL_DIR.glob("*.docx")), [])
        self.assertIn("用户静力学案例一：三角形平面刚架", self.source_text)
        self.assertIn("用户动力学案例一：有限磁场圆周轨迹", self.source_text)
        self.assertIn("用户动力学案例二：有限磁场中的螺旋状数值轨迹", self.source_text)
        referenced_images = re.findall(r"\]\((assets/[^)]+)\)", self.source_text)
        self.assertEqual(
            sorted(referenced_images),
            sorted(
                [
                    "assets/static-triangle-frame-case.png",
                    "assets/dynamics-magnetic-case.png",
                    "assets/dynamics-spiral-case.png",
                ]
            ),
        )
        for image in referenced_images:
            self.assertTrue((MANUAL_DIR / image).is_file(), image)

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
        for text in forbidden:
            with self.subTest(text=text):
                self.assertNotIn(text, self.pdf_text)
                self.assertNotIn(text, self.source_text)

        self.assertIsNone(re.search(r"[A-Za-z]:\\Users\\", self.pdf_text))
        self.assertIsNone(re.search(r"[A-Za-z]:\\Users\\", self.source_text))
        self.assertNotIn("\ufffd", self.pdf_text)

    def test_only_one_public_manual_pdf_exists(self) -> None:
        manuals = list(ROOT.rglob("computational-mechanics-solver-v1.3.2-manual.pdf"))
        self.assertEqual(manuals, [PDF_PATH])
        self.assertEqual(PDF_PATH.read_bytes()[:4], b"%PDF")


if __name__ == "__main__":
    unittest.main()
