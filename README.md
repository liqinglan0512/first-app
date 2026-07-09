# Mechanics MVP

Python MVP for a professional mechanics solver backend.

Stage 1 scope:

- SI-only internal computation core.
- JSON project input.
- Unit conversion at project boundaries.
- 2D frame finite element solver with `ux`, `uy`, `rz` degrees of freedom.
- Nodal loads, local uniform element loads, displacements, reactions, and element end forces.
- Phase 2 drawing UI with nodes, elements, supports, nodal loads, solve, save, and open.
- Phase 3 extensions: rigid elements, linear/polynomial local element loads, diagram samples, dangerous-section summary, flexibility summary, PINN backend slot, and PDF report export.

Run an example:

```powershell
$env:PYTHONPATH = "src"
python -m mechanics_mvp examples/cantilever_beam.json
```

Run the advanced example and export a PDF report:

```powershell
$env:PYTHONPATH = "src"
python -m mechanics_mvp examples/advanced_frame_project.json --report advanced-report.pdf
```

Run tests:

```powershell
$env:PYTHONPATH = "src"
python -m unittest discover -s tests
```

Run the phase-two drawing app:

```powershell
python run_webapp.py --port 18765
```

Then open `http://127.0.0.1:18765`.

Expose it on your local network:

```powershell
python run_webapp.py --host 0.0.0.0 --port 18765
```

Other devices on the same Wi-Fi can open `http://YOUR-LAN-IP:18765`. This is not a public internet URL.

Deploy as a public website:

1. Push this folder to a Git repository.
2. Create a Python web service on a cloud platform or your own server.
3. Use this start command:

```bash
python run_webapp.py --host 0.0.0.0
```

The app reads the platform-provided `PORT` environment variable automatically. Platforms that support a `Procfile` can use the included `Procfile`; container platforms can use the included `Dockerfile`.

Self-host with Docker:

```bash
docker build -t computational-mechanics-solver .
docker run -p 8765:8765 computational-mechanics-solver
```

Then publish the server address or bind it behind your domain name.
