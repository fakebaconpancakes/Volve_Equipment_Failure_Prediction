import asyncio
import json
import pandas as pd
import joblib
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shap
import numpy as np

app = FastAPI(title="Drilling Digital Twin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

print("Loading Model and Telemetry Data..")
model = joblib.load("models/isolation_forest.pkl")
df = pd.read_csv("data/rig_telemetry_drill.csv")
features = ['MSE', 'Torque_Variance', 'Pressure_Variance', 
            'MWD Stick-Slip PKtoPK RPM rpm', 'MWD Shock Peak m/s2']

explainer = shap.TreeExplainer(model) #SHAP explainer for the model

def get_shap_results(X: pd.DataFrame):
    shap_values = explainer.shap_values(X)
    values = np.asarray(shap_values)

    # TreeExplainer can return either a matrix or a list depending on the
    # model and SHAP version. Isolation Forest uses one value per feature.
    if values.ndim > 2:
        values = values[0]
    values = values.reshape(-1)

    return [
        {
            "feature": feature,
            "value": float(X.iloc[0][feature]),
            "impact": float(impact),
            "abs_impact": float(abs(impact)),
        }
        for feature, impact in zip(features, values)
    ]

@app.websocket("/ws/telemetry")
async def stream_telemetry(websocket: WebSocket):
    await websocket.accept()
    print("Client connected to live telemetry stream.")

    # streams the data to the websocket
    try:
        for index, row in df.iterrows():
            X_live = pd.DataFrame([row[features]])
            prediction = model.predict(X_live)[0]

            shap_results = []
            root_cause = "N/A"

            if prediction == -1:
                shap_results = get_shap_results(X_live)
                top_feature_index = max(
                    range(len(shap_results)),
                    key=lambda feature_index: shap_results[feature_index]["abs_impact"],
                )
                root_cause = features[top_feature_index]
            else:
                shap_results = get_shap_results(X_live)

            payload = {
                    "time": str(row["Time s"]),
                    "mse": float(row["MSE"]),
                    "torque_variance": float(row["Torque_Variance"]),
                    "pressure_variance": float(row["Pressure_Variance"]),
                    "torque": float(row["Average Surface Torque kN.m"]),
                    "stick_slip": float(row["MWD Stick-Slip PKtoPK RPM rpm"]),
                    "shock_peak": float(row["MWD Shock Peak m/s2"]),
                    "status": "Critical Anomaly" if prediction == -1 else "Normal",
                    "root_cause": root_cause,
                    "shap": shap_results,
                }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(1)

    except Exception as e:
        print("Client Disconnected.")

# Building the simulator
class SimulationRequest(BaseModel):
    wob: float
    rpm: float
    torque: float
    torque_variance: float
    pressure_variance: float
    stick_slip: float
    shock_peak: float
    manual_features: bool = False
    mse: float | None = None

@app.post("/api/simulate")
async def run_simulation(req: SimulationRequest):
    # MSE
    bit_size = 8.5
    hypothetical_mse = req.mse if req.manual_features and req.mse is not None else (
        req.wob + (120 * req.rpm * req.torque) / (bit_size ** 2)
    )

    #Features chosenn for model
    X_sim = pd.DataFrame([[
        hypothetical_mse, 
        req.torque_variance, 
        req.pressure_variance, 
        req.stick_slip, 
        req.shock_peak
    ]], columns=features)

    #predict
    prediction = model.predict(X_sim)[0]
    shap_results = get_shap_results(X_sim)

    return {
        "hypothetical_mse": hypothetical_mse,
        "status": "Critical Anomaly" if prediction == -1 else "Normal",
        "root_cause": max(shap_results, key=lambda result: result["abs_impact"])["feature"],
        "shap": shap_results,
    }