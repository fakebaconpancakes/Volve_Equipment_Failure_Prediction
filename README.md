# Downhole Digital Twin: Real-Time Edge AI for Drilling Telemetry

### Production-ready drilling intelligence for earlier, explainable decisions

> **[Access the live demo →](https://volve-equipment-failure-prediction.vercel.app/)**

[![Production Ready](https://img.shields.io/badge/status-production%20ready-2ea44f)](https://volve-equipment-failure-prediction.vercel.app/)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?logo=vercel&logoColor=white)](https://volve-equipment-failure-prediction.vercel.app/)
[![API](https://img.shields.io/badge/API-Render-46E3B7?logo=render&logoColor=111111)](https://volve-equipment-failure-prediction.onrender.com/docs)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111111)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-API-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![scikit--learn](https://img.shields.io/badge/scikit--learn-model-F7931E?logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)
[![SHAP](https://img.shields.io/badge/SHAP-explainability-8A2BE2)](https://shap.readthedocs.io/)

Volve Equipment Failure Prediction is an interactive digital twin for well F-9_A in the Volve field. It combines real-time telemetry streaming, unsupervised anomaly detection, explainable machine learning, and what-if simulation in one operational dashboard.

The project is built to answer three practical questions:

1. **Does the current drilling condition look normal?**
2. **Which measurements influenced that result?**
3. **What could happen if operating conditions change?**

## Project highlights

- **Real-time monitoring:** telemetry streamed through a FastAPI WebSocket
- **Explainable predictions:** SHAP feature impacts for every individual result
- **Interactive simulation:** automatic live-baseline mode and manual feature override mode
- **Decision-focused UI:** clear Normal/Critical Anomaly state with engineering context
- **Production deployment:** React frontend on Vercel and Python API on Render
- **Responsive experience:** usable across desktop and mobile screens

## Production application

- **Frontend:** [React + Vite on Vercel](https://volve-equipment-failure-prediction.vercel.app/)
- **API:** [FastAPI on Render](https://volve-equipment-failure-prediction.onrender.com)
- **Interactive API docs:** [OpenAPI / Swagger UI](https://volve-equipment-failure-prediction.onrender.com/docs)
- **Model:** Isolation Forest
- **Explainability:** SHAP
- **Data:** Volve drilling telemetry in `data/rig_telemetry_drill.csv`

The Vercel frontend connects to the Render API using the API URL configured in `frontend/src/App.jsx`. If the API URL changes, update that value before deploying the frontend again.

## The physical problem

Drilling instability can damage the bit, bottom-hole assembly, and drill string. Severe stick-slip, shock, and tool degradation can lead to expensive non-productive time and potentially multi-million-dollar equipment failures.

This project uses the Equinor Volve dataset to turn raw drilling sensor data into physics-informed features such as **Mechanical Specific Energy (MSE)** and **Torque Variance**. These features help identify operating patterns that deserve attention before damage escalates.

## Decoupled edge-to-cloud architecture

The system is split into independently deployable services:

```text
Volve telemetry / CSV replay
          │
          ▼
FastAPI on Render ── WebSocket telemetry + REST simulation + ML inference
          │
          ▼
React/Vite on Vercel ── dashboard, charts, SHAP explanations, controls
```

- **FastAPI backend:** serves the model, streams telemetry at approximately 1 Hz over WebSockets, and exposes the simulation REST endpoint.
- **React/Vite frontend:** operates independently as the monitoring and decision-support interface.
- **Render + Vercel:** separate API and UI deployments that reflect a practical edge-to-cloud service architecture.

## Deterministic AI and explainability

The anomaly engine uses **Isolation Forest** for unsupervised anomaly detection. It learns the shape of typical operating data and flags combinations that fall outside those patterns.

For explainability, the API uses **SHAP TreeExplainer** to calculate feature impacts for each individual prediction. The dashboard renders these impacts so users can see which measurements influenced a Normal or Critical Anomaly state.

Generative AI and LLM/NLP components are intentionally excluded from the inference path. This keeps predictions deterministic, avoids hallucinated explanations, and supports predictable latency in an industrial, safety-sensitive environment.

## What the project does

The model evaluates five measurements together:

| Feature | Meaning |
| --- | --- |
| **MSE** | Mechanical specific energy used to remove rock |
| **Torque variance** | Variation in rotary torque |
| **Pressure variance** | Variation in drilling pressure |
| **Stick-slip** | Downhole rotary-speed oscillation |
| **Shock peak** | Highest measured downhole acceleration |

Isolation Forest learns the normal operating patterns in the reference data. A new combination that falls outside those patterns is classified as a **Critical Anomaly**. This is an anomaly signal for investigation, not a guaranteed diagnosis or failure prediction.

The application also calculates SHAP values for each prediction. SHAP ranks how strongly each feature influenced the individual result, helping users understand why a condition was classified as normal or unusual.

## Core features

- **Live Telemetry Stream:** simulated downhole conditions replayed at approximately 1 Hz through a WebSocket.
- **Root Cause Diagnostics:** dynamic SHAP rendering explains which features influenced each prediction.
- **What-If Simulator:** a REST API endpoint lets engineers test hypothetical Weight on Bit (WOB), RPM, and feature changes.

Additional dashboard capabilities include live trend charts, anomaly counts, automatic live-baseline simulation, manual feature overrides, responsive layouts, and clickable plain-language feature explanations.

## Repository structure

```text
.
├── data/
│   └── rig_telemetry_drill.csv
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── App.css
│   ├── package.json
│   └── vite.config.js
├── models/
│   └── isolation_forest.pkl
├── main.py
├── requirements.txt
├── test_client.py
└── experiment.ipynb
```

## Run the API locally

Create or activate the Python environment, then install the dependencies:

```powershell
conda activate slb_drill
pip install -r requirements.txt
```

Start the FastAPI server from the repository root:

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The local API is available at:

- API documentation: http://localhost:8000/docs
- Simulation endpoint: http://localhost:8000/api/simulate
- Telemetry WebSocket: ws://localhost:8000/ws/telemetry

## Run the frontend locally

In a second terminal:

```powershell
Set-Location frontend
npm install
npm run dev
```

Vite will print the local frontend URL, usually http://localhost:5173.

To validate the frontend:

```powershell
npm run lint
npm run build
```

### Recruiter quickstart

```powershell
git clone https://github.com/fakebaconpancakes/Volve_Equipment_Failure_Prediction.git
Set-Location Volve_Equipment_Failure_Prediction
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

In a second terminal:

```powershell
Set-Location frontend
npm install
npm run dev
```

## API contract

### `GET /docs`

FastAPI's interactive API documentation.

### `WS /ws/telemetry`

Streams one telemetry object approximately every second. Each message includes:

```json
{
  "time": "2026-01-01 00:00:00",
  "mse": 1344.0,
  "torque_variance": 0.12,
  "pressure_variance": 0.08,
  "torque": 100.0,
  "stick_slip": 21.0,
  "shock_peak": 2.0,
  "status": "Normal",
  "root_cause": "N/A",
  "shap": []
}
```

The `shap` array contains the feature name, supplied value, signed impact, and absolute impact.

### `POST /api/simulate`

Example request:

```json
{
  "wob": 25,
  "rpm": 120,
  "torque": 100,
  "torque_variance": 0.12,
  "pressure_variance": 0.08,
  "stick_slip": 21,
  "shock_peak": 2,
  "manual_features": false
}
```

Automatic mode calculates hypothetical MSE from WOB, RPM, and torque. Manual mode sets `"manual_features": true` and supplies `"mse"` to override the calculated MSE.

## Deploying the API to Render

Create a Render **Web Service** connected to this GitHub repository with:

| Setting | Value |
| --- | --- |
| Runtime | Python |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Health/check URL | `/docs` |

Render must have access to:

- `main.py`
- `requirements.txt`
- `models/isolation_forest.pkl`
- `data/rig_telemetry_drill.csv`

After deployment, verify the API documentation at:

https://volve-equipment-failure-prediction.onrender.com/docs

Render may pause an inactive free service. The first request after inactivity can take longer while the API wakes up.

## Deploying the frontend to Vercel

Import the `frontend` directory as the Vercel project root, or configure the Vercel project so its root directory is `frontend`.

Recommended settings:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | `dist` |

The frontend uses the Render API URL:

```text
https://volve-equipment-failure-prediction.onrender.com
```

If the API URL is moved to an environment variable in the future, add this Vercel project variable:

```text
VITE_API_URL=https://volve-equipment-failure-prediction.onrender.com
```

Redeploy Vercel after changing the API URL or frontend code.

## Production checklist

- Confirm the Render `/docs` page loads.
- Confirm `POST /api/simulate` returns a prediction and SHAP results.
- Confirm the WebSocket stream is reachable from the Vercel domain.
- Confirm the browser console has no CORS or WebSocket errors.
- Run `npm run lint` and `npm run build` before deploying frontend changes.
- Keep the model, telemetry CSV, and Python dependency versions synchronized with the API deployment.

## Limitations

- The current WebSocket stream replays the telemetry CSV rather than receiving a live rig feed.
- Isolation Forest detects unusual patterns; it does not identify the physical root cause by itself.
- SHAP values explain model behaviour and should be combined with engineering context.
- The application is intended for monitoring and experimentation, not autonomous drilling control.
