import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.engine import solve_with_backend
from mechanics_mvp.project_io import project_from_dict
from mechanics_mvp.report import build_report_pdf, build_report_text
from mechanics_mvp.webapp import dynamics_report_payload


def sample_project():
    return project_from_dict(
        {
            "metadata": {"name": "canvas_project", "report_scope": "whole"},
            "materials": [{"id": "steel", "E": "200 GPa"}],
            "sections": [{"id": "default", "A": "10000 mm^2", "I": "80000000 mm^4"}],
            "nodes": [
                {"id": "N1", "x": "0 m", "y": "0 m", "restraints": ["ux", "uy", "rz"]},
                {"id": "N2", "x": "4.5 m", "y": "0 m"},
            ],
            "elements": [
                {
                    "id": "E1",
                    "node_i": "N1",
                    "node_j": "N2",
                    "material": "steel",
                    "section": "default",
                }
            ],
            "loads": {"nodes": [{"node": "N2", "fy": "-10 kN"}]},
        }
    )


class ReportTests(unittest.TestCase):
    def test_report_text_is_human_readable_chinese_without_raw_json(self):
        project = sample_project()
        result = solve_with_backend(project)

        text = build_report_text(
            project,
            result,
            options=["internal", "moment", "shear", "axial", "displacement", "reaction", "danger"],
        )

        self.assertIn("求解结果", text)
        self.assertIn("节点位移与转角", text)
        self.assertIn("杆端内力", text)
        self.assertIn("计算推导过程", text)
        self.assertNotIn('"dangerous_sections"', text)
        self.assertNotIn("Mechanics MVP Calculation Report", text)

    def test_report_pdf_uses_unicode_cjk_font(self):
        project = sample_project()
        result = solve_with_backend(project)

        report = build_report_pdf(project, result, options=["displacement", "reaction"])

        self.assertTrue(report.startswith(b"%PDF-1.4"))
        self.assertIn(b"/STSong-Light", report)
        self.assertIn("求解结果".encode("utf-16-be").hex().upper().encode("ascii"), report)

    def test_dynamics_report_payload_builds_chinese_pdf(self):
        report = dynamics_report_payload({"report_text": "动力学求解结果\n速度：1 m/s"})

        self.assertTrue(report.startswith(b"%PDF-1.4"))
        self.assertIn("动力学求解结果".encode("utf-16-be").hex().upper().encode("ascii"), report)


if __name__ == "__main__":
    unittest.main()
