import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.webapp import report_project_payload, solve_project_payload


class WebAppTests(unittest.TestCase):
    def test_solve_project_payload_returns_result_dict(self):
        payload = {
            "materials": [{"id": "steel", "E": "200 GPa"}],
            "sections": [{"id": "default", "A": "10000 mm^2", "I": "80000000 mm^4"}],
            "nodes": [
                {"id": "N1", "x": "0 m", "y": "0 m", "restraints": ["ux", "uy", "rz"]},
                {"id": "N2", "x": "4 m", "y": "0 m"},
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

        result = solve_project_payload(payload)

        self.assertIn("displacements", result)
        self.assertIn("reactions", result)
        self.assertIn("element_end_forces", result)
        self.assertIn("summary", result)
        self.assertLess(result["displacements"]["N2"]["uy"], 0.0)
        self.assertAlmostEqual(result["reactions"]["N1"]["fy"], 10_000.0)

    def test_report_project_payload_returns_pdf(self):
        payload = {
            "materials": [{"id": "steel", "E": "200 GPa"}],
            "sections": [{"id": "default", "A": "10000 mm^2", "I": "80000000 mm^4"}],
            "nodes": [
                {"id": "N1", "x": "0 m", "y": "0 m", "restraints": ["ux", "uy", "rz"]},
                {"id": "N2", "x": "2 m", "y": "0 m"},
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

        report = report_project_payload(payload)

        self.assertTrue(report.startswith(b"%PDF-1.4"))


if __name__ == "__main__":
    unittest.main()
