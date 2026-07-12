"""Backend MVP for 2D structural mechanics calculations."""

from .models import (
    AnalysisResult,
    Element,
    ElementLoad,
    Material,
    NodalLoad,
    Node,
    Project,
    Section,
)
from .solver import Frame2DSolver, SolverError
from .engine import available_solver_backends, solve_with_backend
from .version import __version__

__all__ = [
    "AnalysisResult",
    "Element",
    "ElementLoad",
    "Frame2DSolver",
    "Material",
    "NodalLoad",
    "Node",
    "Project",
    "Section",
    "SolverError",
    "available_solver_backends",
    "solve_with_backend",
    "__version__",
]
