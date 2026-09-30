import asyncio
import websockets
import json

async def listen_to_rig():
    url = "ws://localhost:8000/ws/telemetry"
    print(f"Connecting to Digital Twin at {url}...")

    try:
        async with websockets.connect(url) as ws:
            print("Connection established. Waiting for downhole data...\n")

            while True:
                message =  await ws.recv()
                data = json.loads(message)
                if data["status"] == "Critical Anomaly":
                        print(f"ANOMALY DETECTED | Time: {data['time']} | MSE: {data['mse']:.2f}")
                else:
                    print(f"Normal | Time: {data['time']} | MSE: {data['mse']:.2f}")

    except Exception as e:
         print(f"Disconnected: {e}")

asyncio.run(listen_to_rig())
