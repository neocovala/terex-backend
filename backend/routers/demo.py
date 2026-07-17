# backend/routers/demo.py
# Full POC — covers ALL of Dinesh's requirements from the meeting
# Microservices · CV scenarios · Embedded · BI · DevOps · RPA · API Mgmt

from fastapi import APIRouter
from datetime import datetime, timedelta
import random, uuid, json

router = APIRouter()

TRUCKS  = [f"TRUCK-{str(i).zfill(3)}" for i in range(1, 11)]
ROUTES  = ["R-001-WESTSIDE","R-002-NORTHGATE","R-003-DOWNTOWN","R-004-EASTPARK"]
DEPOTS  = ["DEPOT-BLR-01","DEPOT-BLR-02"]
DRIVERS = [f"DRV-{str(i).zfill(3)}" for i in range(1,11)]

# ── 1. Fleet health ───────────────────────────────────────────────────────────
@router.get("/fleet-health")
def fleet_health():
    statuses = ["GREEN","GREEN","GREEN","AMBER","AMBER","RED"]
    fleet = []
    for t in TRUCKS:
        s = random.choice(statuses)
        fleet.append({
            "truck_id": t, "health_status": s,
            "health_score": {"GREEN":92,"AMBER":65,"RED":32}[s]+random.randint(-4,4),
            "total_anomalies": {"GREEN":1,"AMBER":4,"RED":8}[s]+random.randint(0,2),
            "critical_count": {"GREEN":0,"AMBER":1,"RED":3}[s],
            "last_anomaly": (datetime.utcnow()-timedelta(hours=random.randint(1,48))).isoformat(),
            "model_version": "v1.2",
            "driver_id": random.choice(DRIVERS),
            "current_route": random.choice(ROUTES),
            "sensors_online": random.randint(195,200),
        })
    return {"fleet": fleet, "source": "GCP-BigQuery"}

# ── 2. Video events ───────────────────────────────────────────────────────────
@router.get("/video-events")
def video_events():
    types = [
        ("near_miss_pedestrian","CRITICAL",0.05),("hazmat_detected","CRITICAL",0.03),
        ("safety_noncompliance","HIGH",0.10),("illegal_dumping","HIGH",0.05),
        ("lift_arm_fault","HIGH",0.07),("driver_distraction","MEDIUM",0.20),
        ("bin_overfill","MEDIUM",0.15),("bin_missed","LOW",0.25),("bin_damage","LOW",0.10),
    ]
    events = []
    for i in range(14):
        et,sev,_ = random.choices(types, weights=[t[2] for t in types], k=1)[0]
        events.append({
            "event_id": str(uuid.uuid4())[:8],
            "truck_id": random.choice(TRUCKS),
            "driver_id": random.choice(DRIVERS),
            "event_type": et, "severity": sev,
            "confidence_score": round(random.uniform(0.74,0.98),2),
            "event_timestamp": (datetime.utcnow()-timedelta(minutes=random.randint(1,180))).isoformat(),
            "route_id": random.choice(ROUTES),
            "depot_id": random.choice(DEPOTS),
            "model_version": "v1.2",
            "reviewed_by_human": sev in ("HIGH","CRITICAL") and random.random()>0.4,
            "rpa_processed": True,
        })
    return {"events": sorted(events, key=lambda x: x["event_timestamp"], reverse=True), "count": len(events), "source": "GCP-BigQuery"}

# ── 3. Anomaly detection ──────────────────────────────────────────────────────
@router.get("/anomalies")
def anomalies():
    components = [
        ("hydraulic_pressure","hydraulic_seal",2.9,72,"bar",182,241),
        ("vibration_rms","packer_blade",3.4,48,"g",0.8,1.52),
        ("temperature_engine","cooling_system",2.7,96,"C",92,108),
        ("hydraulic_lift_pressure","lift_arm",3.1,60,"bar",150,198),
    ]
    result = []
    for i,(sensor,comp,zscore,hrs,unit,base,curr) in enumerate(components):
        result.append({
            "anomaly_id": str(uuid.uuid4())[:8],
            "truck_id": TRUCKS[i],
            "sensor_type": sensor, "component": comp,
            "z_score": zscore, "anomaly_score": round(min(1.0,zscore/6),2),
            "hours_to_failure": hrs,
            "baseline_value": base, "current_value": curr, "unit": unit,
            "detected_at": (datetime.utcnow()-timedelta(hours=random.randint(1,12))).isoformat(),
            "predicted_failure": (datetime.utcnow()+timedelta(hours=hrs)).isoformat(),
            "alert_sent": True,
            "parts_order_id": f"PO-{str(uuid.uuid4())[:6].upper()}",
            "model_version": "v1.0",
        })
    return {"anomalies": result, "source": "GCP-BigQuery"}

# ── 4. Fleet status (edge devices) ───────────────────────────────────────────
@router.get("/fleet-status")
def fleet_status():
    trucks = []
    for t in TRUCKS:
        trucks.append({
            "truck_id": t,
            "status": random.choice(["ONLINE","ONLINE","ONLINE","OFFLINE"]),
            "model_version": "v1.2",
            "last_ping": datetime.utcnow().isoformat(),
            "inference_ms": random.randint(18,47),
            "battery_pct": random.randint(60,100),
            "gps_lat": round(12.9716+random.uniform(-0.05,0.05),6),
            "gps_lng": round(77.5946+random.uniform(-0.05,0.05),6),
            "current_route": random.choice(ROUTES),
            "sensors_active": random.randint(195,200),
            "can_bus_status": "CONNECTED",
            "edge_model": "TFLite-INT8-v1.2",
        })
    return {"trucks": trucks, "source": "GCP-IoTCore"}

# ── 5. Cross-fleet pattern mining ────────────────────────────────────────────
@router.get("/cross-fleet-patterns")
def cross_fleet_patterns():
    patterns = []
    for r in ROUTES:
        total = random.randint(25,90)
        high  = random.randint(4,22)
        patterns.append({
            "route_id": r, "depot_id": random.choice(DEPOTS),
            "total_events": total, "high_severity_events": high,
            "pedestrian_near_misses": random.randint(0,5),
            "hazmat_events": random.randint(0,2),
            "driver_fatigue_events": random.randint(0,4),
            "risk_rate": round(high/total,3),
            "avg_confidence": round(random.uniform(0.78,0.95),3),
        })
    return {"patterns": sorted(patterns, key=lambda x: x["risk_rate"], reverse=True), "source": "GCP-BigQuery-ML"}

# ── 6. CV scenario analysis ───────────────────────────────────────────────────
@router.get("/training-scenarios")
def training_scenarios():
    return {
        "scenarios": [
            {"name":"bin_missed",           "label":0,"status":"TRAINED",     "map50":0.91,"samples":2840,"description":"Refuse bin not collected on route"},
            {"name":"bin_overfill",          "label":1,"status":"TRAINED",     "map50":0.88,"samples":1920,"description":"Bin overflowing at collection point"},
            {"name":"safety_noncompliance",  "label":2,"status":"TRAINED",     "map50":0.85,"samples":1540,"description":"PPE or safety procedure violation"},
            {"name":"driver_distraction",    "label":3,"status":"IN_TRAINING", "map50":None, "samples":1280,"description":"Driver attention away from road"},
            {"name":"near_miss_pedestrian",  "label":4,"status":"IN_TRAINING", "map50":None, "samples":890, "description":"Pedestrian or cyclist near-miss"},
            {"name":"near_miss_vehicle",     "label":5,"status":"PENDING",     "map50":None, "samples":640, "description":"Vehicle near-miss event"},
            {"name":"hazmat_detected",       "label":6,"status":"PENDING",     "map50":None, "samples":420, "description":"Hazardous material in bin"},
            {"name":"illegal_dumping",       "label":7,"status":"PENDING",     "map50":None, "samples":380, "description":"Illegal waste deposit"},
            {"name":"lift_arm_fault",        "label":8,"status":"PENDING",     "map50":None, "samples":290, "description":"Lift arm mechanical anomaly"},
            {"name":"bin_damage",            "label":9,"status":"PENDING",     "map50":None, "samples":520, "description":"Physical damage to refuse bin"},
        ],
        "source": "GCP-VertexAI"
    }

# ── 7. Analyze video ──────────────────────────────────────────────────────────
@router.post("/analyze-video")
def analyze_video(truck_id: str = "TRUCK-001"):
    events = [
        {"event_type":"near_miss_pedestrian","confidence_score":0.94,"severity":"CRITICAL","frame":"00:02:14"},
        {"event_type":"safety_noncompliance","confidence_score":0.87,"severity":"HIGH",    "frame":"00:05:41"},
        {"event_type":"driver_distraction",  "confidence_score":0.81,"severity":"MEDIUM",  "frame":"00:08:22"},
        {"event_type":"bin_missed",          "confidence_score":0.76,"severity":"LOW",      "frame":"00:11:07"},
    ]
    selected = random.sample(events, random.randint(1,3))
    return {
        "event_id": str(uuid.uuid4())[:8],
        "truck_id": truck_id,
        "driver_id": random.choice(DRIVERS),
        "detected": selected,
        "total": len(selected),
        "critical": [e for e in selected if e["severity"]=="CRITICAL"],
        "timestamp": datetime.utcnow().isoformat(),
        "processing_ms": random.randint(180,420),
        "model_version": "v1.2",
        "rpa_action": "AUTO_ROUTED_TO_REVIEW_QUEUE" if any(e["severity"] in ("CRITICAL","HIGH") for e in selected) else "AUTO_RESOLVED",
        "bq_written": True,
        "pubsub_published": True,
        "source": "GCP-VideoIntelligenceAPI",
    }

# ── 8. Anomaly detection run ──────────────────────────────────────────────────
@router.post("/run-anomaly-detection")
def run_anomaly_detection(truck_id: str="TRUCK-003", sensor_type: str="hydraulic_pressure", force_anomaly: bool=True):
    configs = {
        "hydraulic_pressure":      (182,5,  "hydraulic_seal",  72,"bar"),
        "vibration_rms":           (0.8,0.1,"packer_blade",    48,"g"),
        "temperature_engine":      (92, 3,  "cooling_system",  96,"C"),
        "hydraulic_lift_pressure": (150,8,  "lift_arm",        60,"bar"),
        "can_brake_pressure":      (8,  1,  "brake_system",    48,"bar"),
    }
    base,std,comp,hrs,unit = configs.get(sensor_type,(100,5,"generic",72,"unit"))
    multiplier = random.uniform(1.5,1.8) if force_anomaly else 1.0
    current = round(base*multiplier+random.gauss(0,std),2)
    zscore  = round(abs((current-base)/std),2)
    is_anom = zscore>=2.5 or force_anomaly
    result = {
        "truck_id": truck_id, "sensor_type": sensor_type,
        "component": comp, "unit": unit,
        "baseline_value": base, "current_value": current,
        "z_score": zscore, "is_anomaly": is_anom,
        "anomaly_score": round(min(1.0,zscore/6),2),
        "threshold": 2.5, "source": "GCP-Dataflow-ZScore",
        "dataflow_job": "terex-sensor-health-pipeline",
        "bigquery_table": "terex_poc.sensor_anomalies",
    }
    if is_anom:
        result.update({
            "anomaly_id": str(uuid.uuid4())[:8],
            "hours_to_failure": hrs,
            "predicted_failure": (datetime.utcnow()+timedelta(hours=hrs)).isoformat(),
            "bq_written": True,
            "pubsub_alert_sent": True,
            "parts_order": {
                "order_id": f"PO-{str(uuid.uuid4())[:6].upper()}",
                "sku": f"PART-{comp.upper()[:8]}-001",
                "component": comp, "truck_id": truck_id,
                "status": "PENDING_APPROVAL",
                "parts_central_api": "https://api.partscentral.terex.com/v1/orders",
            },
            "rpa_action": "MAINTENANCE_TICKET_CREATED",
            "rpa_ticket_id": f"TICK-{str(uuid.uuid4())[:6].upper()}",
        })
    return result

# ── 9. Simulate truck edge device ─────────────────────────────────────────────
@router.post("/simulate-truck")
def simulate_truck(truck_id: str="TRUCK-001", include_anomaly: bool=False):
    events = []
    for i in range(5):
        is_anom = include_anomaly and i==2
        events.append({
            "truck_id": truck_id,
            "event_id": f"{truck_id}-EVT-{str(uuid.uuid4())[:6]}",
            "timestamp": datetime.utcnow().isoformat(),
            "severity": "HIGH" if is_anom else "LOW",
            "event_type": "sensor_anomaly" if is_anom else "normal_telemetry",
            "cv_confidence": round(random.uniform(0.72,0.97),3),
            "anomalous_sensors": ["hydraulic_pressure","vibration_rms"] if is_anom else [],
            "sensor_count": 200,
            "can_bus_readings": {"engine_rpm":random.randint(800,2200),"coolant_temp":random.randint(85,105),"fuel_level":random.randint(20,80)},
            "speed_kph": round(random.uniform(15,45),1),
            "inference_latency_ms": random.randint(18,47),
            "device_model": "NVIDIA-Jetson-Nano",
            "edge_model": "TFLite-INT8-v1.2",
            "sensor_fusion": "CAMERA+ACCELEROMETER+HYDRAULIC+GPS",
            "published": True,
            "message_id": str(uuid.uuid4())[:8],
            "iot_core_registry": "terex-fleet-registry",
            "pubsub_topic": "terex-truck-telemetry",
        })
    return {"truck_id": truck_id, "events_published": 5, "events": events, "source": "GCP-IoTCore-PubSub"}

# ── 10. Driver behavior scoring ───────────────────────────────────────────────
@router.get("/driver-behavior")
def driver_behavior():
    drivers = []
    for d in DRIVERS:
        score = random.randint(42,98)
        drivers.append({
            "driver_id": d,
            "truck_id": random.choice(TRUCKS),
            "safety_score": score,
            "risk_level": "HIGH" if score<60 else "MEDIUM" if score<75 else "LOW",
            "distraction_events": random.randint(0,8),
            "near_miss_events": random.randint(0,3),
            "harsh_braking": random.randint(0,12),
            "speeding_events": random.randint(0,5),
            "shift_hours": round(random.uniform(4,9),1),
            "fatigue_score": round(random.uniform(0.1,0.9),2),
            "last_updated": datetime.utcnow().isoformat(),
            "retraining_required": score<65,
        })
    return {"drivers": sorted(drivers, key=lambda x: x["safety_score"]), "source": "GCP-VertexAI-BehaviorModel"}

# ── 11. Microservices health ──────────────────────────────────────────────────
@router.get("/microservices-health")
def microservices_health():
    services = [
        {"name":"sensor-ingestion-svc",    "lang":"Python","status":"RUNNING","instances":3,"cpu":23,"mem":41,"latency_ms":12, "endpoint":"/api/v1/sensors"},
        {"name":"video-classification-svc","lang":"Python","status":"RUNNING","instances":2,"cpu":67,"mem":72,"latency_ms":180,"endpoint":"/api/v1/video"},
        {"name":"edge-ota-svc",            "lang":"Python","status":"RUNNING","instances":1,"cpu":8, "mem":22,"latency_ms":45, "endpoint":"/api/v1/ota"},
        {"name":"alert-router-svc",        "lang":"Java",  "status":"RUNNING","instances":2,"cpu":31,"mem":55,"latency_ms":8,  "endpoint":"/api/v1/alerts"},
        {"name":"parts-integration-svc",   "lang":"Java",  "status":"RUNNING","instances":1,"cpu":15,"mem":38,"latency_ms":220,"endpoint":"/api/v1/parts"},
        {"name":"driver-scoring-svc",      "lang":"Python","status":"RUNNING","instances":2,"cpu":44,"mem":60,"latency_ms":95, "endpoint":"/api/v1/drivers"},
        {"name":"route-analytics-svc",     "lang":"Java",  "status":"RUNNING","instances":1,"cpu":19,"mem":35,"latency_ms":65, "endpoint":"/api/v1/routes"},
        {"name":"rpa-workflow-svc",        "lang":"Python","status":"RUNNING","instances":2,"cpu":28,"mem":48,"latency_ms":32, "endpoint":"/api/v1/rpa"},
        {"name":"bi-reporting-svc",        "lang":"Java",  "status":"WARNING","instances":1,"cpu":88,"mem":91,"latency_ms":450,"endpoint":"/api/v1/bi"},
        {"name":"model-serving-svc",       "lang":"Python","status":"RUNNING","instances":3,"cpu":52,"mem":68,"latency_ms":85, "endpoint":"/api/v1/model"},
    ]
    return {"services": services, "total": len(services), "healthy": len([s for s in services if s["status"]=="RUNNING"]), "source": "GCP-CloudRun-K8s"}

# ── 12. RPA workflows ─────────────────────────────────────────────────────────
@router.get("/rpa-workflows")
def rpa_workflows():
    workflows = [
        {"name":"Video Review Triage",       "status":"ACTIVE","runs_today":342,"auto_resolved":318,"escalated":24, "time_saved_hrs":28.5,"trigger":"CV_HIGH_SEVERITY_EVENT"},
        {"name":"Maintenance Ticket Creator","status":"ACTIVE","runs_today":12, "auto_resolved":12, "escalated":0,  "time_saved_hrs":2.4, "trigger":"SENSOR_ANOMALY_THRESHOLD"},
        {"name":"Parts Auto-Reorder",        "status":"ACTIVE","runs_today":4,  "auto_resolved":3,  "escalated":1,  "time_saved_hrs":1.2, "trigger":"COMPONENT_RISK_THRESHOLD"},
        {"name":"Driver Alert Dispatcher",   "status":"ACTIVE","runs_today":89, "auto_resolved":89, "escalated":0,  "time_saved_hrs":7.4, "trigger":"DRIVER_RISK_SCORE_LOW"},
        {"name":"Safety Compliance Report",  "status":"ACTIVE","runs_today":1,  "auto_resolved":1,  "escalated":0,  "time_saved_hrs":3.0, "trigger":"DAILY_0600_SCHEDULE"},
        {"name":"SLA Breach Notifier",       "status":"ACTIVE","runs_today":6,  "auto_resolved":6,  "escalated":0,  "time_saved_hrs":0.8, "trigger":"ROUTE_COMPLETION_DELAY"},
    ]
    total_runs = sum(w["runs_today"] for w in workflows)
    total_resolved = sum(w["auto_resolved"] for w in workflows)
    total_saved = sum(w["time_saved_hrs"] for w in workflows)
    return {"workflows": workflows, "summary": {"total_runs": total_runs, "auto_resolved": total_resolved, "automation_rate": round(total_resolved/total_runs*100,1), "hours_saved_today": total_saved}, "source": "GCP-CloudRun-RPA"}

# ── 13. BI analytics ──────────────────────────────────────────────────────────
@router.get("/bi-analytics")
def bi_analytics():
    return {
        "kpis": {
            "collection_efficiency": {"value":94.2,"unit":"%","trend":"UP","vs_last_week":+2.1},
            "ai_automation_rate":    {"value":94.0,"unit":"%","trend":"UP","vs_last_week":+8.3},
            "mean_time_to_detect":   {"value":4.2, "unit":"min","trend":"DOWN","vs_last_week":-12.5},
            "unplanned_downtime":    {"value":1.8, "unit":"hrs/week","trend":"DOWN","vs_last_week":-34.0},
            "manual_review_hours":   {"value":2.1, "unit":"hrs/day","trend":"DOWN","vs_last_week":-87.0},
            "parts_stockout_rate":   {"value":0.0, "unit":"%","trend":"FLAT","vs_last_week":0},
        },
        "weekly_events": [
            {"day":"Mon","critical":8,"high":23,"medium":41,"low":89},
            {"day":"Tue","critical":5,"high":19,"medium":38,"low":92},
            {"day":"Wed","critical":12,"high":31,"medium":44,"low":78},
            {"day":"Thu","critical":3,"high":14,"medium":29,"low":101},
            {"day":"Fri","critical":7,"high":22,"medium":37,"low":88},
            {"day":"Sat","critical":2,"high":9, "medium":18,"low":45},
            {"day":"Sun","critical":1,"high":6, "medium":12,"low":32},
        ],
        "top_insights": [
            "Route R-002-NORTHGATE has 3x fleet-average pedestrian near-miss rate — recommend 06:30 shift",
            "TRUCK-007 packer blade predicted to fail in 43hrs — Parts order PO-VIB-0088 pending approval",
            "Driver DRV-004 safety score dropped 18pts this week — retraining flagged",
            "AI automation rate improved from 86% → 94% after model v1.2 deployment",
        ],
        "source": "GCP-BigQuery-BI"
    }

# ── 14. DevOps pipeline ───────────────────────────────────────────────────────
@router.get("/devops-pipeline")
def devops_pipeline():
    return {
        "pipelines": [
            {"name":"cv-model-training",    "status":"SUCCESS","last_run":"2h ago","duration":"48min","trigger":"new_training_data","env":"vertex-ai"},
            {"name":"sensor-pipeline-deploy","status":"SUCCESS","last_run":"6h ago","duration":"4min", "trigger":"git_push_main",    "env":"dataflow"},
            {"name":"video-pipeline-deploy", "status":"SUCCESS","last_run":"6h ago","duration":"5min", "trigger":"git_push_main",    "env":"dataflow"},
            {"name":"edge-model-ota",        "status":"RUNNING","last_run":"now",   "duration":"ongoing","trigger":"model_registry_update","env":"iot-core"},
            {"name":"backend-services",      "status":"SUCCESS","last_run":"3h ago","duration":"2min", "trigger":"git_push_main",    "env":"cloud-run"},
            {"name":"integration-tests",     "status":"SUCCESS","last_run":"3h ago","duration":"8min", "trigger":"post_deploy",      "env":"cloud-build"},
        ],
        "environments": {
            "dev":  {"status":"HEALTHY","last_deploy":"1h ago", "version":"v1.3-dev"},
            "staging":{"status":"HEALTHY","last_deploy":"3h ago","version":"v1.2.1"},
            "prod": {"status":"HEALTHY","last_deploy":"6h ago", "version":"v1.2"},
        },
        "source": "GCP-CloudBuild-CloudRun"
    }

# ── 15. API management ────────────────────────────────────────────────────────
@router.get("/api-management")
def api_management():
    return {
        "apis": [
            {"name":"Sensor Telemetry API",    "version":"v2","calls_today":284920,"p99_ms":45, "errors":0.01,"auth":"JWT","docs":"/docs/sensor-api"},
            {"name":"Video Events API",        "version":"v2","calls_today":42180, "p99_ms":180,"errors":0.05,"auth":"JWT","docs":"/docs/video-api"},
            {"name":"Edge OTA API",            "version":"v1","calls_today":1240,  "p99_ms":90, "errors":0.00,"auth":"mTLS","docs":"/docs/ota-api"},
            {"name":"Fleet Management API",    "version":"v2","calls_today":18440, "p99_ms":65, "errors":0.02,"auth":"JWT","docs":"/docs/fleet-api"},
            {"name":"Driver Behavior API",     "version":"v1","calls_today":8920,  "p99_ms":95, "errors":0.00,"auth":"JWT","docs":"/docs/driver-api"},
            {"name":"Parts Central Webhook",   "version":"v1","calls_today":42,    "p99_ms":220,"errors":0.00,"auth":"HMAC","docs":"/docs/parts-api"},
            {"name":"BI Reporting API",        "version":"v1","calls_today":3240,  "p99_ms":340,"errors":0.08,"auth":"JWT","docs":"/docs/bi-api"},
        ],
        "gateway": "GCP-Apigee",
        "total_calls_today": 359002,
        "avg_latency_ms": 124,
        "source": "GCP-Apigee-Analytics"
    }

# ── 16. IoT devices ───────────────────────────────────────────────────────────
@router.get("/iot-devices")
def iot_devices():
    devices = []
    for t in TRUCKS:
        devices.append({
            "device_id": t,
            "registry": "terex-fleet-registry",
            "protocol": "MQTT",
            "auth": "JWT-RSA256",
            "last_heartbeat": datetime.utcnow().isoformat(),
            "messages_today": random.randint(80000,120000),
            "model_version": "v1.2",
            "sensors": {
                "camera_count": 4,
                "can_bus": True,
                "accelerometer": True,
                "gps": True,
                "hydraulic_sensors": random.randint(8,12),
                "temperature_sensors": random.randint(4,6),
                "total": random.randint(195,202),
            },
            "connectivity": random.choice(["4G-LTE","4G-LTE","4G-LTE","WiFi-Depot"]),
            "firmware": "terex-edge-v2.4.1",
        })
    return {"devices": devices, "registry": "GCP-IoTCore", "source": "GCP-IoTCore"}

# ── 17. OTA trigger ───────────────────────────────────────────────────────────
@router.post("/trigger-ota")
def trigger_ota(new_version: str="v1.3"):
    return {
        "ota_triggered": True, "new_version": new_version,
        "model_gcs_uri": "gs://terex-neosoft-poc-ota-models/backbone/latest.tflite",
        "model_size_mb": 4.2,
        "rollout_stages": [
            {"stage":"5% fleet — 1 truck",  "devices":1,"status":"COMPLETE",    "started":"2 min ago"},
            {"stage":"25% fleet — 3 trucks", "devices":3,"status":"IN_PROGRESS", "started":"now"},
            {"stage":"100% fleet — 10 trucks","devices":6,"status":"PENDING",    "started":"pending"},
        ],
        "estimated_completion": "24 hours",
        "iot_core_config_updated": True,
        "source": "GCP-IoTCore-OTA"
    }

# ── 18. AI Agent: Safety Inspector ───────────────────────────────────────────
@router.post("/safety-inspector")
def safety_inspector(truck_id: str="TRUCK-003"):
    return {
        "agent": "Safety Inspector",
        "model": "Vertex AI Gemini 1.5 Pro",
        "truck_id": truck_id,
        "events_analyzed": 23,
        "source": "GCP-VertexAI-Gemini",
        "analysis": {
            "safety_score": 62,
            "top_risks": [
                {"risk":"Pedestrian near-miss","frequency":"3 events / 7 days","route":"R-002-NORTHGATE","severity":"CRITICAL"},
                {"risk":"Driver distraction", "frequency":"5 events this week","shift":"morning 07:00-09:00","severity":"HIGH"},
                {"risk":"PPE non-compliance", "frequency":"2 events","location":"Depot entry gate","severity":"HIGH"},
            ],
            "root_causes": [
                "R-002-NORTHGATE school zone active 08:00-09:00 — truck dispatched at 08:15",
                "Driver fatigue score 0.78 — above 0.7 threshold — shift started 05:30",
                "Depot gate camera blind spot — PPE detection model not covering entry angle",
            ],
            "recommendations": [
                "Shift R-002-NORTHGATE collection from 08:15 → 06:30 — avoids school zone entirely",
                "Flag driver for fatigue review — 5 distraction events correlate with early shift start",
                "Reposition depot entry camera 15° — closes CV blind spot",
            ],
            "trend": "DETERIORATING — safety score dropped 78 → 62 over past 14 days",
            "summary": "TRUCK-003 requires immediate intervention. Pedestrian near-miss rate is 3x fleet average on Route R-002. Root cause is timing overlap with school zone.",
        },
        "generated_at": datetime.utcnow().isoformat(),
    }

# ── 19. AI Agent: Maintenance Predictor ──────────────────────────────────────
@router.post("/maintenance-predictor")
def maintenance_predictor(truck_id: str="TRUCK-003"):
    return {
        "agent": "Maintenance Predictor",
        "model": "Vertex AI Gemini 1.5 Pro",
        "truck_id": truck_id,
        "anomalies_analyzed": 4,
        "source": "GCP-VertexAI-Gemini",
        "maintenance_plan": {
            "priority_repairs": [
                {"component":"Hydraulic seal", "urgency":"URGENT","z_score":2.9,"hours_to_failure":70,"sku":"HYD-SEAL-HEIL-2024"},
                {"component":"Packer blade",   "urgency":"HIGH",  "z_score":2.4,"hours_to_failure":96,"sku":"PACK-BLADE-STD-006"},
                {"component":"Cooling system", "urgency":"MONITOR","z_score":1.8,"hours_to_failure":168,"sku":"COOL-PUMP-ASSEMBLY"},
            ],
            "parts_list": [
                {"part":"HYD-SEAL-HEIL-2024","qty":2,"cost":"₹4,200","lead_time":"2 days","in_stock":True},
                {"part":"PACK-BLADE-STD-006","qty":1,"cost":"₹8,500","lead_time":"1 day","in_stock":True},
            ],
            "downtime_hours": 6,
            "schedule": "Sunday 06:00–12:00 — minimal collection impact (lowest route density)",
            "cost_estimate": "Repair now: ₹12,700 vs breakdown cost: ₹85,000 + 3-day route disruption + SLA penalty",
            "risk_if_deferred": "Hydraulic seal failure on-route: fluid leak, truck immobilised mid-collection, municipal SLA breach, potential ₹2.4L penalty",
        },
        "generated_at": datetime.utcnow().isoformat(),
    }

# ── 20. AI Agent: Route Optimizer ────────────────────────────────────────────
@router.post("/route-optimizer")
def route_optimizer(depot_id: str="DEPOT-BLR-01"):
    return {
        "agent": "Route Optimizer",
        "model": "Vertex AI Gemini 1.5 Pro",
        "depot_id": depot_id,
        "routes_analyzed": 4,
        "source": "GCP-VertexAI-Gemini",
        "optimization_plan": {
            "high_risk_routes": [
                {"route":"R-002-NORTHGATE","risk_rate":"34%","primary_hazard":"School zone 08:00-09:00","incidents_this_week":8},
                {"route":"R-003-DOWNTOWN", "risk_rate":"22%","primary_hazard":"High pedestrian density market area","incidents_this_week":5},
            ],
            "route_changes": [
                "R-002: Move collection from 08:15 → 06:30 — eliminates school zone overlap entirely",
                "R-003: Add mandatory 2-min safety stop before entering market stretch km 4.2-6.8",
                "R-001: Swap TRUCK-003 (high risk) with TRUCK-001 (GREEN health) for rest of week",
            ],
            "timing_adjustments": [
                "R-002 shift to 06:30 — estimated 3 fewer near-miss events per week",
                "R-003 split into two 45-min runs — reduces driver fatigue on longest route",
            ],
            "expected_improvement": "Estimated 40% reduction in HIGH/CRITICAL events within 30 days of implementation",
            "action_items": [
                "Update Soft-Pak route schedule for R-002 by Friday",
                "Brief all R-002 and R-003 drivers on timing change Monday 07:00",
                "Re-evaluate driver DRV-004 for R-003 assignment given fatigue score",
                "Review again in 30 days — target risk rate below 15% on all routes",
            ],
        },
        "generated_at": datetime.utcnow().isoformat(),
    }

# ── 21. Copilot ───────────────────────────────────────────────────────────────
@router.post("/copilot")
def copilot(message: str=""):
    msg = message.lower()
    responses = {
        "critical": "Based on BigQuery fleet data: TRUCK-003 and TRUCK-007 have the most critical alerts. TRUCK-003 has a hydraulic seal failure predicted in 70 hours (Z-score 2.9σ) — Parts order PO-HYD-0041 raised and pending approval. TRUCK-007 has a packer blade anomaly at 3.4σ predicted to fail in 43 hours — Parts order PO-VIB-0088 raised. Both trucks have been flagged in the maintenance RPA workflow and tickets auto-created.",
        "safety": "This week fleet safety summary from BigQuery: 12 HIGH/CRITICAL events total. Route R-002-NORTHGATE has the highest risk rate at 34% — 3 pedestrian near-misses in 7 days, all between 08:00-09:30 (school zone overlap). TRUCK-003 is the highest-risk vehicle — safety score 62/100, down from 78 last week. Driver DRV-004 has the lowest driver behavior score at 52 — retraining flagged.",
        "route": "Route R-002-NORTHGATE is your highest-risk route — 34% of events are HIGH or CRITICAL severity. Primary hazard is a school zone active 08:00-09:00 — truck currently dispatched at 08:15. Recommendation: shift to 06:30 immediately. R-003-DOWNTOWN is second at 22% — high pedestrian density in the market stretch km 4.2-6.8. The Route Optimizer agent has full recommendations ready.",
        "maintenance": "4 trucks have active maintenance alerts from the sensor anomaly pipeline: TRUCK-003 (hydraulic seal, 70h, PO raised), TRUCK-007 (packer blade, 43h, PO raised), TRUCK-001 (cooling system, 90h, monitoring), TRUCK-009 (brake system, 48h, PO pending). Total estimated repair cost: ₹38,400. If deferred, estimated breakdown cost exposure: ₹3.2L. All Parts Central orders raised automatically via the RPA workflow.",
        "driver": "Driver behavior scores from Vertex AI model: DRV-004 scored 52/100 — lowest this week, flagged for retraining. 5 distraction events correlate with early shift start (05:30). DRV-007 and DRV-009 are also below threshold at 58 and 61 respectively. Top performer is DRV-002 at 96/100. The driver scoring model runs every shift using CV events from 3rd Eye cameras.",
        "microservice": "All 10 microservices are running on GCP Cloud Run. The bi-reporting-svc is showing WARNING — CPU at 88% and latency 450ms vs normal 65ms. Recommend scaling up from 1 to 2 instances. All other services healthy — alert-router-svc has lowest latency at 8ms, parts-integration-svc has highest at 220ms due to external API dependency.",
        "rpa": "RPA workflows have saved 43.3 hours of manual work today across 6 active workflows. The Video Review Triage workflow has auto-resolved 318 of 342 events today — 93% automation rate. The Maintenance Ticket Creator auto-raised 12 tickets from sensor anomalies. Safety Compliance Report auto-generated at 06:00 and distributed to fleet managers.",
        "default": "I can see your full fleet intelligence data from BigQuery. You have 10 trucks active across 4 routes from 2 depots. 4 trucks have active sensor anomalies. Route R-002-NORTHGATE is your highest-risk route at 34% this week. RPA workflows have saved 43.3 hours today. AI automation rate is 94% — up from 86% after model v1.2 deployment. What would you like to drill into?",
    }
    reply = responses["default"]
    if any(w in msg for w in ["critical","alert","worst","dangerous truck"]): reply = responses["critical"]
    elif any(w in msg for w in ["safety","incident","event","near miss","hazmat"]): reply = responses["safety"]
    elif any(w in msg for w in ["route","road","path","northgate","downtown"]): reply = responses["route"]
    elif any(w in msg for w in ["maintenance","repair","part","breakdown","failure"]): reply = responses["maintenance"]
    elif any(w in msg for w in ["driver","behavior","fatigue","score","distract"]): reply = responses["driver"]
    elif any(w in msg for w in ["microservice","service","api","latency","health"]): reply = responses["microservice"]
    elif any(w in msg for w in ["rpa","automation","workflow","manual","review"]): reply = responses["rpa"]
    return {"agent":"Operations Copilot","model":"Vertex AI Gemini 1.5 Pro","response":reply,"timestamp":datetime.utcnow().isoformat(),"source":"GCP-VertexAI"}
