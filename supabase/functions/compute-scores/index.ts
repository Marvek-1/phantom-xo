import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { handleCorsPreflight, withCorsHeaders } from "../_shared/cors.ts";

type Vec2 = [number, number]; // [lng, lat]
type DriftVec = [number, number]; // [eastKm, northKm]

interface NormalizedSignal {
  id: string;
  type: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  magnitude: number | null;
  truth_score: number | null;
  timestamp: string | null;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function toRad(v: number): number {
  return (v * Math.PI) / 180;
}

function toDeg(v: number): number {
  return (v * 180) / Math.PI;
}

function haversineKm(a: Vec2, b: Vec2): number {
  const R = 6371;
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLat = lat2 - lat1;
  const dLng = toRad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function localDeltaKm(from: Vec2, to: Vec2): DriftVec {
  const latMid = toRad((from[1] + to[1]) / 2);
  const dLng = to[0] - from[0];
  const dLat = to[1] - from[1];
  const east = dLng * 111.320 * Math.cos(latMid);
  const north = dLat * 110.574;
  return [east, north];
}

function vecLen(v: DriftVec): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
}

function vecNorm(v: DriftVec): DriftVec {
  const l = vecLen(v);
  if (l === 0) return [0, 0];
  return [v[0] / l, v[1] / l];
}

function vecAdd(a: DriftVec, b: DriftVec): DriftVec {
  return [a[0] + b[0], a[1] + b[1]];
}

function vecScale(v: DriftVec, s: number): DriftVec {
  return [v[0] * s, v[1] * s];
}

function vecPerp(v: DriftVec): DriftVec {
  return [-v[1], v[0]];
}

function idw(d: number, radiusKm: number): number {
  if (d >= radiusKm) return 0;
  const ratio = 1 - d / radiusKm;
  return ratio * ratio;
}

function bearingFromVec(v: DriftVec): number {
  if (v[0] === 0 && v[1] === 0) return 0;
  return (toDeg(Math.atan2(v[0], v[1])) + 360) % 360;
}

function destinationPoint(origin: Vec2, bearingDeg: number, distanceKm: number): Vec2 {
  const R = 6371;
  const d = distanceKm / R;
  const brng = toRad(bearingDeg);
  const lat1 = toRad(origin[1]);
  const lng1 = toRad(origin[0]);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
  );

  return [toDeg(lng2), toDeg(lat2)];
}

function resampleLine(coords: Vec2[], stepKm: number): Vec2[] {
  if (coords.length < 2) return [...coords];
  const out: Vec2[] = [coords[0]];
  let carry = 0;

  for (let i = 1; i < coords.length; i++) {
    const start = coords[i - 1];
    const end = coords[i];
    const segLen = haversineKm(start, end);
    if (segLen <= 0) continue;

    const available = carry + segLen;
    const n = Math.floor(available / stepKm);
    for (let j = 1; j <= n; j++) {
      const distFromStart = j * stepKm - carry;
      const t = clamp(distFromStart / segLen, 0, 1);
      out.push([
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t,
      ]);
    }
    carry = available - n * stepKm;
  }

  const last = coords[coords.length - 1];
  const endDist = haversineKm(out[out.length - 1], last);
  if (endDist > stepKm * 0.2) {
    out.push(last);
  }
  return out;
}

function seasonalFactor(month: number): number {
  // Jan..Dec profile for EA routes (long/short rains vs dry seasons)
  const factors = [0.75, 0.85, 1.15, 1.25, 1.10, 0.70, 0.60, 0.65, 0.85, 1.05, 1.15, 0.95];
  return factors[clamp(month, 0, 11)];
}

function riskFactor(riskClass?: string | null): number {
  switch ((riskClass ?? "").toUpperCase()) {
    case "CRITICAL":
      return 1.0;
    case "HIGH":
      return 0.8;
    case "MEDIUM":
    case "ELEVATED":
      return 0.6;
    case "LOW":
      return 0.3;
    default:
      return 0.5;
  }
}

function classifySignal(signal: NormalizedSignal): "conflict" | "flow" | "closure" | "disease" | "other" {
  const t = (signal.type ?? "").toLowerCase();
  const notes = (signal.notes ?? "").toLowerCase();
  if (t.includes("conflict") || t.includes("violence")) return "conflict";
  if (t.includes("displacement") || t.includes("flow") || t.includes("movement")) return "flow";
  if (notes.includes("closure") || notes.includes("closed") || notes.includes("checkpoint")) return "closure";
  if (t.includes("disease") || t.includes("health")) return "disease";
  return "other";
}

function signalIntensity(signal: NormalizedSignal): number {
  const mag = clamp(Number(signal.magnitude ?? 0.5), 0.05, 1);
  const truth = clamp(Number(signal.truth_score ?? 0.75), 0.05, 1);
  return clamp(mag * truth, 0.05, 1);
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const body = await req.json().catch(() => ({}));
    const corridorId = String(body.corridorId ?? "").trim();
    const windowDays = clamp(Number(body.windowDays ?? 30), 1, 120);
    const influenceRadiusKm = clamp(Number(body.influenceRadiusKm ?? 150), 10, 500);
    const stepKm = clamp(Number(body.stepKm ?? 7), 1, 30);
    const riskClass = String(body.riskClass ?? "MEDIUM");
    const providedCoords = Array.isArray(body.corridorCoords) ? body.corridorCoords as Vec2[] : [];

    if (!corridorId) {
      return new Response(JSON.stringify({ error: "corridorId is required" }), {
        status: 400,
        headers: withCorsHeaders({ "Content-Type": "application/json" }),
      });
    }

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let corridorCoords: Vec2[] = [];

    if (providedCoords.length >= 2) {
      corridorCoords = providedCoords;
    } else {
      const { data: nodes, error: nodeErr } = await db
        .from("corridor_nodes")
        .select("lng,lat,node_order")
        .eq("corridor_def_id", corridorId)
        .order("node_order", { ascending: true });

      if (nodeErr) {
        throw new Error(`Failed loading corridor nodes: ${nodeErr.message}`);
      }
      corridorCoords = (nodes ?? []).map((n: any) => [Number(n.lng), Number(n.lat)] as Vec2);
    }

    if (corridorCoords.length < 2) {
      return new Response(JSON.stringify({ error: `No corridor geometry for ${corridorId}` }), {
        status: 404,
        headers: withCorsHeaders({ "Content-Type": "application/json" }),
      });
    }

    const sampled = resampleLine(corridorCoords, stepKm);
    const now = new Date();
    const since = new Date(now.getTime() - windowDays * 86400000).toISOString();

    const lats = sampled.map((p) => p[1]);
    const lngs = sampled.map((p) => p[0]);
    const latMin = Math.min(...lats);
    const latMax = Math.max(...lats);
    const lngMin = Math.min(...lngs);
    const lngMax = Math.max(...lngs);
    const padLat = influenceRadiusKm / 110.574;
    const midLat = avg([latMin, latMax]);
    const padLng = influenceRadiusKm / (111.320 * Math.max(Math.cos(toRad(midLat)), 0.2));

    const { data: signals, error: signalErr } = await db
      .from("normalized_signals")
      .select("id,type,notes,latitude,longitude,magnitude,truth_score,timestamp")
      .eq("passed_truth_filter", true)
      .gte("timestamp", since)
      .gte("latitude", latMin - padLat)
      .lte("latitude", latMax + padLat)
      .gte("longitude", lngMin - padLng)
      .lte("longitude", lngMax + padLng)
      .limit(3000);

    if (signalErr) {
      throw new Error(`Failed loading signals: ${signalErr.message}`);
    }

    const validSignals = (signals ?? []).filter(
      (s: any) => s.latitude != null && s.longitude != null,
    ) as NormalizedSignal[];

    const month = now.getMonth();
    const seasonal = seasonalFactor(month);
    const rv = riskFactor(riskClass);

    const vectors: DriftVec[] = [];
    const mags: number[] = [];
    let meanEast = 0;
    let meanNorth = 0;
    let usedSignals = 0;

    const driverAccumulator = {
      conflict: 0,
      flow: 0,
      closure: 0,
      disease: 0,
      other: 0,
    };
    const driverCounts = {
      conflict: 0,
      flow: 0,
      closure: 0,
      disease: 0,
      other: 0,
    };

    for (let i = 0; i < sampled.length; i++) {
      const p = sampled[i];
      const prev = sampled[Math.max(0, i - 1)];
      const next = sampled[Math.min(sampled.length - 1, i + 1)];
      const tangent = vecNorm(localDeltaKm(prev, next));
      const lateral = vecPerp(tangent);

      let v: DriftVec = [0, 0];

      for (const s of validSignals) {
        const sp: Vec2 = [Number(s.longitude), Number(s.latitude)];
        const d = haversineKm(p, sp);
        if (d > influenceRadiusKm) continue;

        const intensity = signalIntensity(s);
        const w = idw(d, influenceRadiusKm) * intensity;
        if (w <= 0) continue;

        const dir = vecNorm(localDeltaKm(p, sp)); // point -> signal
        const cls = classifySignal(s);
        usedSignals++;

        if (cls === "conflict") {
          v = vecAdd(v, vecScale(dir, -0.90 * w));
          driverAccumulator.conflict += 0.90 * w;
          driverCounts.conflict++;
        } else if (cls === "flow") {
          v = vecAdd(v, vecScale(dir, 0.70 * w));
          driverAccumulator.flow += 0.70 * w;
          driverCounts.flow++;
        } else if (cls === "closure") {
          const cross = tangent[0] * dir[1] - tangent[1] * dir[0];
          const side = cross > 0 ? -1 : 1;
          v = vecAdd(v, vecScale(lateral, side * 0.65 * w));
          driverAccumulator.closure += 0.65 * w;
          driverCounts.closure++;
        } else if (cls === "disease") {
          v = vecAdd(v, vecScale(dir, -0.45 * w));
          driverAccumulator.disease += 0.45 * w;
          driverCounts.disease++;
        } else {
          v = vecAdd(v, vecScale(dir, 0.20 * w));
          driverAccumulator.other += 0.20 * w;
          driverCounts.other++;
        }
      }

      // Risk and seasonal modulation.
      v = vecScale(v, seasonal * (1 + rv * 0.35));

      vectors.push(v);
      const m = vecLen(v);
      mags.push(m);
      meanEast += v[0];
      meanNorth += v[1];
    }

    meanEast /= Math.max(vectors.length, 1);
    meanNorth /= Math.max(vectors.length, 1);

    const avgMag = avg(mags);
    const variance = avg(mags.map((m) => (m - avgMag) ** 2));
    const stdDev = Math.sqrt(Math.max(variance, 0));
    const confidence = clamp(1 - stdDev / (avgMag + 0.05), 0.05, 0.99);
    const avgMagnitudeKm = avgMag * 4.5;
    const bearingDeg = bearingFromVec([meanEast, meanNorth]);
    const activationLikelihood = clamp(
      0.15 +
        clamp(usedSignals / 140, 0, 1) * 0.35 +
        (1 - confidence) * 0.25 +
        rv * 0.25,
      0.05,
      0.99,
    );

    const driftFeatures = sampled.map((p, idx) => {
      const raw = vectors[idx];
      const mag = vecLen(raw);
      const arrowKm = clamp(mag * 1.2, 0.15, 4);
      const brng = bearingFromVec(raw);
      const to = destinationPoint(p, brng, arrowKm);
      return {
        type: "Feature",
        properties: { magnitude: arrowKm },
        geometry: { type: "LineString", coordinates: [p, to] },
      };
    });

    const futureCoords = sampled.map((p, idx) => {
      const raw = vectors[idx];
      const mag = vecLen(raw);
      const driftKm = clamp(mag * 4.5, 0.20, 18);
      const brng = bearingFromVec(raw);
      return destinationPoint(p, brng, driftKm);
    });

    const driftField = {
      type: "FeatureCollection",
      features: driftFeatures,
    };

    const futureCorridor = {
      type: "Feature",
      properties: {
        corridor_id: corridorId,
        confidence,
        activation_likelihood: activationLikelihood,
      },
      geometry: {
        type: "LineString",
        coordinates: futureCoords,
      },
    };

    const driverTotal = Object.values(driverAccumulator).reduce((s, v) => s + v, 0) || 1;
    const drivers = (Object.keys(driverAccumulator) as Array<keyof typeof driverAccumulator>)
      .map((name) => ({
        name: name === "flow" ? "Flow attraction"
          : name === "conflict" ? "Conflict pressure"
          : name === "closure" ? "Closure deflection"
          : name === "disease" ? "Health pressure"
          : "Ambient movement",
        weight: Number((driverAccumulator[name] / driverTotal).toFixed(4)),
        signalCount: driverCounts[name],
      }))
      .sort((a, b) => b.weight - a.weight);

    const result = {
      corridorId,
      driftField,
      futureCorridor,
      confidence,
      avgMagnitudeKm,
      bearingDeg,
      drivers,
      activationLikelihood,
    };

    const rowId = crypto.randomUUID();
    const { error: insertErr } = await db.from("corridor_drift").insert({
      id: rowId,
      corridor_id: corridorId,
      computed_at: now.toISOString(),
      window_days: windowDays,
      signal_count: validSignals.length,
      confidence,
      activation_likelihood: activationLikelihood,
      avg_magnitude_km: avgMagnitudeKm,
      bearing_deg: bearingDeg,
      drift_field_geojson: driftField,
      future_corridor_geojson: futureCorridor,
      drivers,
      metadata: {
        step_km: stepKm,
        influence_radius_km: influenceRadiusKm,
        seasonal_factor: seasonal,
        risk_factor: rv,
      },
    });
    if (insertErr) {
      throw new Error(`Failed storing corridor_drift: ${insertErr.message}`);
    }

    const { data: latestScore } = await db
      .from("corridor_scores")
      .select("id")
      .eq("corridor_id", corridorId)
      .order("scored_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestScore?.id) {
      await db.from("corridor_scores").update({
        forecast_activation_likelihood: activationLikelihood,
        forecast_drift_direction_deg: bearingDeg,
        last_updated: now.toISOString(),
      }).eq("id", latestScore.id);
    }

    return new Response(JSON.stringify({
      status: "ok",
      corridorId,
      storedId: rowId,
      signalCount: validSignals.length,
      result,
    }), {
      headers: withCorsHeaders({ "Content-Type": "application/json" }),
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: withCorsHeaders({ "Content-Type": "application/json" }),
    });
  }
});
