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

## What the project does

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

### Detection inputs

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

## Why the project is useful

- **Live Telemetry Stream:** simulated downhole conditions replayed at approximately 1 Hz through a WebSocket.
- **Root Cause Diagnostics:** dynamic SHAP rendering explains which features influenced each prediction.
- **What-If Simulator:** a REST API endpoint lets engineers test hypothetical Weight on Bit (WOB), RPM, and feature changes.

Additional dashboard capabilities include live trend charts, anomaly counts, automatic live-baseline simulation, manual feature overrides, responsive layouts, and clickable plain-language feature explanations.

## How to get started

### Prerequisites

- Python 3.13+
- Node.js and npm
- Git

### Installation and local usage

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

Open the local Vite URL shown in the terminal, usually `http://localhost:5173`.

For the deployed version, use the [live Vercel demo](https://volve-equipment-failure-prediction.vercel.app/). The API is hosted separately on [Render](https://volve-equipment-failure-prediction.onrender.com), with interactive documentation at [Render API docs](https://volve-equipment-failure-prediction.onrender.com/docs).

### Validation

```powershell
Set-Location frontend
npm run lint
npm run build
```

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

## Architecture and deployment

The application uses a decoupled frontend/backend deployment:

| Setting | Value |
| --- | --- |
| Frontend | Vercel, using `frontend` as the project root |
| Backend | Render Web Service running `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| API dependencies | `requirements.txt` |
| Frontend build | `npm run build`, output directory `dist` |

The Render service must include the trained model and telemetry data under `models/` and `data/`. Render may pause an inactive free service, so its first request can take longer while it wakes up.

## Where to get help

- Read the [interactive API documentation](https://volve-equipment-failure-prediction.onrender.com/docs).
- Open a [GitHub issue](https://github.com/fakebaconpancakes/Volve_Equipment_Failure_Prediction/issues) for bugs or feature requests.
- Check the [live demo](https://volve-equipment-failure-prediction.vercel.app/) to reproduce frontend behaviour.

## Maintainer and contributions

Maintained by [@fakebaconpancakes](https://github.com/fakebaconpancakes).

Contributions are welcome. Please open an issue before larger changes, keep pull requests focused, and run `npm run lint` and `npm run build` before submitting frontend changes. For backend changes, verify the FastAPI service and model endpoints locally.

## Limitations

- The current WebSocket stream replays the telemetry CSV rather than receiving a live rig feed.
- Isolation Forest detects unusual patterns; it does not identify the physical root cause by itself.
- SHAP values explain model behaviour and should be combined with engineering context.
- The application is intended for monitoring and experimentation, not autonomous drilling control.
