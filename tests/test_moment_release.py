import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.models import Element, ElementLoad, Material, Node, Project, Section
from mechanics_mvp.preprocess import ValidationError
from mechanics_mvp.project_io import project_from_dict
from mechanics_mvp.solver import Frame2DSolver


class MomentReleaseTests(unittest.TestCase):
    def test_single_end_release_matches_fixed_pin_uniform_load(self):
        length = 4.0
        load_intensity = 5_000.0
        project = Project(
            nodes=(
                Node("A", 0.0, 0.0, (True, True, True)),
                Node("B", length, 0.0, (False, True, False)),
            ),
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            elements=(Element("E1", "A", "B", "steel", "section", "frame", False, True),),
            element_loads=(ElementLoad("E1", "uniform_local", qy=-load_intensity),),
        )

        result = Frame2DSolver().solve(project)
        forces = result.element_end_forces["E1"]

        self.assertAlmostEqual(result.reactions["A"]["fy"], 5.0 * load_intensity * length / 8.0)
        self.assertAlmostEqual(result.reactions["B"]["fy"], 3.0 * load_intensity * length / 8.0)
        self.assertAlmostEqual(result.reactions["A"]["mz"], load_intensity * length**2 / 8.0)
        self.assertAlmostEqual(forces["m_j"], 0.0)
        self.assertAlmostEqual(forces["v_i"], result.reactions["A"]["fy"])
        self.assertAlmostEqual(forces["v_j"], result.reactions["B"]["fy"])

    def test_project_from_dict_parses_moment_release_flags(self):
        project = project_from_dict(
            {
                "materials": [{"id": "steel", "E": "200 GPa"}],
                "sections": [{"id": "section", "A": "10000 mm^2", "I": "80000000 mm^4"}],
                "nodes": [
                    {"id": "A", "x": "0 m", "restraints": ["ux", "uy", "rz"]},
                    {"id": "B", "x": "4 m", "restraints": ["uy"]},
                ],
                "elements": [
                    {
                        "id": "E1",
                        "node_i": "A",
                        "node_j": "B",
                        "material": "steel",
                        "section": "section",
                        "moment_release_j": True,
                    }
                ],
            }
        )

        self.assertFalse(project.elements[0].moment_release_i)
        self.assertTrue(project.elements[0].moment_release_j)

    def test_double_end_release_is_rejected_for_now(self):
        project = Project(
            nodes=(
                Node("A", 0.0, 0.0, (True, True, True)),
                Node("B", 4.0, 0.0, (False, True, False)),
            ),
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            elements=(Element("E1", "A", "B", "steel", "section", "frame", True, True),),
        )

        with self.assertRaises(ValidationError):
            Frame2DSolver().solve(project)


if __name__ == "__main__":
    unittest.main()
