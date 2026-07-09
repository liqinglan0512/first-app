import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.models import Element, Material, NodalLoad, Node, Project, Section
from mechanics_mvp.solver import Frame2DSolver


class TrussElementTests(unittest.TestCase):
    def test_single_truss_bar_axial_displacement_and_force(self):
        length = 3.0
        load = 12_000.0
        elastic_modulus = 200e9
        area = 0.006
        project = Project(
            nodes=(
                Node("A", 0.0, 0.0, (True, True, True)),
                Node("B", length, 0.0, (False, True, True)),
            ),
            materials=(Material("steel", elastic_modulus),),
            sections=(Section("section", area, 1.0e-5),),
            elements=(Element("T1", "A", "B", "steel", "section", "truss"),),
            nodal_loads=(NodalLoad("B", fx=load),),
        )

        result = Frame2DSolver().solve(project)

        expected_u = load * length / (elastic_modulus * area)
        forces = result.element_end_forces["T1"]
        self.assertAlmostEqual(result.displacements["B"]["ux"], expected_u)
        self.assertAlmostEqual(result.displacements["B"]["uy"], 0.0)
        self.assertAlmostEqual(result.displacements["B"]["rz"], 0.0)
        self.assertAlmostEqual(forces["n_i"], -load)
        self.assertAlmostEqual(forces["n_j"], load)
        self.assertAlmostEqual(forces["v_i"], 0.0)
        self.assertAlmostEqual(forces["m_i"], 0.0)
        self.assertAlmostEqual(forces["v_j"], 0.0)
        self.assertAlmostEqual(forces["m_j"], 0.0)


if __name__ == "__main__":
    unittest.main()
