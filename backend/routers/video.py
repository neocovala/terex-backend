# backend/routers/video.py
# Pillar 02 — Auto Video Intelligence
# Calls real GCP Video Intelligence API + reads BigQuery events

import uuid, json, base64
from datetime import datetime, timedelta
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.gcp import bq, publisher, gcs, PROJECT_ID, DATASET, TELEMETRY_TOPIC

router = APIRouter()

SEVERITY_MAP = {
    "bin_missed": "LOW", "bin_overfill": "MEDIUM",
    "safety_noncompliance": "HIGH", "driver_distraction": "MEDIUM",
    "near_miss_pedestrian": "CRITICAL", "near_miss_vehicle": "CRITICAL",
    "hazmat_detected": "CRITICAL", "illegal_dumping": "HIGH",
    "lift_arm_fault": "HIGH", "bin_damage": "LOW",
}

class VideoAnalyzeRequest(BaseModel):
    gcs_uri: Optional[str] = None
    truck_id: str = "TRUCK-001"
    camera_id: str = "3REYE-TRUCK-001-CAM01"

@router.post("/analyze")
async def analyze_video(req: VideoAnalyzeRequest):
    """
    Analyze a video clip using GCP Video Intelligence API.
    Returns detected scenarios with confidence scores.
    """
    from google.cloud import videointelligence_v1 as vi

    if not req.gcs_uri:
        # Use a demo GCS clip if none provided
        req.gcs_uri = f"gs://{PROJECT_ID}-video-archive/demo/sample_truck_footage.mp4"

    try:
        client   = vi.VideoIntelligenceServiceClient()
        features = [vi.Feature.LABEL_DETECTION, vi.Feature.OBJECT_TRACKING]

        operation = client.annotate_video(
            request={"input_uri": req.gcs_uri, "features": features}
        )
        result = operation.result(timeout=60)

        detected = []
        for seg in result.annotation_results:
            for label in seg.segment_label_annotations:
                lname  = label.entity.description.lower()
                mapped = _map_label(lname)
                if mapped:
                    confidence = max(
                        (c.confidence for c in label.segments), default=0.0
                    )
                    detected.append({
                        "event_type":       mapped,
                        "confidence_score": round(confidence, 3),
                        "severity":         SEVERITY_MAP.get(mapped, "LOW"),
                        "raw_label":        lname,
                    })

        # Write to BigQuery
        event_id = str(uuid.uuid4())
        for d in detected:
            row = {
                "event_id":           event_id,
                "truck_id":           req.truck_id,
                "camera_id":          req.camera_id,
                "event_timestamp":    datetime.utcnow().isoformat(),
                "event_type":         d["event_type"],
                "severity":           d["severity"],
                "confidence_score":   d["confidence_score"],
                "model_version":      "v1.0",
                "gcs_frame_uri":      req.gcs_uri,
                "reviewed_by_human":  False,
                "review_label":       None,
                "latitude":           12.9716,
                "longitude":          77.5946,
                "route_id":           "R-001",
                "depot_id":           "DEPOT-BLR-01",
            }
            errors = bq().insert_rows_json(
                f"{PROJECT_ID}.{DATASET}.video_events", [row]
            )
            if errors:
                print(f"BQ insert error: {errors}")

        return {
            "event_id":   event_id,
            "truck_id":   req.truck_id,
            "gcs_uri":    req.gcs_uri,
            "detected":   detected,
            "total":      len(detected),
            "critical":   [d for d in detected if d["severity"] == "CRITICAL"],
            "timestamp":  datetime.utcnow().isoformat(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-and-analyze")
async def upload_and_analyze(
    file: UploadFile = File(...),
    truck_id: str = "TRUCK-001"
):
    """Upload a video file to GCS and run Video Intelligence API on it."""
    bucket_name = f"{PROJECT_ID}-video-archive"
    blob_name   = f"uploads/{truck_id}/{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{file.filename}"

    # Upload to GCS
    bucket = gcs().bucket(bucket_name)
    blob   = bucket.blob(blob_name)
    contents = await file.read()
    blob.upload_from_string(contents, content_type=file.content_type)

    gcs_uri = f"gs://{bucket_name}/{blob_name}"

    # Analyze
    return await analyze_video(VideoAnalyzeRequest(
        gcs_uri=gcs_uri, truck_id=truck_id
    ))


@router.get("/events")
def get_recent_events(limit: int = 20, severity: Optional[str] = None):
    """Fetch recent video events from BigQuery."""
    where = f"WHERE severity = '{severity}'" if severity else ""
    query = f"""
        SELECT event_id, truck_id, event_type, severity,
               confidence_score, event_timestamp, route_id, depot_id
        FROM `{PROJECT_ID}.{DATASET}.video_events`
        {where}
        ORDER BY event_timestamp DESC
        LIMIT {limit}
    """
    try:
        rows = list(bq().query(query).result())
        return {"events": [dict(r) for r in rows], "count": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cross-fleet-patterns")
def cross_fleet_patterns():
    """BigQuery cross-fleet pattern mining query."""
    query = f"""
        SELECT route_id, depot_id,
               COUNT(*) AS total_events,
               COUNTIF(severity IN ('HIGH','CRITICAL')) AS high_severity_events,
               COUNTIF(event_type = 'near_miss_pedestrian') AS pedestrian_near_misses,
               COUNTIF(event_type = 'hazmat_detected') AS hazmat_events,
               ROUND(COUNTIF(severity IN ('HIGH','CRITICAL')) / COUNT(*), 3) AS risk_rate
        FROM `{PROJECT_ID}.{DATASET}.video_events`
        WHERE event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
        GROUP BY route_id, depot_id
        HAVING total_events > 5
        ORDER BY risk_rate DESC
        LIMIT 10
    """
    try:
        rows = list(bq().query(query).result())
        return {"patterns": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _map_label(label: str) -> Optional[str]:
    mappings = {
        "pedestrian": "near_miss_pedestrian", "person": "near_miss_pedestrian",
        "bicycle": "near_miss_pedestrian",    "hazard": "hazmat_detected",
        "waste": "illegal_dumping",           "bin": "bin_missed",
        "driver": "driver_distraction",       "safety": "safety_noncompliance",
    }
    for kw, scenario in mappings.items():
        if kw in label:
            return scenario
    return None
