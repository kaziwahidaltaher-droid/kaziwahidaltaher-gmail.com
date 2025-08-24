# DreamFoundry v1 — AURELION Hardware Blueprint & AI+Robot Workflows

**Goal:** Turn dream text → physical objects using an AI brain (AURELION), CAD generation, and a compact robotic maker cell.

---

## 0) System Overview

```
[ User Dream ]
      |
      v
[ AURELION AI Brain ] --(prompts)-> [ Generative CAD (FreeCAD/Blender) ]
      |                                      |
      |                              (STL/STEP/G-code)
      v                                      |
[ Orchestrator ] <---- telemetry ----- [ Fabrication Cell ]
      |                                      |
      |-------------------- control ---------|
      |
      v
[ Vision + QA ] --> [ Robot Arm Assembly ] --> [ Output / Packaging ]
```

**Core subsystems:**
- **OLEON AI Brain:** LLM + prompt library + rules for manufacturability; converts dream → design brief → CAD param set → CAM plan.
- **Generative CAD:** FreeCAD (Python), Blender (Sverchok/Geometry Nodes) for parametric meshes; exports STL/STEP.
- **Orchestrator:** A message bus (MQTT) + jobs DB (SQLite/Postgres) + job router (FastAPI).
- **Fabrication Cell:** Multi‑tool maker hub (3D printer + CNC + laser) + robot arm + tool rack + conveyor.
- **Vision + QA:** Overhead camera(s) + ArUco markers; detects print success, part pose for pick/place.
- **Safety:** E‑stop, interlocks, fume extraction, enclosure with clear panels, fire sensor for 3D printer.
  
---

## 1) Bill of Materials (BOM) — Minimal Viable Cell

| Subsystem | Suggested Part | Notes / Reason |
|---|---|---|
| Compute (edge) | Mini PC (i5/i7, 16–32GB RAM) | Runs OLEON local services, CAD, orchestrator |
| Secondary MCU | Raspberry Pi 5 / Jetson Orin Nano | Vision + GPIO + camera acceleration |
| Camera | 2× USB UVC 4K cams | Overhead + side; ArUco detection, QA |
| 3D Printer | Bambu P1S / Prusa MK4 | Reliable FDM; networkable; accepts G-code |
| CNC/Laser (optional combo) | Snapmaker A350T (CNC+Laser) | Compact, swappable heads |
| Robot Arm | DOBOT MG400 / uFactory xArm 6 | Desktop industrial arm with Python SDK |
| Conveyor (mini) | 24V belt + motor driver | Moves trays in/out |
| End Effector | 2‑finger gripper (electric) | For pick/place of parts |
| Tooling | Mag plates, part trays, ArUco mats | Repeatable fixturing |
| Enclosure | Aluminum extrusion + polycarbonate | Safety, dust, fume control |
| Fume Extractor | HEPA + carbon filter | 3D print fumes, laser smoke |
| Power | 24V PSU + surge protector + E‑stop | Hardwired E‑stop loop |
| Lighting | LED panel (CRI>90) | Stable vision lighting |
| Fire safety | Smoke sensor + print watchdog | Auto‑pause and alert |

> Start with 3D printer + robot arm + one camera. Add CNC/laser later.

---

## 2) Physical Layout (Top‑Down)

```
+-----------------------------------------------------------+
|                 Safety Enclosure (clear panels)           |
|                                                           |
|  [Cam A]                         [LED]                    |
|                                                           |
|  [3D Printer]   [Robot Arm]   [Tool Rack]   [Conveyor]   |
|        ^             ^             ^             -> out   |
|   ArUco mat      Pick zone     Gripper swap     trays     |
|                                                           |
|                 [Cam B - side]                            |
+-----------------------------------------------------------+
External: Mini PC + Pi/Jetson, E‑stop, Fume Extractor
```

---

## 3) Wiring & Networking (High Level)

- **Network:** All devices on a dedicated LAN/VLAN (printer, arm, Pi, mini‑PC).  
- **Control:** Mini‑PC runs `orchestrator` (FastAPI) + `MQTT broker`. Robot and Pi subscribe to jobs.  
- **Power:** Printer and conveyor on surge protector; E‑stop cuts AC to printer/laser/CNC; low‑voltage logic remains powered to log events.  
- **I/O:** Pi handles GPIO (E‑stop monitor, door interlock, lights).

---

## 4) Software Stack

- **Backend:** FastAPI (Python), MQTT (Eclipse Mosquitto), Celery/RQ for job queue.
- **CAD Gen:** FreeCAD Python scripts for parametric bodies; Blender for organic meshes.
- **Slicing:** PrusaSlicer/Cura CLI; vendor API for Bambu/Prusa where available.
- **Robot SDK:** DOBOT/xArm Python SDK for pick/place; `openpnp` optional.
- **Vision:** OpenCV + ArUco + simple defect heuristics; later YOLO for defects.
- **DB/Storage:** Postgres + MinIO (object store) for STL/G‑code/artifacts.
- **UI:** Minimal React dashboard (job queue, camera feed, E‑stop, progress).

Directory proposal:
```
dreamfoundry/
  backend/
    api/               # FastAPI endpoints
    cad/               # FreeCAD/Blender generators
    cam/               # slicing & toolpath
    robot/             # arm control adapters
    vision/            # QA + pose estimation
    orchestrator/      # job router, MQTT topics
    storage/
  ui/
    web/               # dashboard
  configs/
    cells/default.yaml
  docs/
    wiring.md
    safety.md
```

---

## 5) AI → CAD → Fab Workflow (Air‑&‑Bot Flow)

**A. Dream to Design Brief**
1. User submits dream text.  
2. OLEON LLM parses into: intent, constraints, function, form, size, materials.  
3. LLM chooses generator module: `symbolic_token`, `wearable`, `container`, `kinetic_toy`, etc.

**B. Parametric CAD Generation**
4. Call FreeCAD/Blender script with param set → outputs STL/STEP.  
5. Validate manufacturability: min wall/overhangs, volume, supports.

**C. Slicing & Toolpath**
6. Slice via CLI with material profile → G‑code saved.  
7. Risk check (enclosed volume, print time, filament use).

**D. Fabrication Orchestration**
8. Publish job to MQTT: `cell/print/start` with G‑code link.  
9. Printer runs job; telemetry to orchestrator.

**E. Vision & Robot**
10. Cam detects print completion; locate part with ArUco base mat.  
11. Robot picks part → places on conveyor/output tray.  
12. Optional: Post‑process (deburr, laser etch ID).

**F. QA & Archive**
13. Take hero photo; hash + store STL/G‑code with metadata (dream ID).  
14. Notify user; optionally publish to DreamCubator gallery.

---

## 6) MQTT Topics (Example)

```
dream/cad/submit         # payload: {dream_id, brief}
dream/cad/complete       # payload: {dream_id, stl_uri}
cell/print/start         # payload: {job_id, stl_uri|gcode_uri, material}
cell/print/status        # payload: {job_id, state, progress}
cell/vision/snapshot     # payload: {job_id, img_uri}
cell/robot/pick          # payload: {job_id, pose}
cell/qa/result           # payload: {job_id, pass|fail, notes}
alerts/safety            # payload: {msg, severity}
```

---

## 7) Safety Model (Minimum)

- **E‑stop loop** cutting high‑power devices.  
- **Door interlocks** pause laser/CNC when open.  
- **Smoke sensor + thermal cam** pauses printer; alerts via MQTT.  
- **Fire blanket** + extinguisher near cell.  
- **Operator checklist** with pre‑flight and shutdown steps.

---

## 8) Example FastAPI Stubs

```python
# backend/api/main.py
from fastapi import FastAPI, Body
from pydantic import BaseModel

app = FastAPI(title="DreamFoundry Orchestrator")

class DreamIn(BaseModel):
    dream_id: str
    text: str
    mode: str = "symbolic_token"  # or wearable, container, kinetic_toy

@app.post("/dream/brief")
def brief(dream: DreamIn):
    # LLM parse (placeholder)
    brief = {
        "intent": "symbol of protection",
        "size_mm": 60,
        "material": "PLA"
    }
    return {"dream_id": dream.dream_id, "brief": brief}

@app.post("/cad/generate")
def cad_generate(payload: dict = Body(...)):
    # Call FreeCAD/Blender script (placeholder)
    stl_uri = "s3://artifacts/dream123/model.stl"
    return {"stl_uri": stl_uri}

@app.post("/fabricate/print")
def fabricate_print(job: dict = Body(...)):
    # Publish to MQTT to start printer job (placeholder)
    return {"status": "queued", "job_id": "JOB-001"}
```

---

## 9) CAD Generator Skeleton (FreeCAD, Python)

```python
# backend/cad/token.py
import FreeCAD as App, Part
import Mesh, MeshPart

def make_token(d=60, t=4, motif="eye"):
    doc = App.newDocument()
    disk = Part.makeCylinder(d/2, t)
    # simple motif: cut triangular "pupil"
    tri = Part.makePolygon([App.Vector(0,0,0), App.Vector(d/4,0,0), App.Vector(0,d/4,0), App.Vector(0,0,0)])
    face = Part.Face(tri)
    prism = face.extrude(App.Vector(0,0,t+1))
    result = disk.cut(prism)
    part_obj = doc.addObject("Part::Feature","Token")
    part_obj.Shape = result
    doc.recompute()
    MeshPart.meshFromShape(Shape=result, LinearDeflection=0.1, AngularDeflection=0.523599, Relative=True)
    doc.saveAs("token.FCStd")
    # export STL
    Mesh.export([part_obj], "token.stl")
    return "token.stl"
```

---

## 10) Bring‑Up Checklist (Week 1–4)

**Week 1**
- Assemble enclosure; set up printer; network config; install FastAPI, MQTT.
- Place ArUco mat; calibrate cameras; verify snapshots.

**Week 2**
- Implement `/dream/brief` + simple CAD generator → export STL.
- Slice via CLI; manually print first token.

**Week 3**
- Add robot: teach pick from build plate → tray; add conveyor control.
- Vision pose estimation for pick.

**Week 4**
- Close loop: dream → CAD → slice → print → robot pick → QA photo → archive.
- Add safety checks and operator UI.

---

## 11) License & Ethos

- Open‑source core under Apache‑2.0.  
- Safety‑first, human‑in‑the‑loop fabrication.  
- Credit dreamers; anonymize on request; respect consent.

---

## 12) Next Steps

- Choose robot (MG400 vs xArm).  
- Confirm printer model + slicer CLI.  
- I’ll expand CAD generators for at least 3 artifact classes.  
- You send me your README feedback; we iterate.
