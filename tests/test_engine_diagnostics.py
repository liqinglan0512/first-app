import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.engine import solve_with_backend
from mechanics_mvp.models import Element, Material, NodalLoad, Node, Project, Section
from mechanics_mvp.solver import SolverError


class EngineDiagnosticsTests(unittest.TestCase):
    def test_solve_summary_contains_diagnostics(self):
        project = Project(
            nodes=(
                Node("A", 0.0, 0.0, (True, True, True)),
                Node("B", 2.0, 0.0),
            ),
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            elements=(Element("E1", "A", "B", "steel", "section"),),
            nodal_loads=(NodalLoad("B", fy=-10_000.0),),
        )

        result = solve_with_backend(project)

        diagnostics = result.summary["diagnostics"]
        self.assertEqual(diagnostics["node_count"], 2)
        self.assertEqual(diagnostics["element_count"], 1)
        self.assertEqual(diagnostics["restrained_dof_count"], 3)
        self.assertEqual(diagnostics["determinacy_index"], 0)
        self.assertEqual(diagnostics["connected_components"], [["A", "B"]])

    def test_zero_length_element_fails_before_solver(self):
        project = Project(
            nodes=(
                Node("A", 0.0, 0.0, (True, True, True)),
                Node("B", 0.0, 0.0),
            ),
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            elements=(Element("E1", "A", "B", "steel", "section"),),
        )

        with self.assertRaisesRegex(SolverError, "zero length"):
            solve_with_backend(project)


if __name__ == "__main__":
    unittest.main()
