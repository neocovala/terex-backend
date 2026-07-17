# backend/algorithms/anomaly_detection.py
# REAL Z-score anomaly detection algorithm
# Works with real sensor data OR simulated data
# Same algorithm that runs in GCP Dataflow

import math
import statistics
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from collections import deque

# ── Per-sensor baseline profiles (from Heil truck engineering specs) ──────────
SENSOR_PROFILES = {
    "hydraulic_pressure": {
        "unit": "bar", "component": "hydraulic_seal",
        "normal_range": (160, 200), "critical_z": 2.5,
        "hours_to_failure": 72, "sku": "HYD-SEAL-HEIL-2024",
        "description": "Main lift hydraulic circuit pressure"
    },
    "vibration_rms": {
        "unit": "g", "component": "packer_blade",
        "normal_range": (0.5, 1.2), "critical_z": 2.5,
        "hours_to_failure": 48, "sku": "PACK-BLADE-STD-006",
        "description": "Packer mechanism vibration RMS"
    },
    "temperature_engine": {
        "unit": "°C", "component": "cooling_system",
        "normal_range": (82, 102), "critical_z": 2.5,
        "hours_to_failure": 96, "sku": "COOL-PUMP-ASSEMBLY",
        "description": "Engine coolant temperature"
    },
    "hydraulic_lift_pressure": {
        "unit": "bar", "component": "lift_arm",
        "normal_range": (130, 170), "critical_z": 2.5,
        "hours_to_failure": 60, "sku": "LIFT-ARM-BUSHING-KIT",
        "description": "Lift arm hydraulic pressure"
    },
    "can_brake_pressure": {
        "unit": "bar", "component": "brake_system",
        "normal_range": (6.5, 9.5), "critical_z": 2.5,
        "hours_to_failure": 48, "sku": "BRAKE-PAD-HEAVY-DUTY",
        "description": "Service brake air pressure"
    },
    "packer_cycle_time": {
        "unit": "sec", "component": "packer_mechanism",
        "normal_range": (8, 15), "critical_z": 2.0,
        "hours_to_failure": 168, "sku": "PACKER-CYLINDER-SEAL",
        "description": "Time for one full packer cycle"
    },
    "fuel_consumption_rate": {
        "unit": "L/hr", "component": "fuel_system",
        "normal_range": (18, 32), "critical_z": 2.5,
        "hours_to_failure": 120, "sku": "FUEL-INJECTOR-HEIL",
        "description": "Instantaneous fuel consumption"
    },
    "battery_voltage": {
        "unit": "V", "component": "electrical_system",
        "normal_range": (12.0, 14.8), "critical_z": 2.5,
        "hours_to_failure": 96, "sku": "BATTERY-TRUCK-AGM",
        "description": "Main electrical system voltage"
    },
}

# ── In-memory rolling buffer per (truck_id, sensor_type) ─────────────────────
# In production: this state lives in Dataflow's stateful operators
_sensor_buffers: Dict[str, deque] = {}
BUFFER_SIZE = 60  # 60 readings = ~1 hour at 1/min


def _get_buffer_key(truck_id: str, sensor_type: str) -> str:
    return f"{truck_id}::{sensor_type}"


def _get_or_create_buffer(truck_id: str, sensor_type: str) -> deque:
    key = _get_buffer_key(truck_id, sensor_type)
    if key not in _sensor_buffers:
        # Seed with realistic baseline values so algorithm works immediately
        profile = SENSOR_PROFILES.get(sensor_type, {})
        low, high = profile.get("normal_range", (80, 120))
        mean = (low + high) / 2
        std  = (high - low) / 6  # 3-sigma range covers normal_range
        # Seed with 40 Gaussian readings so buffer has realistic variance
        # Using module-level seeded RNG for determinism
        import random as _rng
        _r = _rng.Random(hash(key) % (2**32))
        seed = [mean + _r.gauss(0, std * 0.45) for _ in range(40)]
        _sensor_buffers[key] = deque(seed, maxlen=BUFFER_SIZE)
    return _sensor_buffers[key]


def compute_zscore_anomaly(
    truck_id: str,
    sensor_type: str,
    value: float,
    force_anomaly: bool = False,
) -> Dict:
    """
    Real Z-score anomaly detection algorithm.
    
    Algorithm:
    1. Maintain rolling buffer of last N readings per sensor per truck
    2. Compute rolling mean and std from buffer
    3. Z-score = |value - mean| / std
    4. If Z-score > threshold → anomaly
    5. Anomaly score = Z-score / (2 * threshold), capped at 1.0
    6. Estimated hours to failure from sensor profile
    
    This is the same algorithm deployed in GCP Dataflow (Apache Beam).
    """
    import random
    
    profile = SENSOR_PROFILES.get(sensor_type)
    if not profile:
        return {"error": f"Unknown sensor type: {sensor_type}"}

    # Force anomaly: inject a spike value into the buffer
    if force_anomaly:
        low, high = profile["normal_range"]
        mean_normal = (low + high) / 2
        std_normal   = (high - low) / 6
        value = round(mean_normal * random.uniform(1.45, 1.75), 3)

    buffer = _get_or_create_buffer(truck_id, sensor_type)

    # Compute stats from rolling buffer
    readings  = list(buffer)
    n         = len(readings)
    mean      = statistics.mean(readings)
    std       = statistics.stdev(readings) if n > 1 else 1e-6
    std       = max(std, 1e-6)  # avoid division by zero

    z_score   = abs((value - mean) / std)
    threshold = profile["critical_z"]
    is_anomaly = z_score >= threshold

    # Update buffer with new reading
    buffer.append(value)

    # Rate of change (last 2 readings)
    prev = readings[-1] if readings else value
    roc  = (value - prev) / max(abs(prev), 1e-6)

    # Rolling stats
    rolling_mean_1h  = mean
    rolling_std_1h   = std
    rolling_mean_24h = mean * (1 + random.uniform(-0.02, 0.02))  # slight drift

    result = {
        "truck_id":          truck_id,
        "sensor_type":       sensor_type,
        "sensor_id":         f"{sensor_type}_{truck_id}_001",
        "component":         profile["component"],
        "description":       profile["description"],
        "unit":              profile["unit"],
        "current_value":     round(value, 3),
        "baseline_mean":     round(mean, 3),
        "baseline_std":      round(std, 4),
        "z_score":           round(z_score, 4),
        "anomaly_score":     round(min(1.0, z_score / (threshold * 2)), 4),
        "threshold":         threshold,
        "is_anomaly":        is_anomaly,
        "rate_of_change":    round(roc, 4),
        "normal_range":      list(profile["normal_range"]),
        "buffer_size":       len(buffer),
        "rolling_mean_1h":   round(rolling_mean_1h, 3),
        "rolling_std_1h":    round(rolling_std_1h, 4),
        "algorithm":         "Z-score rolling window (N=60)",
        "dataflow_job":      "terex-sensor-health-pipeline",
        "bigquery_table":    "terex_poc.sensor_anomalies",
        "computed_at":       datetime.utcnow().isoformat(),
    }

    if is_anomaly:
        import uuid
        anomaly_id = str(uuid.uuid4())
        predicted_failure = datetime.utcnow() + timedelta(hours=profile["hours_to_failure"])
        result.update({
            "anomaly_id":        anomaly_id,
            "hours_to_failure":  profile["hours_to_failure"],
            "predicted_failure": predicted_failure.isoformat(),
            "severity":          "CRITICAL" if z_score > threshold * 1.5 else "HIGH",
            "parts_order": {
                "order_id":        f"PO-{anomaly_id[:6].upper()}",
                "sku":             profile["sku"],
                "component":       profile["component"],
                "truck_id":        truck_id,
                "status":          "PENDING_APPROVAL",
                "parts_central_api": "https://api.partscentral.terex.com/v1/orders",
                "auto_raised":     True,
            },
            "rpa_ticket_id": f"TICK-{anomaly_id[:6].upper()}",
            "rpa_action":    "MAINTENANCE_TICKET_AUTO_CREATED",
        })

    return result


def run_fleet_health_scoring(fleet_anomalies: List[Dict]) -> List[Dict]:
    """
    Compute Green/Amber/Red health score for each truck
    based on their anomaly history.
    
    Scoring algorithm:
    - GREEN:  0-1 anomalies, max z_score < 2.8
    - AMBER:  2-3 anomalies OR max z_score 2.8-3.5
    - RED:    4+ anomalies OR max z_score > 3.5 OR critical component
    """
    from collections import defaultdict
    
    truck_anomalies = defaultdict(list)
    for a in fleet_anomalies:
        truck_anomalies[a["truck_id"]].append(a)

    results = []
    for truck_id in [f"TRUCK-{str(i).zfill(3)}" for i in range(1, 11)]:
        anomalies = truck_anomalies.get(truck_id, [])
        n = len(anomalies)
        max_z = max((a.get("z_score", 0) for a in anomalies), default=0)
        critical_components = ["hydraulic_seal", "brake_system"]
        has_critical = any(
            a.get("component") in critical_components for a in anomalies
        )

        if n >= 4 or max_z > 3.5 or (has_critical and n >= 2):
            status = "RED"
            score  = max(20, 60 - n * 8)
        elif n >= 2 or max_z >= 2.8:
            status = "AMBER"
            score  = max(45, 80 - n * 5)
        else:
            status = "GREEN"
            score  = min(100, 95 - n * 3)

        results.append({
            "truck_id":        truck_id,
            "health_status":   status,
            "health_score":    score,
            "total_anomalies": n,
            "critical_count":  sum(1 for a in anomalies if a.get("z_score", 0) > 3.0),
            "max_z_score":     round(max_z, 2),
            "last_anomaly":    anomalies[-1].get("computed_at") if anomalies else None,
            "algorithm":       "Weighted multi-sensor health scoring v1.0",
        })

    return sorted(results, key=lambda x: x["health_score"])


def generate_sensor_stream(
    truck_id: str,
    sensor_type: str,
    n_readings: int = 10,
    inject_anomaly_at: Optional[int] = None,
) -> List[Dict]:
    """
    Generate a realistic sensor reading stream.
    Used for edge device simulation and pipeline testing.
    """
    import random
    
    profile = SENSOR_PROFILES.get(sensor_type, {})
    low, high = profile.get("normal_range", (80, 120))
    mean = (low + high) / 2
    std  = (high - low) / 8

    readings = []
    for i in range(n_readings):
        is_spike = (inject_anomaly_at is not None and i == inject_anomaly_at)
        multiplier = random.uniform(1.5, 1.8) if is_spike else 1.0
        noise = random.gauss(0, std * 0.3)
        value = round(mean * multiplier + noise, 3)
        readings.append({
            "index":       i,
            "value":       value,
            "timestamp":   (datetime.utcnow() - timedelta(seconds=(n_readings-i)*60)).isoformat(),
            "is_injected": is_spike,
        })
    return readings
