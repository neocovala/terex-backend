# backend/routers/agents.py
# AI Agents — the most powerful demo feature
# 4 specialist agents powered by Vertex AI Gemini

import os, json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import vertexai
from vertexai.generative_models import GenerativeModel, Part

from services.gcp import bq, PROJECT_ID, DATASET, REGION

router = APIRouter()

def init_vertex():
    vertexai.init(project=PROJECT_ID, location=REGION)

# ── Agent 1: Fleet Safety Inspector ─────────────────────────────────────────
class SafetyInspectorRequest(BaseModel):
    truck_id: str = "TRUCK-003"
    time_window_days: int = 7

@router.post("/safety-inspector")
def run_safety_inspector(req: SafetyInspectorRequest):
    """
    AI Agent: Analyses safety events for a truck and generates
    a structured safety report with recommendations.
    """
    init_vertex()

    # Pull real data from BigQuery
    query = f"""
        SELECT event_type, severity, confidence_score, event_timestamp, route_id
        FROM `{PROJECT_ID}.{DATASET}.video_events`
        WHERE truck_id = '{req.truck_id}'
          AND event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {req.time_window_days} DAY)
        ORDER BY event_timestamp DESC
        LIMIT 50
    """
    try:
        rows = list(bq().query(query).result())
        events_data = [dict(r) for r in rows]
    except Exception:
        events_data = []

    prompt = f"""You are a Fleet Safety Inspector AI Agent for Terex ESG.

Truck: {req.truck_id}
Time window: Last {req.time_window_days} days
Events detected: {json.dumps(events_data, default=str)}

Analyse the safety data and provide:
1. SAFETY SCORE (0-100): Overall safety rating for this truck
2. TOP RISKS: The 3 most critical safety patterns detected
3. ROOT CAUSE: Most likely cause for each risk
4. RECOMMENDATIONS: Specific actions to take (driver training, route changes, maintenance)
5. TREND: Is this truck improving or deteriorating?

Format as structured JSON with keys: safety_score, top_risks, recommendations, trend, summary.
Be specific. Reference actual events from the data."""

    try:
        model = GenerativeModel("gemini-1.5-pro")
        response = model.generate_content(prompt)
        text = response.text

        # Parse JSON from response
        import re
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = {"summary": text}

        return {
            "agent": "Safety Inspector",
            "truck_id": req.truck_id,
            "events_analyzed": len(events_data),
            "analysis": result,
            "generated_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Agent 2: Maintenance Predictor ───────────────────────────────────────────
class MaintenanceRequest(BaseModel):
    truck_id: str = "TRUCK-003"

@router.post("/maintenance-predictor")
def run_maintenance_predictor(req: MaintenanceRequest):
    """
    AI Agent: Analyses sensor anomalies and generates a
    prioritised maintenance schedule with parts list.
    """
    init_vertex()

    query = f"""
        SELECT sensor_type, component, z_score, anomaly_score,
               hours_to_failure, detected_at, parts_order_id
        FROM `{PROJECT_ID}.{DATASET}.sensor_anomalies`
        WHERE truck_id = '{req.truck_id}'
        ORDER BY anomaly_score DESC
        LIMIT 20
    """
    try:
        rows = list(bq().query(query).result())
        anomalies = [dict(r) for r in rows]
    except Exception:
        anomalies = []

    prompt = f"""You are a Predictive Maintenance AI Agent for Terex ESG refuse trucks.

Truck: {req.truck_id}
Sensor anomalies detected: {json.dumps(anomalies, default=str)}

Generate a maintenance action plan:
1. PRIORITY REPAIRS: List components to fix, ordered by urgency
2. PARTS LIST: Exact parts needed with estimated quantities
3. DOWNTIME ESTIMATE: How long will maintenance take
4. SCHEDULE: When to take the truck off-route (least impact on collection schedule)
5. COST ESTIMATE: Rough cost to fix vs cost of breakdown
6. RISK IF IGNORED: What happens if maintenance is deferred

Format as structured JSON with keys: priority_repairs, parts_list, downtime_hours, schedule, cost_estimate, risk_assessment.
Be specific to refuse truck components."""

    try:
        model = GenerativeModel("gemini-1.5-pro")
        response = model.generate_content(prompt)
        text = response.text

        import re
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        result = json.loads(json_match.group()) if json_match else {"summary": text}

        return {
            "agent": "Maintenance Predictor",
            "truck_id": req.truck_id,
            "anomalies_analyzed": len(anomalies),
            "maintenance_plan": result,
            "generated_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Agent 3: Route Optimizer ──────────────────────────────────────────────────
class RouteRequest(BaseModel):
    depot_id: str = "DEPOT-BLR-01"
    date: str = ""

@router.post("/route-optimizer")
def run_route_optimizer(req: RouteRequest):
    """
    AI Agent: Analyses cross-fleet safety patterns and recommends
    route optimisations to reduce incidents.
    """
    init_vertex()

    query = f"""
        SELECT route_id,
               COUNT(*) AS total_events,
               COUNTIF(severity IN ('HIGH','CRITICAL')) AS high_risk_events,
               COUNTIF(event_type = 'near_miss_pedestrian') AS pedestrian_risks,
               ROUND(COUNTIF(severity IN ('HIGH','CRITICAL')) / COUNT(*), 3) AS risk_rate,
               ARRAY_AGG(DISTINCT event_type LIMIT 5) AS event_types
        FROM `{PROJECT_ID}.{DATASET}.video_events`
        WHERE depot_id = '{req.depot_id}'
        GROUP BY route_id
        ORDER BY risk_rate DESC
    """
    try:
        rows = list(bq().query(query).result())
        routes = [dict(r) for r in rows]
    except Exception:
        routes = []

    prompt = f"""You are a Route Safety Optimizer AI Agent for Terex ESG.

Depot: {req.depot_id}
Route safety data: {json.dumps(routes, default=str)}

Optimise routes for safety and efficiency:
1. HIGH-RISK ROUTES: Which routes have the most incidents and why
2. ROUTE CHANGES: Specific changes to reduce pedestrian near-misses
3. TIMING ADJUSTMENTS: Should any routes change collection times?
4. DRIVER ASSIGNMENTS: Which drivers should avoid high-risk routes?
5. EXPECTED IMPROVEMENT: Quantify the safety improvement expected

Format as structured JSON with keys: high_risk_routes, route_changes, timing_adjustments, expected_improvement, action_items.
Base recommendations on the actual data patterns."""

    try:
        model = GenerativeModel("gemini-1.5-pro")
        response = model.generate_content(prompt)
        text = response.text

        import re
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        result = json.loads(json_match.group()) if json_match else {"summary": text}

        return {
            "agent": "Route Optimizer",
            "depot_id": req.depot_id,
            "routes_analyzed": len(routes),
            "optimization_plan": result,
            "generated_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Agent 4: Operations Copilot (Chat) ────────────────────────────────────────
class CopilotRequest(BaseModel):
    message: str
    conversation_history: list = []

@router.post("/copilot")
def run_copilot(req: CopilotRequest):
    """
    AI Agent: General-purpose fleet operations copilot.
    Can answer any question about fleet data by querying BigQuery.
    """
    init_vertex()

    system_prompt = """You are the Terex ESG Fleet Operations Copilot — an AI assistant
built by NeoSoft Digital. You have access to real-time fleet data.

You can answer questions about:
- Fleet safety events and incidents
- Sensor health and maintenance predictions
- Route performance and risk patterns
- Specific truck histories
- Parts and maintenance recommendations

Always be specific, data-driven, and actionable. When you don't have data,
say so clearly. Format responses clearly with key findings highlighted."""

    try:
        model = GenerativeModel("gemini-1.5-pro",
            system_instruction=system_prompt)

        # Build conversation
        history = []
        for msg in req.conversation_history[-6:]:  # last 6 turns
            history.append({
                "role": msg.get("role", "user"),
                "parts": [msg.get("content", "")]
            })

        chat = model.start_chat(history=history)
        response = chat.send_message(req.message)

        return {
            "agent": "Operations Copilot",
            "response": response.text,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
