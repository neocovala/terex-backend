// Ported from backend/main.py — every endpoint the frontend used to call over HTTP,
// now dispatched to local JS logic instead. No server, no network round-trip.

import { randint, shortId } from "./rng.js";
import { TRUCKS, ROUTES } from "./data.js";
import {
  SENSOR_PROFILES, computeZscoreAnomaly, resetBuffers, generateSensorStream,
} from "./anomalyDetection.js";
import { classifyAlgorithmic, classifyDriverBehavior } from "./cvClassifier.js";
import {
  getEvents, getAnomalies, getHealth, getBi, getLiveEvents, generateLiveEvent,
} from "./realisticData.js";
import { runSafetyInspector, runMaintenancePredictor, runRouteOptimizer, runCopilot } from "./agent.js";

function findTruck(shortId) { return TRUCKS.find(t => t.short_id === shortId); }
function findRoute(routeId) { return ROUTES.find(r => r.route_id === routeId); }

function fleetStatus() {
  const trucks = TRUCKS.map(t => {
    const route = findRoute(t.assigned_route) || ROUTES[0];
    return {
      truck_id: t.short_id, truck_reg: t.truck_id, driver_name: t.driver,
      model: t.model, year: t.year,
      status: ["ONLINE", "ONLINE", "ONLINE", "OFFLINE"][randint(0, 3)],
      model_version: "v1.2", last_ping: new Date().toISOString(),
      inference_ms: randint(18, 47), battery_pct: randint(60, 100),
      gps_lat: round(route.gps_center[0] + jitter(), 6),
      gps_lng: round(route.gps_center[1] + jitter(), 6),
      current_route: route.route_id, route_name: route.name, area: route.area,
      sensors_active: randint(195, 200), can_bus_status: "CONNECTED",
      edge_model: "TFLite-INT8-v1.2", firmware: "terex-edge-v2.4.1",
    };
  });
  return { trucks, source: "Edge-Simulation" };
}

function iotDevices() {
  const devices = TRUCKS.map(t => {
    const route = findRoute(t.assigned_route) || ROUTES[0];
    return {
      device_id: t.short_id, truck_reg: t.truck_id, driver_name: t.driver,
      registry: "terex-fleet-registry", protocol: "MQTT", auth: "JWT-RSA256",
      last_heartbeat: new Date().toISOString(),
      messages_today: randint(80000, 120000), model_version: "v1.2",
      sensors: { camera_count: 4, can_bus: true, accelerometer: true, gps: true, hydraulic_sensors: randint(8, 12), temperature_sensors: randint(4, 6), total: randint(195, 202) },
      connectivity: ["4G-LTE", "4G-LTE", "4G-LTE", "WiFi-Depot"][randint(0, 3)],
      firmware: "terex-edge-v2.4.1", area: route.area, route_name: route.name,
    };
  });
  return { devices, registry: "GCP-IoTCore", source: "Edge-Simulation" };
}

function simulateTruck(truckId, includeAnomaly) {
  const truck = findTruck(truckId) || TRUCKS[0];
  const route = findRoute(truck.assigned_route) || ROUTES[0];

  const templates = [
    { sType: "hydraulic_pressure", fusion: "CAM+HYDRAULIC", label: "Hydraulic circuit reading", isAnom: false },
    { sType: "temperature_engine", fusion: "CAM+CAN", label: "Engine temp + camera scan", isAnom: false },
    { sType: "vibration_rms", fusion: "CAM+CAN+ACCEL", label: "Packer mechanism + camera", isAnom: includeAnomaly },
    { sType: "can_brake_pressure", fusion: "CAN+GPS", label: "Brake pressure + GPS", isAnom: false },
    { sType: "hydraulic_lift_pressure", fusion: "CAM+HYDRAULIC", label: "Lift arm + 3rd Eye scan", isAnom: false },
  ];

  const events = templates.map(tmpl => {
    const stream = generateSensorStream(truckId, tmpl.sType, 1, tmpl.isAnom ? 0 : null);
    const sensorVal = stream.length ? stream[0].value : 0.0;
    const detection = computeZscoreAnomaly(truckId, tmpl.sType, sensorVal, tmpl.isAnom);
    const severity = tmpl.isAnom ? "HIGH" : "LOW";

    const profile = SENSOR_PROFILES[tmpl.sType] || {};
    const unit = profile.unit || "";
    const [lo, hi] = profile.normal_range || [0, 0];

    const payload = {
      truck_id: truckId, truck_reg: truck.truck_id, driver_name: truck.driver,
      event_id: `${truckId}-EVT-${shortId(6)}`,
      timestamp: new Date().toISOString(),
      severity, event_type: tmpl.isAnom ? "sensor_anomaly" : "normal_telemetry",
      event_label: tmpl.label, sensor_type: tmpl.sType,
      sensor_value: round(sensorVal, 2), sensor_unit: unit,
      normal_range: `${lo}–${hi} ${unit}`,
      z_score: round(detection.z_score || 0, 3),
      anomalous_sensors: tmpl.isAnom ? [tmpl.sType] : [],
      sensor_count: 200, sensor_fusion: tmpl.fusion,
      cv_confidence: round(0.72 + Math.random() * 0.25, 3),
      inference_latency_ms: randint(18, 47),
      can_bus_readings: {
        engine_rpm: randint(1200, 2200), coolant_temp: randint(88, 98),
        fuel_level: randint(30, 80), vehicle_speed_kph: round(15 + Math.random() * 25, 1),
      },
      device_model: "NVIDIA-Jetson-Nano", edge_model: "TFLite-INT8-v1.2",
      area: route.area, route_name: route.name,
      iot_core_registry: "terex-fleet-registry", pubsub_topic: "terex-truck-telemetry",
      published: true, message_id: `SIM-${shortId(8)}`,
    };
    return payload;
  });

  return {
    truck_id: truckId, truck_reg: truck.truck_id, driver_name: truck.driver,
    route_name: route.name, area: route.area,
    events_published: 5, events, source: "MQTT-Simulation",
  };
}

function videoEvents(limit, severity) {
  const historical = getEvents();
  const live = getLiveEvents(6);
  if (severity) {
    const filtered = [...live, ...historical].filter(e => e.severity === severity);
    return { events: filtered.slice(0, limit), count: filtered.length, source: "Client-side-Live-Simulation" };
  }
  const all = [...live, ...historical];
  const critical = all.filter(e => e.severity === "CRITICAL").slice(0, 2);
  const high = all.filter(e => e.severity === "HIGH").slice(0, 3);
  const medium = all.filter(e => e.severity === "MEDIUM").slice(0, 4);
  const low = all.filter(e => e.severity === "LOW").slice(0, 4);
  const mixed = [...critical, ...high, ...medium, ...low];
  return { events: mixed.slice(0, limit), count: historical.length + live.length, live_count: live.length, source: "Client-side-Live-Simulation" };
}

function analyzeVideo(truckId) {
  const result = classifyAlgorithmic(truckId, "3rd-Eye-KA-01-AA-4521");
  const truck = findTruck(truckId) || TRUCKS[0];
  const route = findRoute(truck.assigned_route) || ROUTES[0];
  result.truck_reg = truck.truck_id;
  result.driver_name = truck.driver;
  result.route_name = route.name;
  result.area = route.area;
  return result;
}

function driverBehavior() {
  const events = getEvents();
  const drivers = TRUCKS.map(truck => {
    const drvEvents = events.filter(e => e.truck_id === truck.short_id);
    const result = classifyDriverBehavior(truck.short_id, truck.driver_id, drvEvents);
    result.driver_name = truck.driver;
    result.truck_reg = truck.truck_id;
    const route = findRoute(truck.assigned_route);
    result.area = route ? route.area : "";
    return result;
  });
  return { drivers: drivers.sort((a, b) => a.safety_score - b.safety_score), source: "CV-BehaviorScoring-30Day" };
}

function safetyInspector(truckId) {
  const events = getEvents();
  let truckEvents = events.filter(e => e.truck_id === truckId).slice(0, 20);
  if (!truckEvents.length) {
    const r = classifyAlgorithmic(truckId);
    truckEvents = (r.detected || []).map(d => ({
      truck_id: truckId, event_type: d.event_type, severity: d.severity,
      confidence_score: d.confidence_score, route_id: "BLR-R02-KORAMANGALA",
    }));
  }
  const result = runSafetyInspector(truckId, truckEvents);
  if ((result.analysis?.safety_score ?? 0) < 10) {
    result.analysis.safety_score = Math.max(35, 100 - truckEvents.length * 3);
  }
  return result;
}

function maintenancePredictor(truckId) {
  let anomalies = getAnomalies().filter(a => a.truck_id === truckId);
  if (!anomalies.length) {
    const r = computeZscoreAnomaly(truckId, "hydraulic_pressure", 0.0, true);
    if (r.is_anomaly) {
      r.parts_sku = r.parts_order?.sku || "HYD-SEAL-HEIL-2024";
      r.parts_desc = "RELIEF VALVE 2000 PSI (031-6392)";
      anomalies = [r];
    }
  }
  return runMaintenancePredictor(truckId, anomalies);
}

function rpaSimulate(workflow) {
  const trucks = TRUCKS, routes = ROUTES, anomalies = getAnomalies(), bi = getBi();
  const nowStr = new Date().toTimeString().slice(0, 8);
  const t003 = trucks.find(t => t.truck_id === "KA-01-AA-4523");
  const t007 = trucks.find(t => t.truck_id === "KA-01-AA-4527");
  const r02 = routes.find(r => r.route_id === "BLR-R02-KORAMANGALA");
  const r03 = routes.find(r => r.route_id === "BLR-R03-INDIRANAGAR");
  const topAnomalies = anomalies.filter(a => (a.z_score || 0) > 2.5).sort((a, b) => b.z_score - a.z_score).slice(0, 3);

  let steps = [], outcome = "";

  if (workflow === "missed-collection") {
    const liveEv = generateLiveEvent();
    steps = [
      `3rd Eye AI · Camera ${liveEv.camera_id} detected missed bin at ${liveEv.area} · ${nowStr}`,
      `CV Model confidence: ${(liveEv.confidence_score * 100).toFixed(1)}% · Event classified: BIN_MISSED · Severity: ${liveEv.severity}`,
      `Route ${liveEv.route_id} · Driver ${liveEv.driver_name} notified via in-cab alert system`,
      `Missed stop geo-tagged: ${liveEv.latitude.toFixed(4)}°N, ${liveEv.longitude.toFixed(4)}°E · BBMP zone: ${liveEv.bbmp_zone}`,
      "Bin rescheduled in route plan · Estimated collection within 45 minutes · BBMP SLA tracker updated",
    ];
    outcome = `Bin flagged and rescheduled automatically. Driver ${liveEv.driver_name} re-routed. Zero manual intervention. BBMP SLA maintained.`;
  } else if (workflow === "maintenance-ticket") {
    const a = topAnomalies[0] || { sensor: "hydraulic_pressure", z_score: 3.1, truck_reg: t003.truck_id, driver_name: t003.driver, hours_to_failure: 72 };
    const truck = trucks.find(t => t.truck_id === (a.truck_reg || t003.truck_id)) || t003;
    const route = routes.find(r => r.route_id === truck.assigned_route) || r02;
    const sensorLabel = (a.sensor_type || a.sensor || "hydraulic_pressure").replace(/_/g, " ").replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1));
    const sku = (a.sensor_type || a.sensor || "").includes("hydraulic") ? "031-6392 (Relief Valve 2000 PSI)" : "COOL-PUMP-HEIL-001";
    steps = [
      `Sensor alert: ${truck.truck_id} · ${sensorLabel} deviation at ${(a.z_score ?? 3.1).toFixed(1)}σ above normal baseline`,
      `AI diagnosis: component degradation pattern matches pre-failure signature · ${a.hours_to_failure ?? 72}h to predicted failure`,
      `Work order WO-BLR-${randint(2800, 2999)} auto-created · Assigned to ${route.depot} workshop · Priority: HIGH`,
      `Part ${sku} flagged for staging · Purchase order raised to Heil India supply chain`,
      `Maintenance window scheduled: Sunday 06:00–10:00 · Driver ${truck.driver} notified · Route ${truck.assigned_route} unaffected`,
    ];
    outcome = `Truck ${truck.truck_id} scheduled for maintenance before failure. Part staged. Estimated ₹3.8L breakdown cost avoided. Fleet availability maintained.`;
  } else if (workflow === "parts-reorder") {
    steps = [
      `Component risk engine: ${t003.truck_id} packer blade wear at 87% of service life · Threshold: 85%`,
      "Cross-fleet check: 2 other trucks on same model show blade failure at 89–91% wear — pattern confirmed",
      `Purchase order PO-BLR-${randint(1040, 1060)} raised · Part: PACK-BLADE-STD-006 · Qty: 1 · Heil India supplier`,
      `Estimated delivery: 2 working days · Lead time within SLA · Part staged at ${r02.depot}`,
      "Parts Central inventory updated · Fleet manager notified · No manual procurement action needed",
    ];
    outcome = "Part PACK-BLADE-STD-006 ordered 72h before predicted failure. Arrives before maintenance window. Zero unplanned downtime.";
  } else if (workflow === "driver-alert") {
    steps = [
      `3rd Eye AI: driver distraction event · ${t007.truck_id} · Driver: ${t007.driver} · Route: ${r03.route_id} · ${nowStr}`,
      `Driver safety score updated: ${t007.driver} · Score dropped 71 → 68 · Threshold: 70 · Action required`,
      `In-cab coaching alert sent to ${t007.driver} · Alert ID: DSA-${randint(1000, 9999)} · Acknowledged in 23 seconds`,
      `Fleet manager at ${r03.depot} notified · Incident log entry created · HSE compliance record updated`,
      "Driver behaviour pattern flagged for weekly safety review · No route reassignment needed at this threshold",
    ];
    outcome = `Driver ${t007.driver} alerted in real time. Incident logged automatically. HSE compliance record updated. No manual supervisor action needed.`;
  } else if (workflow === "compliance-report") {
    const totalRoutes = routes.length;
    const efficiency = bi.kpis?.collection_efficiency?.value ?? 94.2;
    steps = [
      "Scheduled trigger: 05:45 AM · BBMP muster time 05:30 AM · Report generation started",
      `Data pull: ${totalRoutes} active routes · 10 trucks · 198 BBMP wards · last 24h window`,
      `Metrics compiled: collection efficiency ${efficiency}% · Sensor anomalies: 3 · SLA breaches: 0 · Incidents: 2`,
      `PDF report auto-generated · ${randint(8, 12)} pages · Signed with fleet system timestamp`,
      "Report emailed to BBMP SWM Commissioner · Delivery confirmed 05:47 AM · Zero manual effort",
    ];
    outcome = "BBMP daily compliance report delivered at 05:47 AM — 17 minutes before muster. Zero staff time. Audit-ready record maintained automatically.";
  } else if (workflow === "sla-breach") {
    steps = [
      `Route monitor: ${r02.route_id} running 38 minutes behind schedule · Current time: ${nowStr}`,
      "AI prediction: at current pace, route completion by 15:52 PM · BBMP SLA deadline: 15:30 PM",
      `Early warning raised · Operations Manager at ${r02.depot} alerted · 45 minutes to act`,
      `Spare truck ${trucks[7].truck_id} · Driver ${trucks[7].driver} dispatched to complete remaining 12 stops`,
      "Revised ETA: 15:24 PM · SLA breach averted · BBMP notified of route adjustment proactively",
    ];
    outcome = "SLA breach detected 45 minutes before deadline. Spare truck deployed. All collections completed by 15:24 PM. BBMP penalty of ₹45,000 avoided.";
  } else {
    steps = ["Workflow not found"];
  }

  return { workflow, steps, outcome, timestamp: new Date().toISOString(), data_source: "Live fleet sensor stream · Client-side event log · Heil truck registry" };
}

function rpaWorkflows() {
  const wf = [
    { name: "Video Review Triage", status: "ACTIVE", runs_today: 342, auto_resolved: 318, escalated: 24, time_saved_hrs: 28.5, trigger: "CV_HIGH_SEVERITY_EVENT" },
    { name: "Maintenance Ticket Creator", status: "ACTIVE", runs_today: 12, auto_resolved: 12, escalated: 0, time_saved_hrs: 2.4, trigger: "SENSOR_ANOMALY_THRESHOLD" },
    { name: "Parts Auto-Reorder", status: "ACTIVE", runs_today: 4, auto_resolved: 3, escalated: 1, time_saved_hrs: 1.2, trigger: "COMPONENT_RISK_THRESHOLD" },
    { name: "Driver Alert Dispatcher", status: "ACTIVE", runs_today: 89, auto_resolved: 89, escalated: 0, time_saved_hrs: 7.4, trigger: "DRIVER_RISK_SCORE_LOW" },
    { name: "Safety Compliance Report", status: "ACTIVE", runs_today: 1, auto_resolved: 1, escalated: 0, time_saved_hrs: 3.0, trigger: "DAILY_0600_SCHEDULE" },
    { name: "SLA Breach Notifier", status: "ACTIVE", runs_today: 6, auto_resolved: 6, escalated: 0, time_saved_hrs: 0.8, trigger: "ROUTE_COMPLETION_DELAY" },
  ];
  const totalRuns = wf.reduce((s, w) => s + w.runs_today, 0);
  const totalRes = wf.reduce((s, w) => s + w.auto_resolved, 0);
  const totalSaved = wf.reduce((s, w) => s + w.time_saved_hrs, 0);
  return { workflows: wf, summary: { total_runs: totalRuns, auto_resolved: totalRes, automation_rate: round((totalRes / totalRuns) * 100, 1), hours_saved_today: totalSaved }, source: "Client-side-Workflow-Simulation" };
}

const ROUTES_TABLE = [
  ["GET", "/api/health", () => ({
    status: "ok", service: "Terex AI POC — NeoSoft Digital", version: "2.0.0",
    gcp_connected: false, project: "terex-neosoft-poc",
    algorithms: ["Z-score anomaly detection", "CV classifier YOLO v8", "Rule-based fleet intelligence agents", "Driver behavior scoring"],
    timestamp: new Date().toISOString(),
  })],
  ["GET", "/api/demo/reset-buffers", () => { resetBuffers(); return { reset: true, message: "All sensor buffers cleared" }; }],
  ["POST", "/api/demo/run-anomaly-detection", (q, body) => {
    const truckId = body?.truck_id ?? q.get("truck_id") ?? "TRUCK-003";
    const sensorType = body?.sensor_type ?? q.get("sensor_type") ?? "hydraulic_pressure";
    const forceAnomaly = body?.force_anomaly ?? (q.get("force_anomaly") === "true") ?? false;
    const value = body?.value ?? (q.has("value") ? Number(q.get("value")) : 0.0);
    const result = computeZscoreAnomaly(truckId, sensorType, value, forceAnomaly);
    if (result.is_anomaly) {
      const truck = findTruck(truckId);
      if (truck) {
        result.truck_reg = truck.truck_id;
        result.driver_name = truck.driver;
        result.area = findRoute(truck.assigned_route)?.area || "";
      }
    }
    return result;
  }],
  ["GET", "/api/demo/anomalies", () => ({ anomalies: getAnomalies().slice(0, 8), source: "Client-side-30Day-History" })],
  ["GET", "/api/demo/fleet-health", () => ({ fleet: getHealth(), source: "Real-HealthScoring-Algorithm-30Day" })],
  ["GET", "/api/demo/sensor-profiles", () => ({ profiles: SENSOR_PROFILES, total: Object.keys(SENSOR_PROFILES).length })],
  ["POST", "/api/demo/sensor-stream", (q) => {
    const truckId = q.get("truck_id") || "TRUCK-003";
    const sensorType = q.get("sensor_type") || "hydraulic_pressure";
    const injectAnomaly = q.get("inject_anomaly") === "true";
    const readings = generateSensorStream(truckId, sensorType, 20, injectAnomaly ? 10 : null);
    const results = readings.map(r => {
      const detection = computeZscoreAnomaly(truckId, sensorType, r.value, false);
      return { ...r, z_score: round(detection.z_score || 0, 3), is_anomaly: detection.is_anomaly || false, baseline_mean: detection.baseline_mean || 0 };
    });
    return { truck_id: truckId, sensor_type: sensorType, readings: results, algorithm: "Z-score rolling window N=60" };
  }],
  ["POST", "/api/demo/analyze-video", (q) => analyzeVideo(q.get("truck_id") || "TRUCK-001")],
  ["GET", "/api/demo/video-events", (q) => videoEvents(Number(q.get("limit") || 14), q.get("severity"))],
  ["GET", "/api/demo/cross-fleet-patterns", () => ({ patterns: getBi().patterns, source: "Client-side-ML-30Day" })],
  ["GET", "/api/demo/driver-behavior", () => driverBehavior()],
  ["POST", "/api/demo/safety-inspector", (q) => safetyInspector(q.get("truck_id") || "TRUCK-003")],
  ["POST", "/api/demo/maintenance-predictor", (q) => maintenancePredictor(q.get("truck_id") || "TRUCK-003")],
  ["POST", "/api/demo/route-optimizer", (q) => runRouteOptimizer(q.get("depot_id") || "DEPOT-KORAMANGALA", getBi().patterns)],
  ["POST", "/api/demo/copilot", (q, body) => runCopilot(body?.message ?? q.get("message") ?? "", body?.conversation_history ?? [])],
  ["POST", "/api/demo/simulate-truck", (q) => simulateTruck(q.get("truck_id") || "TRUCK-001", q.get("include_anomaly") === "true")],
  ["GET", "/api/demo/fleet-status", () => fleetStatus()],
  ["GET", "/api/demo/iot-devices", () => iotDevices()],
  ["POST", "/api/demo/trigger-ota", (q) => ({
    ota_triggered: true, new_version: q.get("new_version") || "v1.3",
    model_gcs_uri: "gs://terex-neosoft-poc-ota-models/backbone/latest.tflite", model_size_mb: 4.2,
    rollout_stages: [
      { stage: "5% — KA-01-AA-4521 (pilot)", devices: 1, status: "COMPLETE", started: "2 min ago" },
      { stage: "25% — 3 trucks (validation)", devices: 3, status: "IN_PROGRESS", started: "now" },
      { stage: "100% — all 10 trucks", devices: 6, status: "PENDING", started: "pending" },
    ],
    estimated_completion: "24 hours", iot_core_config_updated: false,
  })],
  ["GET", "/api/demo/training-scenarios", () => ({
    scenarios: [
      { name: "bin_missed", label: 0, status: "TRAINED", map50: 0.91, samples: 2840, description: "Refuse bin not collected — 3rd Eye® Positive Service Verification · Real-time route proof" },
      { name: "bin_overfill", label: 1, status: "TRAINED", map50: 0.88, samples: 1920, description: "Bin overflowing at collection point — 3rd Eye® Contamination Detection · BBMP compliance" },
      { name: "safety_noncompliance", label: 2, status: "TRAINED", map50: 0.85, samples: 1540, description: "PPE or safety procedure violation — 3rd Eye® Driver Safety & Coaching · HSE compliance" },
      { name: "driver_distraction", label: 3, status: "IN_TRAINING", map50: null, samples: 1280, description: "Driver attention away from road — 3rd Eye® Driver Education & Development · real-time coaching" },
      { name: "near_miss_pedestrian", label: 4, status: "IN_TRAINING", map50: null, samples: 890, description: "Pedestrian or cyclist near-miss — 3rd Eye® Safety · Heil® H.A.L.O. semi-autonomous integration" },
      { name: "near_miss_vehicle", label: 5, status: "PENDING", map50: null, samples: 640, description: "Vehicle near-miss event — 3rd Eye® Radar + Camera fusion · IRIS radar exclusion zones" },
      { name: "hazmat_detected", label: 6, status: "PENDING", map50: null, samples: 420, description: "Hazardous material in residential bin — 3rd Eye® Route Contamination Detection · BBMP hazmat protocol" },
      { name: "illegal_dumping", label: 7, status: "PENDING", map50: null, samples: 380, description: "Illegal waste deposit detected — 3rd Eye® Positive Service Verification · video evidence for BBMP" },
      { name: "lift_arm_fault", label: 8, status: "PENDING", map50: null, samples: 290, description: "Lift arm mechanical anomaly — Heil® DuraPack body camera · 3rd Eye® Fleet Maintenance integration" },
      { name: "bin_damage", label: 9, status: "PENDING", map50: null, samples: 520, description: "Physical damage to refuse bin — 3rd Eye® Customer Experience · automated damage documentation" },
    ], source: "Client-side-ModelRegistry-Simulation",
  })],
  ["POST", "/api/demo/start-training", (q) => {
    const epochs = Number(q.get("epochs") || 50);
    const now = new Date();
    return {
      status: "SUBMITTED", pipeline_name: "terex-cv-training-pipeline",
      display_name: `terex-cv-${now.toISOString().slice(0, 16).replace(/[-:T]/g, "").slice(0, 13)}`,
      epochs, machine_type: "n1-standard-4", accelerator: "NVIDIA_TESLA_T4",
      estimated_time: "45-60 minutes",
      monitor_url: "https://console.cloud.google.com/vertex-ai/pipelines?project=terex-neosoft-poc",
      steps: ["Data ingestion from GCS", "YOLO v8 fine-tuning (T4 GPU)", "Model evaluation (mAP threshold gate)", "Model Registry upload", "TFLite INT8 export", "OTA push to fleet"],
      submitted_at: now.toISOString(),
    };
  }],
  ["GET", "/api/demo/microservices-health", () => ({
    services: [
      { name: "sensor-ingestion-svc", lang: "Python", status: "RUNNING", instances: 3, cpu: 23, mem: 41, latency_ms: 12, endpoint: "/api/v1/sensors" },
      { name: "video-classification-svc", lang: "Python", status: "RUNNING", instances: 2, cpu: 67, mem: 72, latency_ms: 180, endpoint: "/api/v1/video" },
      { name: "edge-ota-svc", lang: "Python", status: "RUNNING", instances: 1, cpu: 8, mem: 22, latency_ms: 45, endpoint: "/api/v1/ota" },
      { name: "alert-router-svc", lang: "Java", status: "RUNNING", instances: 2, cpu: 31, mem: 55, latency_ms: 8, endpoint: "/api/v1/alerts" },
      { name: "parts-integration-svc", lang: "Java", status: "RUNNING", instances: 1, cpu: 15, mem: 38, latency_ms: 220, endpoint: "/api/v1/parts" },
      { name: "driver-scoring-svc", lang: "Python", status: "RUNNING", instances: 2, cpu: 44, mem: 60, latency_ms: 95, endpoint: "/api/v1/drivers" },
      { name: "route-analytics-svc", lang: "Java", status: "RUNNING", instances: 1, cpu: 19, mem: 35, latency_ms: 65, endpoint: "/api/v1/routes" },
      { name: "rpa-workflow-svc", lang: "Python", status: "RUNNING", instances: 2, cpu: 28, mem: 48, latency_ms: 32, endpoint: "/api/v1/rpa" },
      { name: "bi-reporting-svc", lang: "Java", status: "WARNING", instances: 1, cpu: 88, mem: 91, latency_ms: 450, endpoint: "/api/v1/bi" },
      { name: "model-serving-svc", lang: "Python", status: "RUNNING", instances: 3, cpu: 52, mem: 68, latency_ms: 85, endpoint: "/api/v1/model" },
    ], total: 10, healthy: 9, source: "Client-side-Simulation",
  })],
  ["GET", "/api/demo/rpa-workflows", () => rpaWorkflows()],
  ["GET", "/api/demo/rpa-simulate/", (q, body, workflow) => rpaSimulate(workflow)],
  ["GET", "/api/demo/bi-analytics", () => getBi()],
  ["GET", "/api/demo/devops-pipeline", () => ({
    pipelines: [
      { name: "cv-model-training", status: "SUCCESS", last_run: "2h ago", duration: "48min", trigger: "new_training_data", env: "vertex-ai" },
      { name: "sensor-pipeline-deploy", status: "SUCCESS", last_run: "6h ago", duration: "4min", trigger: "git_push_main", env: "dataflow" },
      { name: "video-pipeline-deploy", status: "SUCCESS", last_run: "6h ago", duration: "5min", trigger: "git_push_main", env: "dataflow" },
      { name: "edge-model-ota", status: "RUNNING", last_run: "now", duration: "ongoing", trigger: "model_registry_update", env: "iot-core" },
      { name: "backend-services", status: "SUCCESS", last_run: "3h ago", duration: "2min", trigger: "git_push_main", env: "cloud-run" },
      { name: "integration-tests", status: "SUCCESS", last_run: "3h ago", duration: "8min", trigger: "post_deploy", env: "cloud-build" },
    ],
    environments: { dev: { status: "HEALTHY", last_deploy: "1h ago", version: "v1.3-dev" }, staging: { status: "HEALTHY", last_deploy: "3h ago", version: "v1.2.1" }, prod: { status: "HEALTHY", last_deploy: "6h ago", version: "v1.2" } },
    source: "Client-side-Simulation",
  })],
  ["GET", "/api/demo/api-management", () => ({
    apis: [
      { name: "Sensor Telemetry API", version: "v2", calls_today: 284920, p99_ms: 45, errors: 0.01, auth: "JWT", docs: "/docs/sensor-api" },
      { name: "Video Events API", version: "v2", calls_today: 42180, p99_ms: 180, errors: 0.05, auth: "JWT", docs: "/docs/video-api" },
      { name: "Edge OTA API", version: "v1", calls_today: 1240, p99_ms: 90, errors: 0.00, auth: "mTLS", docs: "/docs/ota-api" },
      { name: "Fleet Management API", version: "v2", calls_today: 18440, p99_ms: 65, errors: 0.02, auth: "JWT", docs: "/docs/fleet-api" },
      { name: "Driver Behavior API", version: "v1", calls_today: 8920, p99_ms: 95, errors: 0.00, auth: "JWT", docs: "/docs/driver-api" },
      { name: "Parts Central Webhook", version: "v1", calls_today: 42, p99_ms: 220, errors: 0.00, auth: "HMAC", docs: "/docs/parts-api" },
      { name: "BI Reporting API", version: "v1", calls_today: 3240, p99_ms: 340, errors: 0.08, auth: "JWT", docs: "/docs/bi-api" },
    ], gateway: "GCP-Apigee", total_calls_today: 359002, avg_latency_ms: 124, source: "Client-side-Simulation",
  })],
  ["GET", "/api/demo/live-stats", () => {
    const live = getLiveEvents(20);
    const bi = getBi();
    const newEvent = generateLiveEvent();
    return { new_event: newEvent, live_event_count: live.length, automation_rate: bi.automation_rate, timestamp: new Date().toISOString() };
  }],
];

function round(v, digits) {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
function jitter() { return (Math.random() - 0.5) * 0.02; }

// `path` is a full path like "/api/demo/fleet-status?truck_id=X" (matches what App.jsx built for fetch()).
export async function localApi(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  const [pathname, search] = path.split("?");
  const q = new URLSearchParams(search || "");
  let body = null;
  if (opts.body) {
    try { body = typeof opts.body === "string" ? JSON.parse(opts.body) : opts.body; } catch { body = null; }
  }

  if (pathname.startsWith("/api/demo/rpa-simulate/")) {
    const workflow = pathname.slice("/api/demo/rpa-simulate/".length);
    return rpaSimulate(workflow);
  }

  const match = ROUTES_TABLE.find(([m, p]) => m === method && p === pathname);
  if (!match) {
    throw new Error(`No local handler for ${method} ${pathname}`);
  }
  return match[2](q, body);
}
