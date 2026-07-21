// Ported from backend/algorithms/cv_classifier.py — rule-based CV classification
// (the GCP Video Intelligence API path is dropped since there's no GCP backend anymore).

import { uniform, randint, choicesWeighted, shortId } from "./rng.js";

export const CV_SCENARIOS = {
  0: { name: "bin_missed", severity: "LOW", description: "Refuse bin not collected on route" },
  1: { name: "bin_overfill", severity: "MEDIUM", description: "Bin overflowing at collection point" },
  2: { name: "safety_noncompliance", severity: "HIGH", description: "PPE or safety procedure violation" },
  3: { name: "driver_distraction", severity: "MEDIUM", description: "Driver attention away from road" },
  4: { name: "near_miss_pedestrian", severity: "CRITICAL", description: "Pedestrian or cyclist near-miss event" },
  5: { name: "near_miss_vehicle", severity: "CRITICAL", description: "Vehicle near-miss event" },
  6: { name: "hazmat_detected", severity: "CRITICAL", description: "Hazardous material in residential bin" },
  7: { name: "illegal_dumping", severity: "HIGH", description: "Illegal waste deposit detected" },
  8: { name: "lift_arm_fault", severity: "HIGH", description: "Lift arm mechanical anomaly visible" },
  9: { name: "bin_damage", severity: "LOW", description: "Physical damage to refuse bin" },
};

const SEVERITY_SCORE = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

const SCENARIO_PROBS = { 0: 0.28, 1: 0.14, 2: 0.09, 3: 0.18, 4: 0.06, 5: 0.04, 6: 0.02, 7: 0.04, 8: 0.07, 9: 0.08 };
const BASE_CONFIDENCE = {
  0: [0.82, 0.97], 1: [0.78, 0.94], 2: [0.72, 0.91], 3: [0.68, 0.88], 4: [0.81, 0.96],
  5: [0.79, 0.95], 6: [0.65, 0.85], 7: [0.71, 0.89], 8: [0.77, 0.93], 9: [0.74, 0.91],
};

export function classifyAlgorithmic(truckId, source = "simulation") {
  const nEvents = choicesWeighted([1, 2, 3, 4], [0.5, 0.3, 0.15, 0.05], 1)[0];

  const keys = Object.keys(SCENARIO_PROBS).map(Number);
  const weights = keys.map(k => SCENARIO_PROBS[k]);
  const sampled = choicesWeighted(keys, weights, nEvents);
  const scenariosIdx = [...new Set(sampled)];

  const detected = [];
  for (const idx of scenariosIdx) {
    const scenario = CV_SCENARIOS[idx];
    const [lo, hi] = BASE_CONFIDENCE[idx];
    const confidence = round(uniform(lo, hi), 3);

    const totalSecs = randint(10, 580);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const frameTs = `00:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    detected.push({
      event_type: scenario.name,
      severity: scenario.severity,
      confidence_score: confidence,
      description: scenario.description,
      frame_timestamp: frameTs,
      detection_source: "YOLO-v8-Terex-Domain-Model-v1.2",
      model_version: "v1.2",
    });
  }

  return buildClassificationResult(detected, truckId, source, "Terex-CV-Model-v1.2");
}

function buildClassificationResult(detected, truckId, sourceUri, modelSource) {
  const seen = new Map();
  for (const d of detected) {
    const existing = seen.get(d.event_type);
    if (!existing || d.confidence_score > existing.confidence_score) seen.set(d.event_type, d);
  }
  detected = [...seen.values()];

  detected.sort((a, b) => {
    const sa = SEVERITY_SCORE[a.severity] || 0;
    const sb = SEVERITY_SCORE[b.severity] || 0;
    if (sb !== sa) return sb - sa;
    return b.confidence_score - a.confidence_score;
  });

  const critical = detected.filter(d => d.severity === "CRITICAL");
  const high = detected.filter(d => d.severity === "HIGH");

  let rpaAction;
  if (critical.length) rpaAction = "AUTO_ROUTED_CRITICAL_REVIEW_QUEUE";
  else if (high.length) rpaAction = "AUTO_ROUTED_HIGH_REVIEW_QUEUE";
  else rpaAction = "AUTO_RESOLVED_NO_REVIEW_NEEDED";

  return {
    event_id: shortId(12),
    truck_id: truckId,
    source_uri: sourceUri,
    detected,
    total: detected.length,
    critical,
    high,
    max_severity: detected.length ? detected[0].severity : "NONE",
    rpa_action: rpaAction,
    requires_review: critical.length > 0 || high.length > 0,
    model_source: modelSource,
    pipeline: "3rd-Eye → IoT-Core → Pub/Sub → Video-Intelligence-API → Vertex-AI → BigQuery",
    bq_table: "terex_poc.video_events",
    pubsub_published: true,
    bq_written: true,
    processing_ms: randint(180, 520),
    timestamp: new Date().toISOString(),
  };
}

export function classifyDriverBehavior(truckId, driverId, shiftEvents) {
  let score = 100;
  const penalties = [];

  const distractionEvents = shiftEvents.filter(e => e.event_type === "driver_distraction");
  const nearMissEvents = shiftEvents.filter(e => (e.event_type || "").includes("near_miss"));
  const safetyEvents = shiftEvents.filter(e => e.event_type === "safety_noncompliance");

  for (const _ of nearMissEvents) { score -= 20; penalties.push("Near-miss event: -20 pts"); }
  for (const _ of safetyEvents) { score -= 15; penalties.push("Safety violation: -15 pts"); }
  for (const _ of distractionEvents) { score -= 10; penalties.push("Distraction event: -10 pts"); }

  score = Math.max(0, Math.min(100, score));

  return {
    driver_id: driverId,
    truck_id: truckId,
    safety_score: score,
    risk_level: score < 60 ? "HIGH" : score < 75 ? "MEDIUM" : "LOW",
    distraction_events: distractionEvents.length,
    near_miss_events: nearMissEvents.length,
    safety_violations: safetyEvents.length,
    penalties,
    retraining_required: score < 65,
    algorithm: "Weighted penalty scoring v1.0",
    computed_at: new Date().toISOString(),
  };
}

function round(v, digits) {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
