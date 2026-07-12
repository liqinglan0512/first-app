import math
import sys
import unittest
from io import BytesIO
from pathlib import Path

from pypdf import PdfReader

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.models import Element, ElementLoad, Material, NodalLoad, Node, Project, Section
from mechanics_mvp.engine import solve_with_backend
from mechanics_mvp.report import build_report_pdf
from mechanics_mvp.solver import Frame2DSolver, SolverError


class SolverTests(unittest.TestCase):
    def test_cantilever_tip_load_matches_closed_form(self):
        length = 2.0
        force = -10_000.0
        elastic_modulus = 200e9
        inertia = 8e-5
        project = Project(
            nodes=(
                Node("A", 0.0, 0.0, (True, True, True)),
                Node("B", length, 0.0),
            ),
            materials=(Material("steel", elastic_modulus),),
            sections=(Section("section", 0.01, inertia),),
            elements=(Element("E1", "A", "B", "steel", "section"),),
            nodal_loads=(NodalLoad("B", fy=force),),
        )

        result = Frame2DSolver().solve(project)

        expected_uy = force * length**3 / (3.0 * elastic_modulus * inertia)
        expected_rz = force * length**2 / (2.0 * elastic_modulus * inertia)
        self.assertAlmostEqual(result.displacements["B"]["uy"], expected_uy)
        self.assertAlmostEqual(result.displacements["B"]["rz"], expected_rz)
        self.assertAlmostEqual(result.reactions["A"]["fy"], -force)
        self.assertAlmostEqual(result.reactions["A"]["mz"], -force * length)

    def test_simply_supported_uniform_load_reactions_are_symmetric(self):
        project = Project(
            nodes=(
                Node("A", 0.0, 0.0, (True, True, False)),
                Node("B", 4.0, 0.0, (False, True, False)),
            ),
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            elements=(Element("E1", "A", "B", "steel", "section"),),
            element_loads=(ElementLoad("E1", "uniform_local", qy=-5_000.0),),
        )

        result = Frame2DSolver().solve(project)

        self.assertAlmostEqual(result.reactions["A"]["fy"], 10_000.0)
        self.assertAlmostEqual(result.reactions["B"]["fy"], 10_000.0)
        self.assertAlmostEqual(result.reactions["A"]["fx"], 0.0)
        self.assertTrue(math.isclose(result.element_end_forces["E1"]["m_i"], 0.0, abs_tol=1e-8))
        self.assertTrue(math.isclose(result.element_end_forces["E1"]["m_j"], 0.0, abs_tol=1e-8))
        self.assertIn("max_translation", result.summary)
        self.assertIn("E1", result.element_diagrams)

    def test_linear_element_load_reactions_match_static_equilibrium(self):
        length = 4.0
        project = Project(
            nodes=(
                Node("A", 0.0, 0.0, (True, True, False)),
                Node("B", length, 0.0, (False, True, False)),
            ),
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            elements=(Element("E1", "A", "B", "steel", "section"),),
            element_loads=(ElementLoad("E1", "linear_local", qy_i=0.0, qy_j=-10_000.0),),
        )

        result = Frame2DSolver().solve(project)

        self.assertAlmostEqual(result.reactions["A"]["fy"], 20_000.0 / 3.0, places=5)
        self.assertAlmostEqual(result.reactions["B"]["fy"], 40_000.0 / 3.0, places=5)

    def test_polynomial_element_load_supports_curve_input(self):
        project = Project(
            nodes=(
                Node("A", 0.0, 0.0, (True, True, False)),
                Node("B", 4.0, 0.0, (False, True, False)),
            ),
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            elements=(Element("E1", "A", "B", "steel", "section"),),
            element_loads=(ElementLoad("E1", "polynomial_local", qy_coefficients=(-5_000.0,)),),
        )

        result = Frame2DSolver().solve(project)

        self.assertAlmostEqual(result.reactions["A"]["fy"], 10_000.0)
        self.assertAlmostEqual(result.reactions["B"]["fy"], 10_000.0)

    def test_rigid_element_is_much_stiffer_than_frame_element(self):
        base = dict(
            nodes=(Node("A", 0.0, 0.0, (True, True, True)), Node("B", 2.0, 0.0)),
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            nodal_loads=(NodalLoad("B", fy=-10_000.0),),
        )
        frame = Project(elements=(Element("E1", "A", "B", "steel", "section", "frame"),), **base)
        rigid = Project(elements=(Element("E1", "A", "B", "steel", "section", "rigid"),), **base)

        frame_result = Frame2DSolver().solve(frame)
        rigid_result = Frame2DSolver().solve(rigid)

        self.assertLess(abs(rigid_result.displacements["B"]["uy"]), abs(frame_result.displacements["B"]["uy"]) / 1000.0)

    def test_pinn_backend_placeholder_fails_explicitly(self):
        project = Project(
            nodes=(Node("A", 0.0, 0.0, (True, True, True)), Node("B", 1.0, 0.0)),
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            elements=(Element("E1", "A", "B", "steel", "section"),),
        )

        with self.assertRaises(SolverError):
            solve_with_backend(project, "pinn")

    def test_pdf_report_is_generated(self):
        project = Project(
            nodes=(Node("A", 0.0, 0.0, (True, True, True)), Node("B", 2.0, 0.0)),
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            elements=(Element("E1", "A", "B", "steel", "section"),),
            nodal_loads=(NodalLoad("B", fy=-10_000.0),),
        )
        result = Frame2DSolver().solve(project)

        report = build_report_pdf(project, result)
        reader = PdfReader(BytesIO(report))
        extracted = "\n".join(page.extract_text() or "" for page in reader.pages)

        self.assertTrue(report.startswith(b"%PDF-"))
        self.assertGreater(len(reader.pages), 0)
        self.assertIn("计算力学求解计算书", extracted)
        self.assertIn("计算结论", extracted)
        self.assertNotIn("�", extracted)

    def test_unstable_model_raises_solver_error(self):
        project = Project(
            nodes=(Node("A", 0.0, 0.0), Node("B", 1.0, 0.0)),
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            elements=(Element("E1", "A", "B", "steel", "section"),),
            nodal_loads=(NodalLoad("B", fy=-1.0),),
        )

        with self.assertRaises((ValueError, SolverError)):
            Frame2DSolver().solve(project)


if __name__ == "__main__":
    unittest.main()
