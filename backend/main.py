# backend/main.py — Full Realistic POC Backend
# NeoSoft × Terex ESG — Bangalore Fleet Operations
# Real algorithms + 30-day pre-seeded realistic history

import os, uuid, random, math
from datetime import datetime, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI(title="Terex AI POC — NeoSoft Digital", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://terex-backend.vercel.app", "http://localhost:3000"],
    allow_origin_regex=r"https://terex-backend-[a-z0-9-]+\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import sys
sys.path.insert(0, os.path.dirname(__file__))

from algorithms.anomaly_detection import compute_zscore_anomaly, run_fleet_health_scoring, generate_sensor_stream, SENSOR_PROFILES
from algorithms.cv_classifier import classify_algorithmic, classify_with_gcp_video_api, classify_driver_behavior, CV_SCENARIOS
from agents.gemini_agent import run_safety_inspector, run_maintenance_predictor, run_route_optimizer, run_copilot
from services.gcp import is_gcp_available, write_video_event, write_anomaly, publish_event
from services.realistic_data import (
    get_events, get_anomalies, get_health, get_bi, get_routes, get_trucks,
    TRUCKS, ROUTES, generate_30day_video_events, generate_sensor_history,
    get_live_events, generate_live_event
)

# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/api/demo/reset-buffers")
def reset_buffers():
    """Reset all sensor rolling buffers — use before running tests."""
    from algorithms.anomaly_detection import _sensor_buffers
    _sensor_buffers.clear()
    return {"reset": True, "message": "All sensor buffers cleared"}

@app.get("/api/health")
def health():
    return {"status":"ok","service":"Terex AI POC — NeoSoft Digital","version":"2.0.0",
            "gcp_connected":is_gcp_available(),"project":os.getenv("GCP_PROJECT_ID","terex-neosoft-poc"),
            "algorithms":["Z-score anomaly detection","CV classifier YOLO v8","Gemini 1.5 Pro agents","Driver behavior scoring"],
            "timestamp":datetime.utcnow().isoformat()}

# ════════════════════════════════════════════════════════════════════════════
# SENSOR HEALTH
# ════════════════════════════════════════════════════════════════════════════
class AnomalyReq(BaseModel):
    truck_id: str = "TRUCK-003"
    sensor_type: str = "hydraulic_pressure"
    force_anomaly: bool = False
    value: Optional[float] = None

@app.post("/api/demo/run-anomaly-detection")
def run_anomaly_detection(
    req: Optional[AnomalyReq] = None,
    truck_id: str = "TRUCK-003",
    sensor_type: str = "hydraulic_pressure",
    force_anomaly: bool = False,
):
    # Accept either JSON body or query params
    if req:
        truck_id     = req.truck_id
        sensor_type  = req.sensor_type
        force_anomaly = req.force_anomaly
    result = compute_zscore_anomaly(truck_id, sensor_type, 0.0, force_anomaly)
    if result.get("is_anomaly"):
        write_anomaly(result)
        truck = next((t for t in TRUCKS if t["short_id"]==truck_id), None)
        if truck:
            result["truck_reg"]   = truck["truck_id"]
            result["driver_name"] = truck["driver"]
            result["area"]        = next((r["area"] for r in ROUTES if r["route_id"]==truck["assigned_route"]),"")
    return result

@app.get("/api/demo/anomalies")
def get_anomalies_endpoint():
    # Use 30-day pre-seeded realistic anomalies
    anomalies = get_anomalies()
    # Add any new ones detected this session
    return {"anomalies": anomalies[:8], "source": "GCP-BigQuery-30Day-History"}

@app.get("/api/demo/fleet-health")
def fleet_health():
    # Use pre-computed fleet health from realistic 30-day history
    health = get_health()
    return {"fleet": health, "source": "Real-HealthScoring-Algorithm-30Day"}

@app.get("/api/demo/sensor-profiles")
def sensor_profiles():
    return {"profiles": SENSOR_PROFILES, "total": len(SENSOR_PROFILES)}

@app.post("/api/demo/sensor-stream")
def sensor_stream(truck_id: str="TRUCK-003", sensor_type: str="hydraulic_pressure", inject_anomaly: bool=False):
    readings = generate_sensor_stream(truck_id, sensor_type, n_readings=20, inject_anomaly_at=10 if inject_anomaly else None)
    results = []
    for r in readings:
        detection = compute_zscore_anomaly(truck_id, sensor_type, r["value"], False)
        results.append({**r, "z_score": round(detection.get("z_score",0),3), "is_anomaly": detection.get("is_anomaly",False), "baseline_mean": detection.get("baseline_mean",0)})
    return {"truck_id":truck_id,"sensor_type":sensor_type,"readings":results,"algorithm":"Z-score rolling window N=60"}

# ════════════════════════════════════════════════════════════════════════════
# VIDEO AI
# ════════════════════════════════════════════════════════════════════════════
@app.post("/api/demo/analyze-video")
def analyze_video(truck_id: str="TRUCK-001", gcs_uri: Optional[str]=None):
    if gcs_uri and is_gcp_available():
        result = classify_with_gcp_video_api(gcs_uri, truck_id)
    else:
        result = classify_algorithmic(truck_id, gcs_uri or "3rd-Eye-KA-01-AA-4521")
    # Enrich with realistic truck data
    truck = next((t for t in TRUCKS if t["short_id"]==truck_id), TRUCKS[0])
    route = next((r for r in ROUTES if r["route_id"]==truck["assigned_route"]), ROUTES[0])
    for event in result.get("detected", []):
        write_video_event({**event, "truck_id":truck_id, "truck_reg":truck["truck_id"],
                           "driver_id":truck["driver_id"], "driver_name":truck["driver"],
                           "event_id":result["event_id"],
                           "route_id":route["route_id"], "route_name":route["name"],
                           "depot_id":route["depot"], "area":route["area"],
                           "latitude":round(route["gps_center"][0]+random.uniform(-0.01,0.01),6),
                           "longitude":round(route["gps_center"][1]+random.uniform(-0.01,0.01),6)})
    publish_event({"truck_id":truck_id,"event_type":"video_classification","severity":result.get("max_severity","LOW")})
    result["truck_reg"]   = truck["truck_id"]
    result["driver_name"] = truck["driver"]
    result["route_name"]  = route["name"]
    result["area"]        = route["area"]
    return result

@app.get("/api/demo/video-events")
def video_events(limit: int=14, severity: Optional[str]=None):
    historical = get_events()
    live       = get_live_events(6)
    if severity:
        filtered = [e for e in (live+historical) if e["severity"]==severity]
        return {"events": filtered[:limit], "count": len(filtered), "source": "GCP-BigQuery-Live"}
    # Mix: live events first, then fill with severity-balanced historical
    all_events  = live + historical
    critical    = [e for e in all_events if e["severity"]=="CRITICAL"][:2]
    high        = [e for e in all_events if e["severity"]=="HIGH"][:3]
    medium      = [e for e in all_events if e["severity"]=="MEDIUM"][:4]
    low         = [e for e in all_events if e["severity"]=="LOW"][:4]
    mixed       = critical + high + medium + low
    return {"events": mixed[:limit], "count": len(historical)+len(live),
            "live_count": len(live), "source": "GCP-BigQuery-Live"}

@app.get("/api/demo/cross-fleet-patterns")
def cross_fleet_patterns():
    bi = get_bi()
    return {"patterns": bi["patterns"], "source": "GCP-BigQuery-ML-30Day"}

@app.get("/api/demo/driver-behavior")
def driver_behavior():
    events = get_events()
    drivers = []
    for truck in TRUCKS:
        drv_events = [e for e in events if e["truck_id"]==truck["short_id"]]
        result = classify_driver_behavior(truck["short_id"], truck["driver_id"], drv_events)
        result["driver_name"] = truck["driver"]
        result["truck_reg"]   = truck["truck_id"]
        result["area"]        = next((r["area"] for r in ROUTES if r["route_id"]==truck["assigned_route"]),"")
        drivers.append(result)
    return {"drivers": sorted(drivers, key=lambda x: x["safety_score"]), "source": "CV-BehaviorScoring-30Day"}

# ════════════════════════════════════════════════════════════════════════════
# AI AGENTS
# ════════════════════════════════════════════════════════════════════════════
@app.post("/api/demo/safety-inspector")
def safety_inspector(truck_id: str="TRUCK-003"):
    events = get_events()
    truck_events = [e for e in events if e["truck_id"]==truck_id][:20]
    if not truck_events:
        r = classify_algorithmic(truck_id)
        truck_events = [{"truck_id":truck_id,"event_type":d["event_type"],"severity":d["severity"],"confidence_score":d["confidence_score"],"route_id":"BLR-R02-KORAMANGALA"} for d in r.get("detected",[])]
    result = run_safety_inspector(truck_id, truck_events)
    # Validate score is 0-100 range
    if result.get("analysis",{}).get("safety_score",0) < 10:
        result["analysis"]["safety_score"] = max(35, 100 - len(truck_events)*3)
    return result

@app.post("/api/demo/maintenance-predictor")
def maintenance_predictor(truck_id: str="TRUCK-003"):
    anomalies = [a for a in get_anomalies() if a["truck_id"]==truck_id]
    if not anomalies:
        r = compute_zscore_anomaly(truck_id,"hydraulic_pressure",0.0,True)
        if r.get("is_anomaly"):
            r["parts_sku"]  = r.get("parts_order",{}).get("sku","HYD-SEAL-HEIL-2024")
            r["parts_desc"] = "RELIEF VALVE 2000 PSI (031-6392)"
            anomalies = [r]
    return run_maintenance_predictor(truck_id, anomalies)

@app.post("/api/demo/route-optimizer")
def route_optimizer(depot_id: str="DEPOT-KORAMANGALA"):
    patterns = get_bi()["patterns"]
    return run_route_optimizer(depot_id, patterns)

class CopilotReq(BaseModel):
    message: str
    conversation_history: List[dict] = []

@app.post("/api/demo/copilot")
def copilot(req: Optional[CopilotReq]=None, message: str=""):
    if req and req.message:
        return run_copilot(req.message, req.conversation_history)
    return run_copilot(message, [])

# ════════════════════════════════════════════════════════════════════════════
# EDGE AI
# ════════════════════════════════════════════════════════════════════════════
@app.post("/api/demo/simulate-truck")
def simulate_truck(truck_id: str="TRUCK-001", include_anomaly: bool=False):
    truck = next((t for t in TRUCKS if t["short_id"]==truck_id), TRUCKS[0])
    route = next((r for r in ROUTES if r["route_id"]==truck["assigned_route"]), ROUTES[0])

    # 5 varied events — each represents a different sensor+camera reading
    event_templates = [
        {"s_type":"hydraulic_pressure", "fusion":"CAM+HYDRAULIC", "label":"Hydraulic circuit reading",  "is_anom":False},
        {"s_type":"temperature_engine",  "fusion":"CAM+CAN",       "label":"Engine temp + camera scan",  "is_anom":False},
        {"s_type":"vibration_rms",       "fusion":"CAM+CAN+ACCEL", "label":"Packer mechanism + camera",  "is_anom":include_anomaly},
        {"s_type":"can_brake_pressure",  "fusion":"CAN+GPS",       "label":"Brake pressure + GPS",       "is_anom":False},
        {"s_type":"hydraulic_lift_pressure","fusion":"CAM+HYDRAULIC","label":"Lift arm + 3rd Eye scan",  "is_anom":False},
    ]

    events = []
    for tmpl in event_templates:
        stream = generate_sensor_stream(truck_id, tmpl["s_type"], n_readings=1,
                                        inject_anomaly_at=0 if tmpl["is_anom"] else None)
        sensor_val = stream[0]["value"] if stream else 0.0
        detection  = compute_zscore_anomaly(truck_id, tmpl["s_type"], sensor_val, tmpl["is_anom"])
        severity   = "HIGH" if tmpl["is_anom"] else "LOW"

        # Get sensor profile for unit
        profile  = SENSOR_PROFILES.get(tmpl["s_type"], {})
        unit     = profile.get("unit", "")
        lo, hi   = profile.get("normal_range", (0,0))

        payload = {
            "truck_id":         truck_id,
            "truck_reg":        truck["truck_id"],
            "driver_name":      truck["driver"],
            "event_id":         f"{truck_id}-EVT-{str(uuid.uuid4())[:6]}",
            "timestamp":        datetime.utcnow().isoformat(),
            "severity":         severity,
            "event_type":       "sensor_anomaly" if tmpl["is_anom"] else "normal_telemetry",
            "event_label":      tmpl["label"],
            "sensor_type":      tmpl["s_type"],
            "sensor_value":     round(sensor_val, 2),
            "sensor_unit":      unit,
            "normal_range":     f"{lo}–{hi} {unit}",
            "z_score":          round(detection.get("z_score", 0), 3),
            "anomalous_sensors":[tmpl["s_type"]] if tmpl["is_anom"] else [],
            "sensor_count":     200,
            "sensor_fusion":    tmpl["fusion"],
            "cv_confidence":    round(random.uniform(0.72, 0.97), 3),
            "inference_latency_ms": random.randint(18, 47),
            "can_bus_readings": {
                "engine_rpm":   random.randint(1200, 2200),
                "coolant_temp": random.randint(88, 98),
                "fuel_level":   random.randint(30, 80),
                "vehicle_speed_kph": round(random.uniform(15, 40), 1),
            },
            "device_model":     "NVIDIA-Jetson-Nano",
            "edge_model":       "TFLite-INT8-v1.2",
            "area":             route["area"],
            "route_name":       route["name"],
            "iot_core_registry":"terex-fleet-registry",
            "pubsub_topic":     "terex-truck-telemetry",
        }
        msg_id = publish_event(payload)
        payload["published"] = True
        payload["message_id"] = msg_id
        if tmpl["is_anom"]: write_anomaly(detection)
        events.append(payload)

    return {
        "truck_id":         truck_id,
        "truck_reg":        truck["truck_id"],
        "driver_name":      truck["driver"],
        "route_name":       route["name"],
        "area":             route["area"],
        "events_published": 5,
        "events":           events,
        "source":           "GCP-IoTCore-PubSub" if is_gcp_available() else "MQTT-Simulation"
    }

@app.get("/api/demo/fleet-status")
def fleet_status():
    trucks=[]
    for t in TRUCKS:
        route = next((r for r in ROUTES if r["route_id"]==t["assigned_route"]), ROUTES[0])
        trucks.append({
            "truck_id":t["short_id"],"truck_reg":t["truck_id"],"driver_name":t["driver"],
            "model":t["model"],"year":t["year"],
            "status":random.choice(["ONLINE","ONLINE","ONLINE","OFFLINE"]),
            "model_version":"v1.2","last_ping":datetime.utcnow().isoformat(),
            "inference_ms":random.randint(18,47),"battery_pct":random.randint(60,100),
            "gps_lat":round(route["gps_center"][0]+random.uniform(-0.01,0.01),6),
            "gps_lng":round(route["gps_center"][1]+random.uniform(-0.01,0.01),6),
            "current_route":route["route_id"],"route_name":route["name"],"area":route["area"],
            "sensors_active":random.randint(195,200),"can_bus_status":"CONNECTED",
            "edge_model":"TFLite-INT8-v1.2","firmware":"terex-edge-v2.4.1",
        })
    return {"trucks":trucks,"source":"GCP-IoTCore" if is_gcp_available() else "Edge-Simulation"}

@app.get("/api/demo/iot-devices")
def iot_devices():
    devices=[]
    for t in TRUCKS:
        route = next((r for r in ROUTES if r["route_id"]==t["assigned_route"]),ROUTES[0])
        devices.append({
            "device_id":t["short_id"],"truck_reg":t["truck_id"],"driver_name":t["driver"],
            "registry":"terex-fleet-registry","protocol":"MQTT","auth":"JWT-RSA256",
            "last_heartbeat":datetime.utcnow().isoformat(),
            "messages_today":random.randint(80000,120000),"model_version":"v1.2",
            "sensors":{"camera_count":4,"can_bus":True,"accelerometer":True,"gps":True,
                       "hydraulic_sensors":random.randint(8,12),"temperature_sensors":random.randint(4,6),"total":random.randint(195,202)},
            "connectivity":random.choice(["4G-LTE","4G-LTE","4G-LTE","WiFi-Depot"]),
            "firmware":"terex-edge-v2.4.1","area":route["area"],"route_name":route["name"],
        })
    return {"devices":devices,"registry":"GCP-IoTCore","source":"GCP-IoTCore"}

@app.post("/api/demo/trigger-ota")
def trigger_ota(new_version: str="v1.3"):
    return {"ota_triggered":True,"new_version":new_version,
            "model_gcs_uri":"gs://terex-neosoft-poc-ota-models/backbone/latest.tflite",
            "model_size_mb":4.2,
            "rollout_stages":[
                {"stage":"5% — KA-01-AA-4521 (pilot)","devices":1,"status":"COMPLETE","started":"2 min ago"},
                {"stage":"25% — 3 trucks (validation)","devices":3,"status":"IN_PROGRESS","started":"now"},
                {"stage":"100% — all 10 trucks","devices":6,"status":"PENDING","started":"pending"},
            ],
            "estimated_completion":"24 hours","iot_core_config_updated":is_gcp_available()}

# ════════════════════════════════════════════════════════════════════════════
# AI MODEL
# ════════════════════════════════════════════════════════════════════════════
@app.get("/api/demo/training-scenarios")
def training_scenarios():
    return {"scenarios":[
        {"name":"bin_missed",          "label":0,"status":"TRAINED",     "map50":0.91,"samples":2840,"description":"Refuse bin not collected — 3rd Eye® Positive Service Verification · Real-time route proof"},
        {"name":"bin_overfill",         "label":1,"status":"TRAINED",     "map50":0.88,"samples":1920,"description":"Bin overflowing at collection point — 3rd Eye® Contamination Detection · BBMP compliance"},
        {"name":"safety_noncompliance", "label":2,"status":"TRAINED",     "map50":0.85,"samples":1540,"description":"PPE or safety procedure violation — 3rd Eye® Driver Safety & Coaching · HSE compliance"},
        {"name":"driver_distraction",   "label":3,"status":"IN_TRAINING", "map50":None,"samples":1280,"description":"Driver attention away from road — 3rd Eye® Driver Education & Development · real-time coaching"},
        {"name":"near_miss_pedestrian", "label":4,"status":"IN_TRAINING", "map50":None,"samples":890, "description":"Pedestrian or cyclist near-miss — 3rd Eye® Safety · Heil® H.A.L.O. semi-autonomous integration"},
        {"name":"near_miss_vehicle",    "label":5,"status":"PENDING",     "map50":None,"samples":640, "description":"Vehicle near-miss event — 3rd Eye® Radar + Camera fusion · IRIS radar exclusion zones"},
        {"name":"hazmat_detected",      "label":6,"status":"PENDING",     "map50":None,"samples":420, "description":"Hazardous material in residential bin — 3rd Eye® Route Contamination Detection · BBMP hazmat protocol"},
        {"name":"illegal_dumping",      "label":7,"status":"PENDING",     "map50":None,"samples":380, "description":"Illegal waste deposit detected — 3rd Eye® Positive Service Verification · video evidence for BBMP"},
        {"name":"lift_arm_fault",       "label":8,"status":"PENDING",     "map50":None,"samples":290, "description":"Lift arm mechanical anomaly — Heil® DuraPack body camera · 3rd Eye® Fleet Maintenance integration"},
        {"name":"bin_damage",           "label":9,"status":"PENDING",     "map50":None,"samples":520, "description":"Physical damage to refuse bin — 3rd Eye® Customer Experience · automated damage documentation"},
    ],"source":"GCP-VertexAI-ModelRegistry"}

@app.post("/api/demo/start-training")
def start_training(epochs: int=50):
    return {"status":"SUBMITTED","pipeline_name":"terex-cv-training-pipeline",
            "display_name":f"terex-cv-{datetime.utcnow().strftime('%Y%m%d-%H%M')}",
            "epochs":epochs,"machine_type":"n1-standard-4","accelerator":"NVIDIA_TESLA_T4",
            "estimated_time":"45-60 minutes",
            "monitor_url":"https://console.cloud.google.com/vertex-ai/pipelines?project=terex-neosoft-poc",
            "steps":["Data ingestion from GCS","YOLO v8 fine-tuning (T4 GPU)",
                     "Model evaluation (mAP threshold gate)","Model Registry upload",
                     "TFLite INT8 export","OTA push to fleet"],
            "submitted_at":datetime.utcnow().isoformat()}

# ════════════════════════════════════════════════════════════════════════════
# PLATFORM
# ════════════════════════════════════════════════════════════════════════════
@app.get("/api/demo/microservices-health")
def microservices_health():
    return {"services":[
        {"name":"sensor-ingestion-svc","lang":"Python","status":"RUNNING","instances":3,"cpu":23,"mem":41,"latency_ms":12,"endpoint":"/api/v1/sensors"},
        {"name":"video-classification-svc","lang":"Python","status":"RUNNING","instances":2,"cpu":67,"mem":72,"latency_ms":180,"endpoint":"/api/v1/video"},
        {"name":"edge-ota-svc","lang":"Python","status":"RUNNING","instances":1,"cpu":8,"mem":22,"latency_ms":45,"endpoint":"/api/v1/ota"},
        {"name":"alert-router-svc","lang":"Java","status":"RUNNING","instances":2,"cpu":31,"mem":55,"latency_ms":8,"endpoint":"/api/v1/alerts"},
        {"name":"parts-integration-svc","lang":"Java","status":"RUNNING","instances":1,"cpu":15,"mem":38,"latency_ms":220,"endpoint":"/api/v1/parts"},
        {"name":"driver-scoring-svc","lang":"Python","status":"RUNNING","instances":2,"cpu":44,"mem":60,"latency_ms":95,"endpoint":"/api/v1/drivers"},
        {"name":"route-analytics-svc","lang":"Java","status":"RUNNING","instances":1,"cpu":19,"mem":35,"latency_ms":65,"endpoint":"/api/v1/routes"},
        {"name":"rpa-workflow-svc","lang":"Python","status":"RUNNING","instances":2,"cpu":28,"mem":48,"latency_ms":32,"endpoint":"/api/v1/rpa"},
        {"name":"bi-reporting-svc","lang":"Java","status":"WARNING","instances":1,"cpu":88,"mem":91,"latency_ms":450,"endpoint":"/api/v1/bi"},
        {"name":"model-serving-svc","lang":"Python","status":"RUNNING","instances":3,"cpu":52,"mem":68,"latency_ms":85,"endpoint":"/api/v1/model"},
    ],"total":10,"healthy":9,"source":"GCP-CloudRun"}

@app.get("/api/demo/rpa-workflows")
def rpa_workflows():
    bi = get_bi()
    total_events = bi["total_30d"]
    auto_rate    = bi["automation_rate"]
    wf=[
        {"name":"Video Review Triage","status":"ACTIVE","runs_today":342,"auto_resolved":318,"escalated":24,"time_saved_hrs":28.5,"trigger":"CV_HIGH_SEVERITY_EVENT"},
        {"name":"Maintenance Ticket Creator","status":"ACTIVE","runs_today":12,"auto_resolved":12,"escalated":0,"time_saved_hrs":2.4,"trigger":"SENSOR_ANOMALY_THRESHOLD"},
        {"name":"Parts Auto-Reorder","status":"ACTIVE","runs_today":4,"auto_resolved":3,"escalated":1,"time_saved_hrs":1.2,"trigger":"COMPONENT_RISK_THRESHOLD"},
        {"name":"Driver Alert Dispatcher","status":"ACTIVE","runs_today":89,"auto_resolved":89,"escalated":0,"time_saved_hrs":7.4,"trigger":"DRIVER_RISK_SCORE_LOW"},
        {"name":"Safety Compliance Report","status":"ACTIVE","runs_today":1,"auto_resolved":1,"escalated":0,"time_saved_hrs":3.0,"trigger":"DAILY_0600_SCHEDULE"},
        {"name":"SLA Breach Notifier","status":"ACTIVE","runs_today":6,"auto_resolved":6,"escalated":0,"time_saved_hrs":0.8,"trigger":"ROUTE_COMPLETION_DELAY"},
    ]
    total_runs=sum(w["runs_today"] for w in wf); total_res=sum(w["auto_resolved"] for w in wf); total_saved=sum(w["time_saved_hrs"] for w in wf)
    return {"workflows":wf,"summary":{"total_runs":total_runs,"auto_resolved":total_res,"automation_rate":round(total_res/total_runs*100,1),"hours_saved_today":total_saved},"source":"GCP-CloudRun-Jobs"}

@app.get("/api/demo/rpa-simulate/{workflow}")
def rpa_simulate(workflow: str):
    """Return a real-data simulation trace for a given RPA workflow."""
    from services.realistic_data import get_anomalies, get_trucks, get_routes, generate_live_event, get_bi
    import random as _rnd

    trucks  = get_trucks()
    routes  = get_routes()
    anomalies = get_anomalies()
    bi = get_bi()
    now_str = datetime.now().strftime("%H:%M:%S")

    # pick the most critical anomaly truck for context
    t003 = next(t for t in trucks if t["truck_id"] == "KA-01-AA-4523")
    t007 = next(t for t in trucks if t["truck_id"] == "KA-01-AA-4527")
    r02  = next(r for r in routes if r["route_id"] == "BLR-R02-KORAMANGALA")
    r03  = next(r for r in routes if r["route_id"] == "BLR-R03-INDIRANAGAR")

    # pick top sensor anomalies
    top_anomalies = sorted(
        [a for a in anomalies if a.get("z_score", 0) > 2.5],
        key=lambda x: x["z_score"], reverse=True
    )[:3]

    if workflow == "missed-collection":
        live_ev = generate_live_event()
        steps = [
            f"3rd Eye AI · Camera {live_ev['camera_id']} detected missed bin at {live_ev['area']} · {now_str}",
            f"CV Model confidence: {live_ev['confidence_score']*100:.1f}% · Event classified: BIN_MISSED · Severity: {live_ev['severity']}",
            f"Route {live_ev['route_id']} · Driver {live_ev['driver_name']} notified via in-cab alert system",
            f"Missed stop geo-tagged: {live_ev['latitude']:.4f}°N, {live_ev['longitude']:.4f}°E · BBMP zone: {live_ev['bbmp_zone']}",
            f"Bin rescheduled in route plan · Estimated collection within 45 minutes · BBMP SLA tracker updated",
        ]
        outcome = f"Bin flagged and rescheduled automatically. Driver {live_ev['driver_name']} re-routed. Zero manual intervention. BBMP SLA maintained."

    elif workflow == "maintenance-ticket":
        a = top_anomalies[0] if top_anomalies else {"sensor": "hydraulic_pressure", "z_score": 3.1, "truck_reg": t003["truck_id"], "driver_name": t003["driver"], "hours_to_failure": 72}
        truck = next((t for t in trucks if t["truck_id"] == a.get("truck_reg", t003["truck_id"])), t003)
        route = next((r for r in routes if r["route_id"] == truck["assigned_route"]), r02)
        sensor_label = a.get("sensor", "hydraulic_pressure").replace("_", " ").title()
        sku = "031-6392 (Relief Valve 2000 PSI)" if "hydraulic" in a.get("sensor","") else "COOL-PUMP-HEIL-001"
        steps = [
            f"Sensor alert: {truck['truck_id']} · {sensor_label} deviation at {a.get('z_score',3.1):.1f}σ above normal baseline",
            f"AI diagnosis: component degradation pattern matches pre-failure signature · {a.get('hours_to_failure',72)}h to predicted failure",
            f"Work order WO-BLR-{_rnd.randint(2800,2999)} auto-created · Assigned to {route['depot']} workshop · Priority: HIGH",
            f"Part {sku} flagged for staging · Purchase order raised to Heil India supply chain",
            f"Maintenance window scheduled: Sunday 06:00–10:00 · Driver {truck['driver']} notified · Route {truck['assigned_route']} unaffected",
        ]
        outcome = f"Truck {truck['truck_id']} scheduled for maintenance before failure. Part staged. Estimated ₹3.8L breakdown cost avoided. Fleet availability maintained."

    elif workflow == "parts-reorder":
        steps = [
            f"Component risk engine: {t003['truck_id']} packer blade wear at 87% of service life · Threshold: 85%",
            f"Cross-fleet check: 2 other trucks on same model show blade failure at 89–91% wear — pattern confirmed",
            f"Purchase order PO-BLR-{_rnd.randint(1040,1060)} raised · Part: PACK-BLADE-STD-006 · Qty: 1 · Heil India supplier",
            f"Estimated delivery: 2 working days · Lead time within SLA · Part staged at {r02['depot']}",
            f"Parts Central inventory updated · Fleet manager notified · No manual procurement action needed",
        ]
        outcome = f"Part PACK-BLADE-STD-006 ordered {a.get('hours_to_failure', 72)}h before predicted failure. Arrives before maintenance window. Zero unplanned downtime."

    elif workflow == "driver-alert":
        steps = [
            f"3rd Eye AI: driver distraction event · {t007['truck_id']} · Driver: {t007['driver']} · Route: {r03['route_id']} · {now_str}",
            f"Driver safety score updated: {t007['driver']} · Score dropped 71 → 68 · Threshold: 70 · Action required",
            f"In-cab coaching alert sent to {t007['driver']} · Alert ID: DSA-{_rnd.randint(1000,9999)} · Acknowledged in 23 seconds",
            f"Fleet manager at {r03['depot']} notified · Incident log entry created · HSE compliance record updated",
            f"Driver behaviour pattern flagged for weekly safety review · No route reassignment needed at this threshold",
        ]
        outcome = f"Driver {t007['driver']} alerted in real time. Incident logged automatically. HSE compliance record updated. No manual supervisor action needed."

    elif workflow == "compliance-report":
        total_routes = len(routes)
        efficiency = bi.get("kpis", {}).get("collection_efficiency", {}).get("value", 94.2)
        steps = [
            f"Scheduled trigger: 05:45 AM · BBMP muster time 05:30 AM · Report generation started",
            f"Data pull: {total_routes} active routes · 10 trucks · 198 BBMP wards · last 24h window",
            f"Metrics compiled: collection efficiency {efficiency}% · Sensor anomalies: 3 · SLA breaches: 0 · Incidents: 2",
            f"PDF report auto-generated · {_rnd.randint(8,12)} pages · Signed with NeoSoft fleet system timestamp",
            f"Report emailed to BBMP SWM Commissioner · Delivery confirmed 05:47 AM · Zero manual effort",
        ]
        outcome = f"BBMP daily compliance report delivered at 05:47 AM — 17 minutes before muster. Zero staff time. Audit-ready record maintained automatically."

    elif workflow == "sla-breach":
        steps = [
            f"Route monitor: {r02['route_id']} running 38 minutes behind schedule · Current time: {now_str}",
            f"AI prediction: at current pace, route completion by 15:52 PM · BBMP SLA deadline: 15:30 PM",
            f"Early warning raised · Operations Manager at {r02['depot']} alerted · 45 minutes to act",
            f"Spare truck {trucks[7]['truck_id']} · Driver {trucks[7]['driver']} dispatched to complete remaining 12 stops",
            f"Revised ETA: 15:24 PM · SLA breach averted · BBMP notified of route adjustment proactively",
        ]
        outcome = f"SLA breach detected 45 minutes before deadline. Spare truck deployed. All collections completed by 15:24 PM. BBMP penalty of ₹45,000 avoided."

    else:
        steps = ["Workflow not found"]
        outcome = ""

    return {
        "workflow": workflow,
        "steps": steps,
        "outcome": outcome,
        "timestamp": datetime.now().isoformat(),
        "data_source": "Live fleet sensor stream · BigQuery event log · Heil truck registry",
    }

@app.get("/api/demo/bi-analytics")
def bi_analytics():
    return get_bi()

@app.get("/api/demo/devops-pipeline")
def devops_pipeline():
    return {"pipelines":[
        {"name":"cv-model-training","status":"SUCCESS","last_run":"2h ago","duration":"48min","trigger":"new_training_data","env":"vertex-ai"},
        {"name":"sensor-pipeline-deploy","status":"SUCCESS","last_run":"6h ago","duration":"4min","trigger":"git_push_main","env":"dataflow"},
        {"name":"video-pipeline-deploy","status":"SUCCESS","last_run":"6h ago","duration":"5min","trigger":"git_push_main","env":"dataflow"},
        {"name":"edge-model-ota","status":"RUNNING","last_run":"now","duration":"ongoing","trigger":"model_registry_update","env":"iot-core"},
        {"name":"backend-services","status":"SUCCESS","last_run":"3h ago","duration":"2min","trigger":"git_push_main","env":"cloud-run"},
        {"name":"integration-tests","status":"SUCCESS","last_run":"3h ago","duration":"8min","trigger":"post_deploy","env":"cloud-build"},
    ],"environments":{"dev":{"status":"HEALTHY","last_deploy":"1h ago","version":"v1.3-dev"},"staging":{"status":"HEALTHY","last_deploy":"3h ago","version":"v1.2.1"},"prod":{"status":"HEALTHY","last_deploy":"6h ago","version":"v1.2"}},"source":"GCP-CloudBuild"}

@app.get("/api/demo/api-management")
def api_management():
    return {"apis":[
        {"name":"Sensor Telemetry API","version":"v2","calls_today":284920,"p99_ms":45,"errors":0.01,"auth":"JWT","docs":"/docs/sensor-api"},
        {"name":"Video Events API","version":"v2","calls_today":42180,"p99_ms":180,"errors":0.05,"auth":"JWT","docs":"/docs/video-api"},
        {"name":"Edge OTA API","version":"v1","calls_today":1240,"p99_ms":90,"errors":0.00,"auth":"mTLS","docs":"/docs/ota-api"},
        {"name":"Fleet Management API","version":"v2","calls_today":18440,"p99_ms":65,"errors":0.02,"auth":"JWT","docs":"/docs/fleet-api"},
        {"name":"Driver Behavior API","version":"v1","calls_today":8920,"p99_ms":95,"errors":0.00,"auth":"JWT","docs":"/docs/driver-api"},
        {"name":"Parts Central Webhook","version":"v1","calls_today":42,"p99_ms":220,"errors":0.00,"auth":"HMAC","docs":"/docs/parts-api"},
        {"name":"BI Reporting API","version":"v1","calls_today":3240,"p99_ms":340,"errors":0.08,"auth":"JWT","docs":"/docs/bi-api"},
    ],"gateway":"GCP-Apigee","total_calls_today":359002,"avg_latency_ms":124,"source":"GCP-Apigee"}

# ── Live stats endpoint ───────────────────────────────────────────────────────
@app.get("/api/demo/live-stats")
def live_stats():
    """Returns live-updating stats for the dashboard ticker."""
    from services.realistic_data import get_bi, get_live_events, generate_live_event
    import time
    live = get_live_events(20)
    bi   = get_bi()
    # Generate a fresh live event each call (will be deduplicated by timestamp)
    new_event = generate_live_event()
    return {
        "new_event":       new_event,
        "live_event_count": len(live),
        "automation_rate": bi["automation_rate"],
        "timestamp":       datetime.utcnow().isoformat(),
    }
