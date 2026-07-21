// Ported from backend/algorithms/anomaly_detection.py — Z-score anomaly detection.

import { uniform, gauss, mean, stdev, shortId } from "./rng.js";

export const SENSOR_PROFILES = {
  hydraulic_pressure: { unit: "bar", component: "hydraulic_seal", normal_range: [160, 200], critical_z: 2.5, hours_to_failure: 72, sku: "HYD-SEAL-HEIL-2024", description: "Main lift hydraulic circuit pressure" },
  vibration_rms: { unit: "g", component: "packer_blade", normal_range: [0.5, 1.2], critical_z: 2.5, hours_to_failure: 48, sku: "PACK-BLADE-STD-006", description: "Packer mechanism vibration RMS" },
  temperature_engine: { unit: "°C", component: "cooling_system", normal_range: [82, 102], critical_z: 2.5, hours_to_failure: 96, sku: "COOL-PUMP-ASSEMBLY", description: "Engine coolant temperature" },
  hydraulic_lift_pressure: { unit: "bar", component: "lift_arm", normal_range: [130, 170], critical_z: 2.5, hours_to_failure: 60, sku: "LIFT-ARM-BUSHING-KIT", description: "Lift arm hydraulic pressure" },
  can_brake_pressure: { unit: "bar", component: "brake_system", normal_range: [6.5, 9.5], critical_z: 2.5, hours_to_failure: 48, sku: "BRAKE-PAD-HEAVY-DUTY", description: "Service brake air pressure" },
  packer_cycle_time: { unit: "sec", component: "packer_mechanism", normal_range: [8, 15], critical_z: 2.0, hours_to_failure: 168, sku: "PACKER-CYLINDER-SEAL", description: "Time for one full packer cycle" },
  fuel_consumption_rate: { unit: "L/hr", component: "fuel_system", normal_range: [18, 32], critical_z: 2.5, hours_to_failure: 120, sku: "FUEL-INJECTOR-HEIL", description: "Instantaneous fuel consumption" },
  battery_voltage: { unit: "V", component: "electrical_system", normal_range: [12.0, 14.8], critical_z: 2.5, hours_to_failure: 96, sku: "BATTERY-TRUCK-AGM", description: "Main electrical system voltage" },
};

// In-memory rolling buffer per (truck_id, sensor_type) — mirrors the stateful Dataflow operator.
let _sensorBuffers = new Map();
const BUFFER_SIZE = 60;

function bufferKey(truckId, sensorType) { return `${truckId}::${sensorType}`; }

function getOrCreateBuffer(truckId, sensorType) {
  const key = bufferKey(truckId, sensorType);
  if (!_sensorBuffers.has(key)) {
    const profile = SENSOR_PROFILES[sensorType] || {};
    const [low, high] = profile.normal_range || [80, 120];
    const m = (low + high) / 2;
    const std = (high - low) / 6;
    const seed = Array.from({ length: 40 }, () => m + gauss(0, std * 0.45));
    _sensorBuffers.set(key, seed);
  }
  return _sensorBuffers.get(key);
}

export function resetBuffers() {
  _sensorBuffers = new Map();
}

export function computeZscoreAnomaly(truckId, sensorType, value, forceAnomaly = false) {
  const profile = SENSOR_PROFILES[sensorType];
  if (!profile) return { error: `Unknown sensor type: ${sensorType}` };

  if (forceAnomaly) {
    const [low, high] = profile.normal_range;
    const meanNormal = (low + high) / 2;
    value = Math.round(meanNormal * uniform(1.45, 1.75) * 1000) / 1000;
  }

  let buffer = getOrCreateBuffer(truckId, sensorType);
  const readings = buffer.slice();
  const n = readings.length;
  const m = mean(readings);
  const std = stdev(readings);

  const zScore = Math.abs((value - m) / std);
  const threshold = profile.critical_z;
  const isAnomaly = zScore >= threshold;

  buffer.push(value);
  if (buffer.length > BUFFER_SIZE) buffer.shift();

  const prev = readings.length ? readings[readings.length - 1] : value;
  const roc = (value - prev) / Math.max(Math.abs(prev), 1e-6);

  const result = {
    truck_id: truckId,
    sensor_type: sensorType,
    sensor_id: `${sensorType}_${truckId}_001`,
    component: profile.component,
    description: profile.description,
    unit: profile.unit,
    current_value: round(value, 3),
    baseline_mean: round(m, 3),
    baseline_std: round(std, 4),
    z_score: round(zScore, 4),
    anomaly_score: round(Math.min(1.0, zScore / (threshold * 2)), 4),
    threshold,
    is_anomaly: isAnomaly,
    rate_of_change: round(roc, 4),
    normal_range: [...profile.normal_range],
    buffer_size: buffer.length,
    rolling_mean_1h: round(m, 3),
    rolling_std_1h: round(std, 4),
    algorithm: "Z-score rolling window (N=60)",
    dataflow_job: "terex-sensor-health-pipeline",
    bigquery_table: "terex_poc.sensor_anomalies",
    computed_at: new Date().toISOString(),
  };

  if (isAnomaly) {
    const anomalyId = crypto.randomUUID();
    const predictedFailure = new Date(Date.now() + profile.hours_to_failure * 3600 * 1000);
    Object.assign(result, {
      anomaly_id: anomalyId,
      hours_to_failure: profile.hours_to_failure,
      predicted_failure: predictedFailure.toISOString(),
      severity: zScore > threshold * 1.5 ? "CRITICAL" : "HIGH",
      parts_order: {
        order_id: `PO-${anomalyId.slice(0, 6).toUpperCase()}`,
        sku: profile.sku,
        component: profile.component,
        truck_id: truckId,
        status: "PENDING_APPROVAL",
        parts_central_api: "https://api.partscentral.terex.com/v1/orders",
        auto_raised: true,
      },
      rpa_ticket_id: `TICK-${anomalyId.slice(0, 6).toUpperCase()}`,
      rpa_action: "MAINTENANCE_TICKET_AUTO_CREATED",
    });
  }

  return result;
}

export function runFleetHealthScoring(fleetAnomalies) {
  const truckAnomalies = new Map();
  for (const a of fleetAnomalies) {
    if (!truckAnomalies.has(a.truck_id)) truckAnomalies.set(a.truck_id, []);
    truckAnomalies.get(a.truck_id).push(a);
  }

  const results = [];
  for (let i = 1; i <= 10; i++) {
    const truckId = `TRUCK-${String(i).padStart(3, "0")}`;
    const anomalies = truckAnomalies.get(truckId) || [];
    const n = anomalies.length;
    const maxZ = anomalies.reduce((m, a) => Math.max(m, a.z_score || 0), 0);
    const criticalComponents = ["hydraulic_seal", "brake_system"];
    const hasCritical = anomalies.some(a => criticalComponents.includes(a.component));

    let status, score;
    if (n >= 4 || maxZ > 3.5 || (hasCritical && n >= 2)) {
      status = "RED"; score = Math.max(20, 60 - n * 8);
    } else if (n >= 2 || maxZ >= 2.8) {
      status = "AMBER"; score = Math.max(45, 80 - n * 5);
    } else {
      status = "GREEN"; score = Math.min(100, 95 - n * 3);
    }

    results.push({
      truck_id: truckId,
      health_status: status,
      health_score: score,
      total_anomalies: n,
      critical_count: anomalies.filter(a => (a.z_score || 0) > 3.0).length,
      max_z_score: round(maxZ, 2),
      last_anomaly: n ? anomalies[n - 1].computed_at : null,
      algorithm: "Weighted multi-sensor health scoring v1.0",
    });
  }

  return results.sort((a, b) => a.health_score - b.health_score);
}

export function generateSensorStream(truckId, sensorType, nReadings = 10, injectAnomalyAt = null) {
  const profile = SENSOR_PROFILES[sensorType] || {};
  const [low, high] = profile.normal_range || [80, 120];
  const m = (low + high) / 2;
  const std = (high - low) / 8;

  const readings = [];
  for (let i = 0; i < nReadings; i++) {
    const isSpike = injectAnomalyAt !== null && i === injectAnomalyAt;
    const multiplier = isSpike ? uniform(1.5, 1.8) : 1.0;
    const noise = gauss(0, std * 0.3);
    const value = round(m * multiplier + noise, 3);
    readings.push({
      index: i,
      value,
      timestamp: new Date(Date.now() - (nReadings - i) * 60000).toISOString(),
      is_injected: isSpike,
    });
  }
  return readings;
}

function round(v, digits) {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
