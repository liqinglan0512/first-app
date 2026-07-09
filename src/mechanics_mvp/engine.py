"""Solver backend registry.

The public API routes through this module so future solver families can be
attached without changing the pre/post processor contract.
"""

from __future__ import annotations

from dataclasses import asdict

from .diagnostics import diagnose_project
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
    diagnostics = diagnose_project(project)
    fatal_issues = [issue for issue in diagnostics.issues if issue.level == "error"]
    if fatal_issues:
        messages = "; ".join(issue.message for issue in fatal_issues)
        raise SolverError(f"Model diagnostics failed: {messages}")

    try:
        solver = SOLVER_BACKENDS[backend]
    except KeyError as exc:
        available = ", ".join(sorted(SOLVER_BACKENDS))
        raise SolverError(f"Unknown solver backend {backend!r}. Available: {available}.") from exc

    result = solver.solve(project)
    summary = dict(result.summary)
    summary["diagnostics"] = asdict(diagnostics)
    return AnalysisResult(
        displacements=result.displacements,
        reactions=result.reactions,
        element_end_forces=result.element_end_forces,
        element_diagrams=result.element_diagrams,
        summary=summary,
    )


def available_solver_backends() -> tuple[str, ...]:
    return tuple(sorted(SOLVER_BACKENDS))
