# backend/routers/sensors.py
# Pillar 04 — Predictive Sensor Health
# Reads BigQuery anomalies, publishes sensor data to Pub/Sub

import json, math, random, uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.gcp import bq, publisher, PROJECT_ID, DATASET, TELEMETRY_TOPIC

router = APIRouter()

SENSOR_THRESHOLDS = {
    "hydraulic_pressure":      {"threshold": 2.5, "hours": 72,  "component": "hydraulic_seal"},
    "vibration_rms":           {"threshold": 3.0, "hours": 48,  "component": "packer_blade"},
    "temperature_engine":      {"threshold": 2.8, "hours": 96,  "component": "cooling_system"},
    "hydraulic_lift_pressure": {"threshold": 2.5, "hours": 60,  "component": "lift_arm"},
    "can_brake_pressure":      {"threshold": 3.0, "hours": 48,  "component": "brake_system"},
}

COMPONENT_SKUS = {
    "hydraulic_seal":  "HYD-SEAL-HEIL-2024",
    "packer_blade":    "PACK-BLADE-STD-006",
    "cooling_system":  "COOL-PUMP-ASSEMBLY",
    "lift_arm":        "LIFT-ARM-BUSHING-KIT",
    "brake_system":    "BRAKE-PAD-HEAVY-DUTY",
}

class SensorPublishRequest(BaseModel):
    truck_id: str
    sensor_type: str
    value: float
    unit: str = ""
    route_id: Optional[str] = None

class AnomalyRunRequest(BaseModel):
    truck_id: str = "TRUCK-003"
    sensor_type: str = "hydraulic_pressure"
    force_anomaly: bool = False

@router.post("/publish")
def publish_sensor_reading(req: SensorPublishRequest):
    """Publish a sensor reading to GCP Pub/Sub → triggers Dataflow pipeline."""
    payload = {
        "truck_id":        req.truck_id,
        "timestamp":       datetime.utcnow().isoformat(),
        "sensor_type":     req.sensor_type,
        "sensor_id":       f"{req.sensor_type}_{req.truck_id}_001",
        "value":           req.value,
        "unit":            req.unit,
        "route_id":        req.route_id or "R-001",
        "depot_id":        "DEPOT-BLR-01",
        "ingested_at":     datetime.utcnow().isoformat(),
    }
    try:
        data = json.dumps(payload).encode("utf-8")
        future = publisher().publish(
            TELEMETRY_TOPIC,
            data,
            truck_id=req.truck_id,
            sensor_type=req.sensor_type,
        )
        msg_id = future.result(timeout=10)
        return {"status": "published", "message_id": msg_id, "payload": payload}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run-anomaly-detection")
def run_anomaly_detection(req: AnomalyRunRequest):
    """
    Run Z-score anomaly detection on a sensor.
    Writes anomaly to BigQuery + triggers Parts Central reorder if threshold breached.
    """
    cfg = SENSOR_THRESHOLDS.get(req.sensor_type)
    if not cfg:
        raise HTTPException(status_code=400, detail=f"Unknown sensor type: {req.sensor_type}")

    # Simulate sensor reading (anomalous if forced)
    base_values = {
        "hydraulic_pressure": (182, 5),
        "vibration_rms":      (0.8, 0.1),
        "temperature_engine": (92, 3),
        "hydraulic_lift_pressure": (150, 8),
        "can_brake_pressure": (8, 1),
    }
    mean, std = base_values.get(req.sensor_type, (100, 5))
    multiplier = random.uniform(1.5, 1.9) if req.force_anomaly else 1.0
    current_value = round(random.gauss(mean * multiplier, std), 3)
    z_score = abs((current_value - mean) / std)

    is_anomaly = z_score >= cfg["threshold"]
    anomaly_score = min(1.0, z_score / (cfg["threshold"] * 2))

    result = {
        "truck_id":       req.truck_id,
        "sensor_type":    req.sensor_type,
        "component":      cfg["component"],
        "baseline_value": mean,
        "current_value":  current_value,
        "z_score":        round(z_score, 3),
        "is_anomaly":     is_anomaly,
        "anomaly_score":  round(anomaly_score, 3),
        "threshold":      cfg["threshold"],
    }

    if is_anomaly:
        # Write anomaly to BigQuery
        anomaly_id = str(uuid.uuid4())
        predicted_failure = (
            datetime.utcnow() + timedelta(hours=cfg["hours"])
        ).isoformat()

        row = {
            "anomaly_id":        anomaly_id,
            "truck_id":          req.truck_id,
            "sensor_id":         f"{req.sensor_type}_{req.truck_id}_001",
            "sensor_type":       req.sensor_type,
            "detected_at":       datetime.utcnow().isoformat(),
            "predicted_failure": predicted_failure,
            "hours_to_failure":  cfg["hours"],
            "anomaly_score":     round(anomaly_score, 3),
            "baseline_value":    float(mean),
            "current_value":     float(current_value),
            "z_score":           round(z_score, 3),
            "component":         cfg["component"],
            "alert_sent":        True,
            "parts_order_id":    None,
            "model_version":     "v1.0",
        }

        errors = bq().insert_rows_json(
            f"{PROJECT_ID}.{DATASET}.sensor_anomalies", [row]
        )

        # Simulate Parts Central order
        sku = COMPONENT_SKUS.get(cfg["component"], "GENERIC-PART")
        parts_order = {
            "order_id":    f"PO-{anomaly_id[:8].upper()}",
            "sku":         sku,
            "component":   cfg["component"],
            "truck_id":    req.truck_id,
            "status":      "PENDING_APPROVAL",
            "created_at":  datetime.utcnow().isoformat(),
        }

        result.update({
            "anomaly_id":        anomaly_id,
            "predicted_failure": predicted_failure,
            "hours_to_failure":  cfg["hours"],
            "parts_order":       parts_order,
            "bq_written":        len(errors) == 0,
        })

    return result


@router.get("/anomalies")
def get_anomalies(limit: int = 10):
    """Fetch recent anomalies from BigQuery."""
    query = f"""
        SELECT anomaly_id, truck_id, sensor_type, component,
               detected_at, hours_to_failure, anomaly_score,
               z_score, alert_sent, parts_order_id
        FROM `{PROJECT_ID}.{DATASET}.sensor_anomalies`
        ORDER BY detected_at DESC
        LIMIT {limit}
    """
    try:
        rows = list(bq().query(query).result())
        return {"anomalies": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fleet-health")
def fleet_health():
    """Compute fleet health scores from BigQuery anomaly data."""
    query = f"""
        SELECT truck_id,
               COUNT(*) AS total_anomalies,
               COUNTIF(z_score > 3.0) AS critical_count,
               ROUND(AVG(anomaly_score), 3) AS avg_score,
               MAX(detected_at) AS last_anomaly
        FROM `{PROJECT_ID}.{DATASET}.sensor_anomalies`
        WHERE detected_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
        GROUP BY truck_id
        ORDER BY avg_score DESC
    """
    try:
        rows = list(bq().query(query).result())
        trucks = []
        for r in rows:
            d = dict(r)
            if d["critical_count"] >= 2:
                d["health_status"] = "RED"
            elif d["total_anomalies"] >= 3:
                d["health_status"] = "AMBER"
            else:
                d["health_status"] = "GREEN"
            trucks.append(d)
        return {"fleet": trucks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
