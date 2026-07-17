# backend/routers/edge.py
# Pillar 03 — Edge AI + OTA Pipeline

import json, random
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.gcp import publisher, gcs, PROJECT_ID

router = APIRouter()

TRUCKS = [f"TRUCK-{str(i).zfill(3)}" for i in range(1, 11)]

class SimulateTruckRequest(BaseModel):
    truck_id: str = "TRUCK-001"
    duration_seconds: int = 5
    include_anomaly: bool = False

@router.post("/simulate-truck")
def simulate_truck(req: SimulateTruckRequest):
    """Simulate a truck publishing fused sensor events to Cloud IoT Core → Pub/Sub."""
    topic = f"projects/{PROJECT_ID}/topics/terex-truck-telemetry"
    events = []

    for i in range(req.duration_seconds):
        anomaly_sensors = []
        if req.include_anomaly and i == 2:
            anomaly_sensors = ["hydraulic_pressure", "vibration_rms"]

        payload = {
            "truck_id":          req.truck_id,
            "event_id":          f"{req.truck_id}-{i}",
            "timestamp":         datetime.utcnow().isoformat(),
            "model_version":     "v1.2",
            "severity":          "HIGH" if anomaly_sensors else "LOW",
            "event_type":        "sensor_anomaly" if anomaly_sensors else "normal",
            "cv_confidence":     round(random.uniform(0.72, 0.97), 3),
            "anomalous_sensors": anomaly_sensors,
            "sensor_count":      200,
            "speed_kph":         round(random.uniform(15, 45), 1),
            "inference_latency_ms": random.randint(18, 47),
            "device_model":      "NVIDIA-Jetson-Nano",
        }

        try:
            data   = json.dumps(payload).encode("utf-8")
            future = publisher().publish(topic, data, truck_id=req.truck_id)
            msg_id = future.result(timeout=5)
            payload["message_id"] = msg_id
            payload["published"]  = True
        except Exception as e:
            payload["published"] = False
            payload["error"]     = str(e)

        events.append(payload)

    return {
        "truck_id":         req.truck_id,
        "events_published": len([e for e in events if e.get("published")]),
        "events":           events,
    }


@router.get("/fleet-status")
def fleet_status():
    """Return simulated real-time status of all 10 trucks."""
    return {
        "trucks": [
            {
                "truck_id":        t,
                "status":          random.choice(["ONLINE", "ONLINE", "ONLINE", "OFFLINE"]),
                "model_version":   "v1.2",
                "last_ping":       datetime.utcnow().isoformat(),
                "inference_ms":    random.randint(18, 47),
                "battery_pct":     random.randint(60, 100),
                "gps_lat":         round(12.9716 + random.uniform(-0.05, 0.05), 6),
                "gps_lng":         round(77.5946 + random.uniform(-0.05, 0.05), 6),
                "current_route":   f"R-{random.randint(1,4):03d}",
            }
            for t in TRUCKS
        ]
    }


@router.post("/trigger-ota")
def trigger_ota(new_version: str = "v1.3"):
    """Trigger OTA model update to all fleet devices."""
    config = {
        "action":         "update_model",
        "model_version":  new_version,
        "model_gcs_uri":  f"gs://{PROJECT_ID}-ota-models/backbone/latest.tflite",
        "issued_at":      datetime.utcnow().isoformat(),
    }
    # In production: sends to each device via Cloud IoT Core config API
    # For POC demo, we simulate the staged rollout
    return {
        "ota_triggered": True,
        "new_version":   new_version,
        "config":        config,
        "rollout_stages": [
            {"stage": "5% fleet",   "devices": 1, "status": "COMPLETE"},
            {"stage": "25% fleet",  "devices": 2, "status": "IN_PROGRESS"},
            {"stage": "100% fleet", "devices": 7, "status": "PENDING"},
        ],
        "estimated_completion": "24 hours",
    }
