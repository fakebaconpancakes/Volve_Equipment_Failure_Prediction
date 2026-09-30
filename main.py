import asyncio
import json
import pandas as pd
import joblib
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

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

@app.websocket("/ws/telemetry")
async def stream_telemetry(websocket: WebSocket):
    await websocket.accept()
    print("Client connected to live telemetry stream.")

    # streams the data to the websocket
    try:
        for index, row in df.iterrows():
            X_live = pd.DataFrame([row[features]])
            prediction = model.predict(X_live)[0]
            payload = {
                    "time": str(row["Time s"]),
                    "mse": float(row["MSE"]),
                    "torque_variance": float(row["Torque_Variance"]),
                    "pressure_variance": float(row["Pressure_Variance"]),
                    "status": "Critical Anomaly" if prediction == -1 else "Normal"
                }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(1)

    except Exception as e:
        print("Client Disconnected.")