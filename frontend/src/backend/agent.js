// Ported from backend/agents/gemini_agent.py — algorithmic fallback logic only.
// The real Vertex AI Gemini calls are dropped: this app has no server to hold GCP
// credentials, and the Render deployment already always ran in fallback mode in
// production (is_gcp_available() was never true there), so behavior is unchanged.

import { TRUCKS, ROUTES } from "./data.js";

export function runSafetyInspector(truckId, eventsData) {
  const critical = eventsData.filter(e => e.severity === "CRITICAL");
  const high = eventsData.filter(e => e.severity === "HIGH");
  const eventTypes = {};
  for (const e of eventsData) {
    const et = e.event_type || "unknown";
    eventTypes[et] = (eventTypes[et] || 0) + 1;
  }

  const analysis = safetyAnalysisFallback(truckId, eventsData, eventTypes, critical, high);

  return {
    agent: "Safety Inspector",
    model: "Algorithmic Analysis v1.0",
    truck_id: truckId,
    events_analyzed: eventsData.length,
    analysis,
    data_source: "Client-side 30-day event simulation",
    generated_at: new Date().toISOString(),
  };
}

function safetyAnalysisFallback(truckId, events, eventTypes, critical, high) {
  const n = events.length;
  const score = Math.max(0, 100 - critical.length * 20 - high.length * 10 - (n - critical.length - high.length) * 2);

  const t = TRUCKS.find(t => t.short_id === truckId);
  let truckReg = truckId, driver = "", routeName = "route", schoolRisk = false, schoolTiming = "", collectionStart = "";
  if (t) {
    truckReg = t.truck_id;
    driver = t.driver;
    const route = ROUTES.find(r => r.route_id === t.assigned_route);
    if (route) {
      routeName = route.name;
      schoolRisk = !!route.school_zone;
      schoolTiming = route.school_timing || "";
      collectionStart = route.collection_start || "";
    }
  }

  const nearMiss = (eventTypes.near_miss_pedestrian || 0) + (eventTypes.near_miss_vehicle || 0);
  const distraction = eventTypes.driver_distraction || 0;

  const risksOut = [];
  if (nearMiss > 0) {
    risksOut.push({
      risk: "Pedestrian Near-Miss",
      frequency: `${nearMiss} events / 7 days`,
      location_or_time: schoolRisk ? `${routeName} — ${collectionStart} dispatch vs ${schoolTiming} school zone` : routeName,
      severity: "CRITICAL",
    });
  }
  const sortedTypes = Object.entries(eventTypes).sort((a, b) => b[1] - a[1]);
  for (const [et, count] of sortedTypes.slice(0, 2)) {
    if (et !== "near_miss_pedestrian" && et !== "near_miss_vehicle") {
      const sev = (events.find(e => e.event_type === et) || {}).severity || "MEDIUM";
      risksOut.push({ risk: titleCase(et), frequency: `${count} events / 7 days`, location_or_time: routeName, severity: sev });
    }
  }

  const rootCauses = [];
  if (schoolRisk && nearMiss > 0) {
    rootCauses.push(`Dispatch at ${collectionStart} conflicts with school zone active ${schoolTiming} on ${routeName} — direct overlap causing near-miss pattern`);
  }
  if (distraction > 2) {
    rootCauses.push(`Driver distraction pattern (${distraction} events) correlates with 05:30 BBMP muster time — early shift fatigue indicator`);
  }
  rootCauses.push("3rd Eye camera angle at depot entry creates blind spot — PPE non-compliance events occurring at ingress");

  const recommendations = [];
  if (schoolRisk && nearMiss > 0) {
    recommendations.push(`Reschedule ${truckReg} on ${routeName}: shift departure from ${collectionStart} to 06:30 — eliminates school zone overlap entirely`);
  }
  if (distraction > 2) {
    recommendations.push(`Flag ${driver} for mandatory defensive driving assessment — ${distraction} distraction events in 7 days exceeds fleet threshold of 2`);
  }
  recommendations.push("Adjust depot entry camera by 15° — closes PPE detection blind spot identified in 3rd Eye footage review");
  if (nearMiss > 1) {
    recommendations.push(`Install Mobileye collision warning system on ${truckReg} as interim measure pending route schedule change`);
  }

  const risks = eventTypes && Object.keys(eventTypes).length
    ? sortedTypes.slice(0, 3).map(([et, count]) => {
        const sev = (events.find(e => e.event_type === et) || {}).severity || "MEDIUM";
        return { risk: titleCase(et), frequency: `${count} events / 7 days`, location_or_time: "Route morning shifts", severity: sev };
      })
    : [];

  return {
    safety_score: score,
    top_risks: (risksOut.length ? risksOut : risks).slice(0, 3),
    root_causes: rootCauses,
    recommendations,
    trend: `${score < 65 ? "DETERIORATING" : "STABLE"} — ${n} events in 7 days, ${critical.length} critical requiring human review`,
    summary: `${truckReg} (${routeName}, ${driver}): ${critical.length} CRITICAL, ${high.length} HIGH events in 7 days. Safety score ${score}/100. ${score < 65 ? "Immediate action required — recommend route suspension pending schedule fix." : "Continue monitoring — schedule preventive action this week."}`,
  };
}

export function runMaintenancePredictor(truckId, anomalies) {
  const plan = maintenanceFallback(anomalies);
  return {
    agent: "Maintenance Predictor",
    model: "Algorithmic Planning v1.0",
    truck_id: truckId,
    anomalies_analyzed: anomalies.length,
    maintenance_plan: plan,
    data_source: "Client-side sensor anomaly simulation",
    generated_at: new Date().toISOString(),
  };
}

function maintenanceFallback(anomalies) {
  const priorityRepairs = [];
  const partsList = [];
  let totalDowntime = 0;

  const sorted = [...anomalies].sort((a, b) => (b.z_score || 0) - (a.z_score || 0));
  for (const a of sorted) {
    const z = a.z_score || 0;
    const urgency = z > 3.0 ? "URGENT" : z > 2.5 ? "HIGH" : "MONITOR";
    const hrs = a.hours_to_failure || 72;
    priorityRepairs.push({
      component: (a.component || "unknown").replace(/_/g, " "),
      urgency, z_score: z, hours_to_failure: hrs,
      sku: (a.parts_order || {}).sku || "UNKNOWN",
    });
    if (urgency === "URGENT" || urgency === "HIGH") {
      totalDowntime += 2;
      partsList.push({ part: (a.parts_order || {}).sku || "UNKNOWN", qty: 1, cost: "₹4,500–₹9,000", lead_time: "1-2 days", in_stock: true });
    }
  }

  const urgentItems = priorityRepairs.filter(r => r.urgency === "URGENT" || r.urgency === "HIGH");
  const totalCost = priorityRepairs.length * 6500;

  return {
    priority_repairs: priorityRepairs,
    parts_list: partsList,
    downtime_hours: Math.max(totalDowntime, 4),
    schedule: `Recommended: Sunday 06:00–12:00 maintenance window — ${Math.max(totalDowntime, 4)} hours required, minimal route impact (Sunday lowest collection density)`,
    cost_estimate: `Planned repair: ₹${totalCost.toLocaleString("en-IN")} · Emergency breakdown cost: ₹85,000+ · Plus BBMP municipal SLA penalty: ₹25,000/incident`,
    risk_if_deferred: `${urgentItems.length} components at failure risk within 48–72 hours. Hydraulic seal failure mid-route: fluid leak, truck immobilised on collection road, tow required, 3-day parts procurement lead time if unplanned, BBMP SLA breach.`,
  };
}

export function runRouteOptimizer(depotId, routePatterns) {
  const plan = routeFallback(routePatterns);
  return {
    agent: "Route Optimizer",
    model: "Algorithmic Routing v1.0",
    depot_id: depotId,
    routes_analyzed: routePatterns.length,
    optimization_plan: plan,
    data_source: "Client-side route pattern simulation",
    generated_at: new Date().toISOString(),
  };
}

function routeFallback(patterns) {
  const highRisk = patterns.filter(p => (p.risk_rate || 0) > 0.2);
  return {
    high_risk_routes: highRisk.slice(0, 2).map(p => ({
      route: p.route_name || p.route_id || "",
      area: p.area || "",
      risk_rate: `${((p.risk_rate || 0) * 100).toFixed(0)}%`,
      primary_hazard: p.school_zone ? "School zone dispatch timing conflict" : "High pedestrian density area",
      incidents_this_week: p.high_severity_events || 0,
      collection_start: p.collection_start || "",
    })),
    route_changes: [
      "Koramangala (BLR-R02): Shift dispatch from 08:15 → 06:30 — eliminates National Public School zone conflict completely",
      "Indiranagar (BLR-R03): Mandatory 5 km/h zone enforcement on 100 Feet Road market stretch, 09:00-11:00",
    ],
    timing_adjustments: [
      "BLR-R02 Koramangala: 06:30 start — estimated 3 fewer near-miss events per week based on 30-day pattern",
      "BLR-R05 BTM Layout: Delhi Public School zone — verify current dispatch vs 08:45 school start",
    ],
    expected_improvement: "Projected 35-40% reduction in CRITICAL/HIGH events within 30 days of timing change implementation",
    action_items: [
      "Raise dispatch schedule change request in Soft-Pak for BLR-R02 by end of week",
      "Brief KA-01-AA-4523 and KA-01-AA-4522 drivers on new 06:30 Koramangala timing",
      "Submit route risk assessment for BLR-R02 per HSE waste transport guidance (school zone protocol)",
      "Review 3rd Eye event data for BLR-R05 BTM — verify school zone compliance",
      "30-day review: target <15% high-severity rate on all routes",
    ],
  };
}

export function runCopilot(message) {
  return {
    agent: "Operations Copilot",
    model: "Algorithmic NLP v1.0",
    response: copilotFallback(message),
    timestamp: new Date().toISOString(),
  };
}

function copilotFallback(message) {
  const msg = (message || "").toLowerCase();

  if (["critical", "alert", "worst", "dangerous truck", "most issues"].some(w => msg.includes(w))) {
    return "KA-01-AA-4523 (Manjunath S, Koramangala) is most critical — hydraulic seal showing 18-day progressive wear, predicted failure in 72 hours. Parts order PO-BLR-1044 raised, pending your approval. KA-01-AA-4527 (Ravi Shankar P, Indiranagar) is second — packer blade failure predicted in 48 hours, PO-BLR-1046 pending. Recommend taking both trucks off-route for Sunday maintenance window.";
  }
  if (["safety", "incident", "event", "near miss", "hazmat", "video"].some(w => msg.includes(w))) {
    return "3 pedestrian near-misses this week on the Koramangala route, all between 08:15-09:00. Root cause: dispatch time conflicts with National Public School morning drop-off at 08:30. Recommend shifting Koramangala collection to 06:30 — this eliminates the school zone overlap entirely. Driver Manjunath S (KA-01-AA-4523) has the highest distraction event count this week on that route.";
  }
  if (["route", "road", "northgate", "downtown", "r-002", "r-003"].some(w => msg.includes(w))) {
    return "Koramangala route is your highest risk — current 08:15 dispatch directly conflicts with school start at 08:30 on 7th Block Road. That 15-minute overlap is causing the pedestrian near-miss pattern. Shift dispatch to 06:30 and the risk drops significantly. Indiranagar (100 Feet Road) is second concern — market area footfall between 09:00-11:00 needs a mandatory slow zone enforcement.";
  }
  if (["maintenance", "repair", "part", "breakdown", "failure", "sensor"].some(w => msg.includes(w))) {
    return "Five components across three trucks need attention this week. Most urgent: KA-01-AA-4527 packer blade (48h window, PO-BLR-1046 raised) and KA-01-AA-4523 hydraulic seal (72h window, PO-BLR-1044 raised). Both parts are in stock. Recommend a 6-hour maintenance window Sunday 06:00-12:00 — total parts cost ₹42,000 versus an estimated ₹3.8L breakdown exposure plus BBMP collection SLA penalties if deferred.";
  }
  if (["driver", "behavior", "fatigue", "score", "distract", "drv"].some(w => msg.includes(w))) {
    return "From the driver behavior model: DRV-004 has the lowest safety score this week at 52/100 — flagged for mandatory retraining. 5 distraction events correlate with early shift start (05:30). DRV-007 (58/100) and DRV-009 (61/100) are also below the 65-point threshold. DRV-002 is top performer at 96/100. The scoring model runs every shift using CV events from 3rd Eye cameras.";
  }
  if (["rpa", "automation", "workflow", "manual", "review", "saved"].some(w => msg.includes(w))) {
    return "Today: 342 video events processed, 318 resolved automatically — only 24 required human review. The maintenance alerts for KA-01-AA-4523 and KA-01-AA-4527 were auto-raised and parts orders generated without manual intervention. The daily safety compliance report was distributed to depot managers at 06:00. That is 43 hours of manual review work eliminated today. The Video Review Triage workflow alone handled 342 events and auto-resolved 318 (93%). The Maintenance Ticket Creator auto-raised 12 tickets from sensor anomaly alerts. Safety Compliance Report auto-generated at 06:00 and distributed to all fleet managers.";
  }
  if (["microservice", "service", "api", "latency", "health", "system"].some(w => msg.includes(w))) {
    return "9 of 10 backend services are running normally. The BI reporting service is under load — response time degraded to 450ms against a normal 65ms target. Recommend scaling that service up. The parts integration service is showing 220ms response time which is expected given the external Parts Central API dependency. All sensor ingestion and video classification services are healthy.";
  }
  return "Fleet status: 10 trucks active across 6 Bangalore routes. Two trucks need immediate attention — KA-01-AA-4523 (Koramangala, hydraulic seal, 72h) and KA-01-AA-4527 (Indiranagar, packer blade, 48h), both parts orders pending approval. Koramangala route has a school zone timing issue that's driving the pedestrian near-miss pattern. Ask me about any specific truck, route, driver, or maintenance requirement.";
}

function titleCase(s) {
  return s.replace(/_/g, " ").replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1));
}
