import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.units import UnitError, from_si, to_si


class UnitTests(unittest.TestCase):
    def test_numeric_defaults_to_si(self):
        self.assertEqual(to_si(12.0), 12.0)

    def test_object_quantity_converts_to_si(self):
        self.assertEqual(to_si({"value": 12, "unit": "kN"}), 12000.0)

    def test_string_quantity_converts_to_si(self):
        self.assertAlmostEqual(to_si("2500 mm"), 2.5)
        self.assertAlmostEqual(to_si("200 GPa"), 200_000_000_000.0)

    def test_from_si_converts_to_display_unit(self):
        self.assertEqual(from_si(25000.0, "kN"), 25.0)

    def test_unknown_unit_raises(self):
        with self.assertRaises(UnitError):
            to_si("1 furlong")


if __name__ == "__main__":
    unittest.main()
