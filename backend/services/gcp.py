# backend/services/gcp.py
import os, json, uuid, random
from datetime import datetime, timedelta
from typing import Dict, List, Optional

PROJECT_ID = os.getenv("GCP_PROJECT_ID", "terex-neosoft-poc")
REGION     = os.getenv("GCP_REGION",     "us-central1")
DATASET    = "terex_poc"
BQ_VIDEO   = f"{PROJECT_ID}.{DATASET}.video_events"
BQ_ANOMALY = f"{PROJECT_ID}.{DATASET}.sensor_anomalies"
PUB_TOPIC  = f"projects/{PROJECT_ID}/topics/terex-truck-telemetry"

_bq=_pub=None
_gcp_ok=None

def is_gcp_available():
    global _gcp_ok
    if _gcp_ok is not None: return _gcp_ok
    try:
        from google.cloud import bigquery
        c=bigquery.Client(project=PROJECT_ID)
        list(c.query("SELECT 1").result())
        _gcp_ok=True; print(f"[GCP] Connected: {PROJECT_ID}")
    except Exception as e:
        _gcp_ok=False; print(f"[GCP] Offline: {e}")
    return _gcp_ok

def get_bq():
    global _bq
    if _bq is None and is_gcp_available():
        from google.cloud import bigquery
        _bq=bigquery.Client(project=PROJECT_ID)
    return _bq

def get_pub():
    global _pub
    if _pub is None and is_gcp_available():
        from google.cloud import pubsub_v1
        _pub=pubsub_v1.PublisherClient()
    return _pub

def write_video_event(event:Dict)->bool:
    bq=get_bq()
    if not bq: return True
    try:
        row={"event_id":event.get("event_id",str(uuid.uuid4())[:12]),"truck_id":event.get("truck_id","unknown"),"camera_id":event.get("camera_id","3REYE-CAM01"),"event_timestamp":datetime.utcnow().isoformat(),"event_type":event.get("event_type","unknown"),"severity":event.get("severity","LOW"),"confidence_score":float(event.get("confidence_score",0)),"model_version":event.get("model_version","v1.2"),"gcs_frame_uri":None,"reviewed_by_human":False,"review_label":None,"latitude":12.9716,"longitude":77.5946,"route_id":event.get("route_id","R-001"),"depot_id":event.get("depot_id","DEPOT-BLR-01")}
        errors=bq.insert_rows_json(BQ_VIDEO,[row])
        return len(errors)==0
    except Exception as e:
        print(f"[BQ] Write error: {e}"); return False

def write_anomaly(anomaly:Dict)->bool:
    bq=get_bq()
    if not bq: return True
    try:
        row={"anomaly_id":anomaly.get("anomaly_id",str(uuid.uuid4())),"truck_id":anomaly.get("truck_id","unknown"),"sensor_id":anomaly.get("sensor_id","unknown"),"sensor_type":anomaly.get("sensor_type","unknown"),"detected_at":datetime.utcnow().isoformat(),"predicted_failure":anomaly.get("predicted_failure"),"hours_to_failure":anomaly.get("hours_to_failure",72),"anomaly_score":float(anomaly.get("anomaly_score",0)),"baseline_value":float(anomaly.get("baseline_mean",0)),"current_value":float(anomaly.get("current_value",0)),"z_score":float(anomaly.get("z_score",0)),"component":anomaly.get("component","unknown"),"alert_sent":True,"parts_order_id":anomaly.get("parts_order",{}).get("order_id"),"model_version":"v1.0"}
        errors=bq.insert_rows_json(BQ_ANOMALY,[row])
        return len(errors)==0
    except Exception as e:
        print(f"[BQ] Anomaly write error: {e}"); return False

def query_video_events(limit:int=20,severity:Optional[str]=None)->List[Dict]:
    bq=get_bq()
    if not bq: return _mock_events(limit,severity)
    try:
        w=f"WHERE severity='{severity}'" if severity else ""
        rows=list(bq.query(f"SELECT event_id,truck_id,event_type,severity,confidence_score,event_timestamp,route_id,depot_id,reviewed_by_human,model_version FROM `{BQ_VIDEO}` {w} ORDER BY event_timestamp DESC LIMIT {limit}").result())
        return [dict(r) for r in rows]
    except Exception as e:
        print(f"[BQ] Query error: {e}"); return _mock_events(limit,severity)

def query_anomalies(limit:int=10)->List[Dict]:
    bq=get_bq()
    if not bq: return _mock_anomalies()
    try:
        rows=list(bq.query(f"SELECT anomaly_id,truck_id,sensor_type,component,detected_at,hours_to_failure,anomaly_score,z_score,alert_sent,parts_order_id FROM `{BQ_ANOMALY}` ORDER BY detected_at DESC LIMIT {limit}").result())
        return [dict(r) for r in rows]
    except Exception as e:
        print(f"[BQ] Anomaly query error: {e}"); return _mock_anomalies()

def query_patterns()->List[Dict]:
    bq=get_bq()
    if not bq: return _mock_patterns()
    try:
        q=f"SELECT route_id,depot_id,COUNT(*) AS total_events,COUNTIF(severity IN ('HIGH','CRITICAL')) AS high_severity_events,COUNTIF(event_type='near_miss_pedestrian') AS pedestrian_near_misses,COUNTIF(event_type='hazmat_detected') AS hazmat_events,ROUND(COUNTIF(severity IN ('HIGH','CRITICAL'))/COUNT(*),3) AS risk_rate FROM `{BQ_VIDEO}` WHERE event_timestamp>=TIMESTAMP_SUB(CURRENT_TIMESTAMP(),INTERVAL 30 DAY) GROUP BY route_id,depot_id HAVING total_events>3 ORDER BY risk_rate DESC LIMIT 10"
        rows=list(bq.query(q).result())
        return [dict(r) for r in rows]
    except Exception as e:
        print(f"[BQ] Pattern query error: {e}"); return _mock_patterns()

def publish_event(payload:Dict)->str:
    pub=get_pub()
    if not pub: return f"OFFLINE-{str(uuid.uuid4())[:8]}"
    try:
        data=json.dumps(payload,default=str).encode("utf-8")
        future=pub.publish(PUB_TOPIC,data,truck_id=payload.get("truck_id","unknown"))
        return future.result(timeout=10)
    except Exception as e:
        print(f"[PubSub] Error: {e}"); return f"FAILED-{str(uuid.uuid4())[:8]}"

def _mock_events(limit,severity):
    T=["near_miss_pedestrian","safety_noncompliance","driver_distraction","bin_missed","hazmat_detected","lift_arm_fault","bin_overfill","illegal_dumping","bin_damage"]
    S={"near_miss_pedestrian":"CRITICAL","hazmat_detected":"CRITICAL","safety_noncompliance":"HIGH","illegal_dumping":"HIGH","lift_arm_fault":"HIGH","driver_distraction":"MEDIUM","bin_overfill":"MEDIUM","bin_missed":"LOW","bin_damage":"LOW"}
    TRUCKS=[f"TRUCK-{str(i).zfill(3)}" for i in range(1,11)]
    ROUTES=["R-001-WESTSIDE","R-002-NORTHGATE","R-003-DOWNTOWN","R-004-EASTPARK"]
    events=[]
    for i in range(min(limit,14)):
        et=random.choice(T); sev=S[et]
        if severity and sev!=severity: continue
        events.append({"event_id":str(uuid.uuid4())[:8],"truck_id":random.choice(TRUCKS),"event_type":et,"severity":sev,"confidence_score":round(random.uniform(0.74,0.98),2),"event_timestamp":(datetime.utcnow()-timedelta(minutes=random.randint(1,180))).isoformat(),"route_id":random.choice(ROUTES),"depot_id":"DEPOT-BLR-01","reviewed_by_human":sev in("HIGH","CRITICAL")and random.random()>0.4,"model_version":"v1.2"})
    return sorted(events,key=lambda x:x["event_timestamp"],reverse=True)

def _mock_anomalies():
    return [
        {"anomaly_id":str(uuid.uuid4())[:8],"truck_id":"TRUCK-003","sensor_type":"hydraulic_pressure","component":"hydraulic_seal","z_score":2.9,"anomaly_score":0.48,"hours_to_failure":70,"detected_at":(datetime.utcnow()-timedelta(hours=2)).isoformat(),"predicted_failure":(datetime.utcnow()+timedelta(hours=70)).isoformat(),"alert_sent":True,"parts_order_id":"PO-HYD-041"},
        {"anomaly_id":str(uuid.uuid4())[:8],"truck_id":"TRUCK-007","sensor_type":"vibration_rms","component":"packer_blade","z_score":3.4,"anomaly_score":0.57,"hours_to_failure":43,"detected_at":(datetime.utcnow()-timedelta(hours=5)).isoformat(),"predicted_failure":(datetime.utcnow()+timedelta(hours=43)).isoformat(),"alert_sent":True,"parts_order_id":"PO-VIB-088"},
        {"anomaly_id":str(uuid.uuid4())[:8],"truck_id":"TRUCK-001","sensor_type":"temperature_engine","component":"cooling_system","z_score":2.7,"anomaly_score":0.45,"hours_to_failure":90,"detected_at":(datetime.utcnow()-timedelta(minutes=20)).isoformat(),"predicted_failure":(datetime.utcnow()+timedelta(hours=90)).isoformat(),"alert_sent":True,"parts_order_id":None},
    ]

def _mock_patterns():
    patterns=[]
    for r,total,high in [("R-001-WESTSIDE",45,5),("R-002-NORTHGATE",67,23),("R-003-DOWNTOWN",52,11),("R-004-EASTPARK",38,4)]:
        patterns.append({"route_id":r,"depot_id":"DEPOT-BLR-01","total_events":total,"high_severity_events":high,"pedestrian_near_misses":random.randint(0,5),"hazmat_events":random.randint(0,2),"risk_rate":round(high/total,3),"avg_confidence":round(random.uniform(0.78,0.95),3)})
    return sorted(patterns,key=lambda x:x["risk_rate"],reverse=True)
