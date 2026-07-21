// Ported from backend/services/realistic_data.py — 30-day pre-seeded realistic fleet history.

import { uniform, randint, choicesWeighted, shortId } from "./rng.js";
import { TRUCKS, ROUTES } from "./data.js";

// Real Heil DuraPack service-manual specs, used only for the pre-seeded 30-day anomaly history
// (separate from anomalyDetection.js's SENSOR_PROFILES, which the live detection endpoints use).
const REALISTIC_SENSOR_PROFILES = {
  hydraulic_pressure: { unit: "bar", component: "hydraulic_seal", normal_range: [148.0, 172.4], hours_to_failure: 72, sku: "031-6392", sku_desc: "RELIEF VALVE 2000 PSI", can_bus: "body_can", source: "Heil DuraPack Service Manual (ManualsLib)" },
  vibration_rms: { unit: "g", component: "packer_blade", normal_range: [0.50, 1.20], hours_to_failure: 48, sku: "272-1870", sku_desc: "PACKER MECHANISM ASSEMBLY", can_bus: "body_can", source: "ISO 10816-1 heavy machinery vibration standard" },
  temperature_engine: { unit: "°C", component: "cooling_system", normal_range: [82.0, 102.0], hours_to_failure: 96, sku: "COOL-PUMP-HEIL-001", sku_desc: "COOLANT PUMP ASSEMBLY", can_bus: "chassis_can", source: "SAE J1939 heavy vehicle standard, Heil warmup spec 48.9°C min" },
  hydraulic_lift_pressure: { unit: "bar", component: "lift_arm", normal_range: [82.7, 162.0], hours_to_failure: 60, sku: "031-6227", sku_desc: "REGENERATIVE DUMP VALVE", can_bus: "body_can", source: "Heil DuraPack Rapid Rail Service Manual p.89" },
};

const ROUTE_EVENT_PROFILES = {
  HIGH: [
    ["near_miss_pedestrian", "CRITICAL", 0.09], ["safety_noncompliance", "HIGH", 0.11],
    ["hazmat_detected", "CRITICAL", 0.03], ["driver_distraction", "MEDIUM", 0.17],
    ["bin_missed", "LOW", 0.22], ["bin_overfill", "MEDIUM", 0.14],
    ["illegal_dumping", "HIGH", 0.07], ["lift_arm_fault", "HIGH", 0.05],
    ["bin_damage", "LOW", 0.08], ["near_miss_vehicle", "CRITICAL", 0.04],
  ],
  MEDIUM: [
    ["near_miss_pedestrian", "CRITICAL", 0.04], ["safety_noncompliance", "HIGH", 0.09],
    ["driver_distraction", "MEDIUM", 0.15], ["bin_missed", "LOW", 0.28],
    ["bin_overfill", "MEDIUM", 0.18], ["lift_arm_fault", "HIGH", 0.07],
    ["illegal_dumping", "HIGH", 0.04], ["bin_damage", "LOW", 0.12],
    ["near_miss_vehicle", "CRITICAL", 0.03],
  ],
  LOW: [
    ["near_miss_pedestrian", "CRITICAL", 0.01], ["safety_noncompliance", "HIGH", 0.05],
    ["driver_distraction", "MEDIUM", 0.10], ["bin_missed", "LOW", 0.36],
    ["bin_overfill", "MEDIUM", 0.20], ["lift_arm_fault", "HIGH", 0.06],
    ["bin_damage", "LOW", 0.16], ["illegal_dumping", "HIGH", 0.02],
    ["near_miss_vehicle", "CRITICAL", 0.04],
  ],
};

const CONF_RANGES = {
  bin_missed: [0.84, 0.97], bin_overfill: [0.80, 0.95], safety_noncompliance: [0.72, 0.91],
  driver_distraction: [0.68, 0.87], near_miss_pedestrian: [0.79, 0.96], near_miss_vehicle: [0.81, 0.95],
  hazmat_detected: [0.65, 0.86], illegal_dumping: [0.71, 0.90], lift_arm_fault: [0.77, 0.93], bin_damage: [0.74, 0.92],
};

function makeEvent(truck, route, daysAgo, eventType, severity, confidence, eventTime) {
  const lat = round(route.gps_center[0] + uniform(-0.014, 0.014), 6);
  const lng = round(route.gps_center[1] + uniform(-0.014, 0.014), 6);
  return {
    event_id: shortId(12),
    truck_id: truck.short_id,
    truck_reg: truck.truck_id,
    driver_id: truck.driver_id,
    driver_name: truck.driver,
    camera_id: `3REYE-${truck.short_id}-CAM01`,
    event_type: eventType,
    severity,
    confidence_score: confidence,
    event_timestamp: eventTime.toISOString(),
    route_id: route.route_id,
    route_name: route.name,
    bbmp_zone: route.bbmp_zone,
    depot_id: route.depot,
    area: route.area,
    latitude: lat,
    longitude: lng,
    model_version: "v1.2",
    reviewed_by_human: (severity === "HIGH" || severity === "CRITICAL") && Math.random() > 0.35,
    rpa_processed: true,
    days_ago: daysAgo,
    is_live: false,
  };
}

function pickEventType(profile) {
  const types = profile.map(p => p[0]);
  const weights = profile.map(p => p[2]);
  const et = choicesWeighted(types, weights, 1)[0];
  const sev = profile.find(p => p[0] === et)[1];
  return [et, sev];
}

export function generate30DayVideoEvents() {
  const events = [];
  const now = new Date();

  for (let daysAgo = 30; daysAgo >= 1; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    for (const truck of TRUCKS) {
      const route = ROUTES.find(r => r.route_id === truck.assigned_route);
      const profile = ROUTE_EVENT_PROFILES[route.risk_level];

      const [startH, startM] = route.collection_start.split(":").map(Number);
      const [endH] = route.collection_end.split(":").map(Number);
      const durationMins = (endH - startH) * 60;

      const nEvents = randint(2, 6);

      for (let i = 0; i < nEvents; i++) {
        const offsetMins = randint(5, durationMins - 10);
        const eventTime = new Date(date);
        eventTime.setHours(startH, startM, 0, 0);
        eventTime.setMinutes(eventTime.getMinutes() + offsetMins);

        let et, sev;
        if (truck.short_id === "TRUCK-003" && route.school_zone) {
          const hour = eventTime.getHours();
          if (hour >= 8 && hour <= 9) {
            if (Math.random() < 0.38) { et = "near_miss_pedestrian"; sev = "CRITICAL"; }
            else [et, sev] = pickEventType(profile);
          } else {
            [et, sev] = pickEventType(profile);
          }
        } else if (truck.short_id === "TRUCK-007" && daysAgo === 5) {
          if (Math.random() < 0.55) { et = "near_miss_pedestrian"; sev = "CRITICAL"; }
          else [et, sev] = pickEventType(profile);
        } else {
          [et, sev] = pickEventType(profile);
        }

        const [lo, hi] = CONF_RANGES[et] || [0.72, 0.94];
        const conf = round(uniform(lo, hi), 3);

        events.push(makeEvent(truck, route, daysAgo, et, sev, conf, eventTime));
      }
    }
  }

  events.sort((a, b) => (a.event_timestamp < b.event_timestamp ? 1 : -1));
  return events;
}

function makeAnomaly(truck, sensorType, daysAgo, zscore, poCounter) {
  const profile = REALISTIC_SENSOR_PROFILES[sensorType];
  const [lo, hi] = profile.normal_range;
  const m = (lo + hi) / 2;
  const std = (hi - lo) / 6;
  const current = round(m + zscore * std + uniform(-std * 0.1, std * 0.1), 3);
  const hrs = profile.hours_to_failure;
  poCounter.n += 1;
  const orderId = `PO-BLR-${String(poCounter.n).padStart(4, "0")}`;
  const route = ROUTES.find(r => r.route_id === truck.assigned_route);
  const now = new Date();
  const detectedAt = new Date(now);
  detectedAt.setDate(detectedAt.getDate() - daysAgo);
  detectedAt.setHours(detectedAt.getHours() - randint(6, 18));
  const predictedFailure = new Date(now);
  predictedFailure.setDate(predictedFailure.getDate() - daysAgo);
  predictedFailure.setHours(predictedFailure.getHours() + hrs);

  return {
    anomaly_id: shortId(10),
    truck_id: truck.short_id,
    truck_reg: truck.truck_id,
    driver_name: truck.driver,
    sensor_id: `${sensorType}_${truck.short_id}_001`,
    sensor_type: sensorType,
    component: profile.component,
    component_desc: `${profile.sku_desc} (${profile.sku})`,
    unit: profile.unit,
    normal_range: [...profile.normal_range],
    baseline_value: round(m, 3),
    current_value: current,
    z_score: round(zscore, 2),
    anomaly_score: round(Math.min(1.0, zscore / 6.0), 3),
    hours_to_failure: hrs,
    detected_at: detectedAt.toISOString(),
    predicted_failure: predictedFailure.toISOString(),
    alert_sent: true,
    parts_order_id: orderId,
    parts_sku: profile.sku,
    parts_desc: profile.sku_desc,
    model_version: "v1.0",
    route_id: truck.assigned_route,
    area: route.area,
    can_bus: profile.can_bus,
    data_source: profile.source,
  };
}

export function generateSensorHistory() {
  const poCounter = { n: 1041 };
  const t003 = TRUCKS.find(t => t.short_id === "TRUCK-003");
  const t007 = TRUCKS.find(t => t.short_id === "TRUCK-007");
  const t001 = TRUCKS.find(t => t.short_id === "TRUCK-001");

  const anomalies = [
    makeAnomaly(t003, "hydraulic_pressure", 18, 2.6, poCounter),
    makeAnomaly(t003, "hydraulic_pressure", 10, 2.8, poCounter),
    makeAnomaly(t003, "vibration_rms", 8, 2.7, poCounter),
    makeAnomaly(t003, "hydraulic_pressure", 3, 3.1, poCounter),
    makeAnomaly(t003, "hydraulic_lift_pressure", 3, 2.9, poCounter),
    makeAnomaly(t007, "vibration_rms", 5, 3.4, poCounter),
    makeAnomaly(t007, "hydraulic_pressure", 5, 2.7, poCounter),
    makeAnomaly(t001, "temperature_engine", 7, 2.6, poCounter),
  ];

  anomalies.sort((a, b) => (a.detected_at < b.detected_at ? 1 : -1));
  return anomalies;
}

export function getFleetHealthStatus() {
  const anomalies = generateSensorHistory();
  const truckAnomalies = new Map();
  for (const a of anomalies) {
    if (!truckAnomalies.has(a.truck_id)) truckAnomalies.set(a.truck_id, []);
    truckAnomalies.get(a.truck_id).push(a);
  }

  const results = TRUCKS.map(truck => {
    const tid = truck.short_id;
    const ta = truckAnomalies.get(tid) || [];
    const n = ta.length;
    const maxZ = ta.reduce((m, a) => Math.max(m, a.z_score), 0);
    const route = ROUTES.find(r => r.route_id === truck.assigned_route);

    let status, score;
    if (n >= 4 || (n >= 3 && maxZ >= 3.0)) { status = "RED"; score = Math.max(20, 65 - n * 8); }
    else if (n >= 2 || maxZ >= 2.7) { status = "AMBER"; score = Math.max(45, 82 - n * 6); }
    else { status = "GREEN"; score = 94; }

    return {
      truck_id: tid,
      truck_reg: truck.truck_id,
      driver_name: truck.driver,
      driver_id: truck.driver_id,
      model: truck.model,
      year: truck.year,
      mileage_km: truck.mileage_km,
      health_status: status,
      health_score: score,
      total_anomalies: n,
      critical_count: ta.filter(a => a.z_score >= 3.0).length,
      max_z_score: round(maxZ, 2),
      assigned_route: route.name,
      area: route.area,
      bbmp_zone: route.bbmp_zone,
      last_anomaly: n ? ta[0].detected_at : null,
    };
  });

  return results.sort((a, b) => a.health_score - b.health_score);
}

export function getBiKpis() {
  const events = generate30DayVideoEvents();
  const anomalies = generateSensorHistory();

  const total = events.length;
  const weekEvents = events.filter(e => e.days_ago <= 7);
  const weekTotal = weekEvents.length;
  const weekAuto = weekEvents.filter(e => !e.reviewed_by_human).length;
  const weekRate = round((weekAuto / Math.max(weekTotal, 1)) * 100, 1);

  const daily = {};
  for (let d = 1; d <= 7; d++) daily[d] = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const e of weekEvents) {
    const d = e.days_ago;
    const s = e.severity.toLowerCase();
    if (daily[d] && s in daily[d]) daily[d][s] += 1;
  }

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayWd = (new Date().getDay() + 6) % 7; // Python: Mon=0..Sun=6
  const dowMultipliers = { 0: 1.35, 1: 1.15, 2: 1.0, 3: 0.95, 4: 1.1, 5: 0.65, 6: 0.50 };

  for (let daysAgo = 1; daysAgo <= 7; daysAgo++) {
    const wd = ((todayWd - daysAgo) % 7 + 7) % 7;
    const mult = dowMultipliers[wd];
    const d = daily[daysAgo];
    daily[daysAgo] = {
      critical: Math.max(0, Math.round(d.critical * mult)),
      high: Math.max(0, Math.round(d.high * mult)),
      medium: Math.max(0, Math.round(d.medium * mult)),
      low: Math.max(0, Math.round(d.low * mult)),
    };
  }

  const nowHour = new Date().getHours();
  const collectionProgress = nowHour > 14 ? 1.0 : nowHour >= 5 ? Math.max(0, Math.min(1.0, (nowHour - 5) / 9.0)) : 0.0;
  const yesterday = daily[1];
  const todayScale = collectionProgress * 0.85;
  daily[0] = {
    critical: Math.max(1, Math.round(yesterday.critical * todayScale)),
    high: Math.max(1, Math.round(yesterday.high * todayScale)),
    medium: Math.max(2, Math.round(yesterday.medium * todayScale)),
    low: Math.max(2, Math.round(yesterday.low * todayScale)),
  };

  const weekly = [];
  for (let i = 6; i >= 0; i--) {
    const d = daily[i];
    const label = i === 0 ? "Today" : dayNames[((todayWd - i) % 7 + 7) % 7];
    weekly.push({ day: label, critical: d.critical, high: d.high, medium: d.medium, low: d.low });
  }

  const routeStats = new Map();
  for (const e of events) {
    const rid = e.route_id;
    if (!routeStats.has(rid)) routeStats.set(rid, { total: 0, high_sev: 0, pedestrian: 0, hazmat: 0, fatigue: 0 });
    const s = routeStats.get(rid);
    s.total += 1;
    if (e.severity === "HIGH" || e.severity === "CRITICAL") s.high_sev += 1;
    if (e.event_type === "near_miss_pedestrian") s.pedestrian += 1;
    if (e.event_type === "hazmat_detected") s.hazmat += 1;
    if (e.event_type === "driver_distraction") s.fatigue += 1;
  }

  const patterns = [];
  for (const [rid, stats] of routeStats) {
    const route = ROUTES.find(r => r.route_id === rid);
    if (route && stats.total > 0) {
      patterns.push({
        route_id: rid,
        route_name: route.name,
        area: route.area,
        bbmp_zone: route.bbmp_zone,
        depot_id: route.depot,
        total_events: stats.total,
        high_severity_events: stats.high_sev,
        pedestrian_near_misses: stats.pedestrian,
        hazmat_events: stats.hazmat,
        driver_fatigue_events: stats.fatigue,
        risk_rate: round(stats.high_sev / stats.total, 3),
        school_zone: route.school_zone,
        collection_start: route.collection_start,
        households: route.households,
      });
    }
  }
  patterns.sort((a, b) => b.risk_rate - a.risk_rate);

  return {
    kpis: {
      collection_efficiency: { value: 94.2, unit: "%", trend: "UP", vs_last_week: 2.1, note: "BBMP target: 94.2% collection efficiency per ward microplan" },
      ai_automation_rate: { value: weekRate, unit: "%", trend: "UP", vs_last_week: 8.3 },
      mean_time_to_detect: { value: 4.2, unit: "min", trend: "DOWN", vs_last_week: -12.5 },
      unplanned_downtime: { value: 1.8, unit: "hrs/week", trend: "DOWN", vs_last_week: -34.0 },
      manual_review_hours: { value: 2.1, unit: "hrs/day", trend: "DOWN", vs_last_week: -87.0 },
      parts_stockout_rate: { value: 0.0, unit: "%", trend: "FLAT", vs_last_week: 0 },
    },
    weekly_events: weekly,
    patterns,
    total_30d: total,
    automation_rate: weekRate,
    top_insights: [
      "BLR-R02-KORAMANGALA: 08:15 dispatch overlaps school zone 08:30-09:15 (National Public School) — HSE guidance mandates avoiding school start/finish times",
      "KA-01-AA-4523 (TRUCK-003) hydraulic seal Z-score escalated 2.6→3.1 over 18 days — Heil service manual: lift control valve checks every 1000hrs — Parts order PO-BLR-1044 pending",
      "Driver Manjunath S (DRV-003) highest distraction rate — 5 events on BLR-R02 Koramangala morning shift correlating with school zone hours",
      `AI automation rate ${weekRate}% this week — 30-day baseline ${round((events.filter(e => !e.reviewed_by_human).length / Math.max(total, 1)) * 100, 1)}% — model v1.2 improving`,
    ],
    source: "BBMP Public Data + Heil Service Manual (client-side simulation)",
  };
}

// ── Caching — mirrors the Python module-level lazy singletons (per page load) ──
let _eventsCache = null, _anomaliesCache = null, _healthCache = null;

export function getEvents() {
  if (_eventsCache === null) _eventsCache = generate30DayVideoEvents();
  return _eventsCache;
}
export function getAnomalies() {
  if (_anomaliesCache === null) _anomaliesCache = generateSensorHistory();
  return _anomaliesCache;
}
export function getHealth() {
  if (_healthCache === null) _healthCache = getFleetHealthStatus();
  return _healthCache;
}
export function getBi() {
  return getBiKpis();
}
export function getRoutes() { return ROUTES; }
export function getTrucks() { return TRUCKS; }

// ── Live event generator ────────────────────────────────────────────────────
let _liveEvents = [];
let _lastLiveTime = 0;

export function generateLiveEvent() {
  const now = new Date();
  const hour = now.getHours();
  const activeTrucks = (hour >= 5 && hour <= 14) ? TRUCKS : TRUCKS.slice(0, 5);
  const truck = activeTrucks[Math.floor(Math.random() * activeTrucks.length)];
  const route = ROUTES.find(r => r.route_id === truck.assigned_route);
  const profile = ROUTE_EVENT_PROFILES[route.risk_level];

  const isSchoolConflict = route.school_zone && route.school_timing &&
    hour === Number(route.collection_start.split(":")[0]);

  let et, sev, conf;
  if (isSchoolConflict && Math.random() < 0.40) {
    et = "near_miss_pedestrian"; sev = "CRITICAL";
    conf = round(uniform(0.83, 0.97), 3);
  } else {
    [et, sev] = pickEventType(profile);
    const [lo, hi] = CONF_RANGES[et] || [0.72, 0.94];
    conf = round(uniform(lo, hi), 3);
  }

  const lat = round(route.gps_center[0] + uniform(-0.014, 0.014), 6);
  const lng = round(route.gps_center[1] + uniform(-0.014, 0.014), 6);

  return {
    event_id: shortId(12),
    truck_id: truck.short_id, truck_reg: truck.truck_id,
    driver_id: truck.driver_id, driver_name: truck.driver,
    camera_id: `3REYE-${truck.short_id}-CAM01`,
    event_type: et, severity: sev, confidence_score: conf,
    event_timestamp: now.toISOString(),
    route_id: route.route_id, route_name: route.name,
    bbmp_zone: route.bbmp_zone, depot_id: route.depot,
    area: route.area, latitude: lat, longitude: lng,
    model_version: "v1.2", reviewed_by_human: false,
    rpa_processed: true, is_live: true, days_ago: 0,
  };
}

export function getLiveEvents(maxLive = 6) {
  const now = Date.now() / 1000;
  if (now - _lastLiveTime >= 30) {
    _liveEvents.unshift(generateLiveEvent());
    _liveEvents = _liveEvents.slice(0, 20);
    _lastLiveTime = now;
  }
  return _liveEvents.slice(0, maxLive);
}

function round(v, digits) {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
