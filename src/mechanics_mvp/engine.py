"""Solver backend registry.

The public API routes through this module so future solver families can be
attached without changing the pre/post processor contract.
"""

from __future__ import annotations

from .models import AnalysisResult, Project
from .solver import Frame2DSolver, SolverError


class PinnSolverPlaceholder:
    """Reserved interface for future PINN or inverse-analysis solvers."""

    name = "pinn"

    def solve(self, project: Project) -> AnalysisResult:
        raise SolverError(
            "PINN solver backend is reserved but not configured. "
            "Provide a trained model adapter that implements solve(project)."
        )


SOLVER_BACKENDS = {
    "frame2d": Frame2DSolver(),
    "pinn": PinnSolverPlaceholder(),
}


def solve_with_backend(project: Project, backend: str = "frame2d") -> AnalysisResult:
    try:
        solver = SOLVER_BACKENDS[backend]
    except KeyError as exc:
        available = ", ".join(sorted(SOLVER_BACKENDS))
        raise SolverError(f"Unknown solver backend {backend!r}. Available: {available}.") from exc
    return solver.solve(project)


def available_solver_backends() -> tuple[str, ...]:
    return tuple(sorted(SOLVER_BACKENDS))

