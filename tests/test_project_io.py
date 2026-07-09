import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.project_io import load_project, project_from_dict
from mechanics_mvp.solver import Frame2DSolver


class ProjectIoTests(unittest.TestCase):
    def test_project_from_dict_converts_units(self):
        project = project_from_dict(
            {
                "materials": [{"id": "steel", "E": "200 GPa"}],
                "sections": [{"id": "section", "A": "10000 mm^2", "I": "80000000 mm^4"}],
                "nodes": [
                    {"id": "A", "x": "0 m", "restraints": ["ux", "uy", "rz"]},
                    {"id": "B", "x": "2000 mm"},
                ],
                "elements": [
                    {
                        "id": "E1",
                        "node_i": "A",
                        "node_j": "B",
                        "material": "steel",
                        "section": "section",
                    }
                ],
                "loads": {"nodes": [{"node": "B", "fy": "-10 kN"}]},
            }
        )

        self.assertAlmostEqual(project.nodes[1].x, 2.0)
        self.assertAlmostEqual(project.materials[0].elastic_modulus, 200e9)
        self.assertAlmostEqual(project.sections[0].area, 0.01)
        self.assertAlmostEqual(project.sections[0].inertia, 8e-5)
        self.assertAlmostEqual(project.nodal_loads[0].fy, -10_000.0)

    def test_load_example_and_solve(self):
        path = Path(__file__).resolve().parents[1] / "examples" / "cantilever_beam.json"
        project = load_project(path)
        result = Frame2DSolver().solve(project)

        self.assertIn("B", result.displacements)
        self.assertLess(result.displacements["B"]["uy"], 0.0)
        self.assertAlmostEqual(result.reactions["A"]["fy"], 10_000.0)


if __name__ == "__main__":
    unittest.main()
