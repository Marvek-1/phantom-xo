/**
 * MoStar Phantom XO — Corridor Intelligence View Model
 * moscript://codex/v1
 * agent: phantom-xo-intel-vm
 * sass: "The component sees clean data. The mess stays underground."
 *
 * Transforms raw Neon query results into a stable view model.
 * The UI consumes this shape ONLY — never raw DB rows.
 * If Neon schemas change, only this file changes.
 */

import { queryNeon } from "@/lib/neon";

// ── View Model Types ────────────────────────────────────────────────

export type DataState = "loading" | "live" | "partial" | "no_evidence" | "unavailable";

export interface CorridorIntelligenceViewModel {
  state: DataState;
  corridorId: string;
  corridorName: string;

  age: {
    firstDetected: string | null;
    lastSeen: string | null;
    activeDurationDays: number | null;
  };

  evolution: {
    trend: "rising" | "stable" | "declining" | "unknown";
    routeStability: number | null;
    divergenceRatio: number | null;
    formalVolume: number | null;
    informalVolume: number | null;
    divergenceTrend: string | null;
    summary: string;
  };

  usage: {
    crossingFrequency: number | null;
    dominantMovementType: string | null;
    likelyUserGroups: string[];
    mode: string | null;
    summary: string;
  };

  evidence: {
    count: number;
    signalCount: number;
    strongest: Array<{
      type: string;
      source: string;
      timestamp: string;
      confidence: number;
      summary: string;
    }>;
    sourceTypes: string[];
    confidenceExplanation: string;
  };

  dataQuality: {
    evidenceCompleteness: "full" | "partial" | "sparse" | "none";
    sourceFreshness: "current" | "stale" | "unknown";
    unresolvedGaps: string[];
    laneMode: "LIVE" | "SANDBOX" | "TEST" | "UNKNOWN";
  };

  score: number | null;
  riskClass: string | null;
  latentState: string | null;
  distanceKm: number | null;
  gapKm: number | null;

  invisibility: {
    index: number | null;
    deviationMeanKm: number | null;
    deviationMaxKm: number | null;
    shortcutRatio: number | null;
    pctOffroad: number | null;
  };

  terrain: {
    landCover: string | null;
    avgSlope: number | null;
    hasRiver: boolean;
    riverWidthM: number | null;
    requiresCanoe: boolean;
    seasonalPhase: string | null;
  };

  entropySpikes: Array<{
    nodeId: string;
    deltaH: number;
    riskClass: string;
  }>;
}

// ── Builder ─────────────────────────────────────────────────────────

export async function buildCorridorIntelligence(
  corridorId: string
): Promise<CorridorIntelligenceViewModel> {
  const empty: CorridorIntelligenceViewModel = {
    state: "loading",
    corridorId,
    corridorName: corridorId,
    age: { firstDetected: null, lastSeen: null, activeDurationDays: null },
    evolution: { trend: "unknown", routeStability: null, divergenceRatio: null, formalVolume: null, informalVolume: null, divergenceTrend: null, summary: "" },
    usage: { crossingFrequency: null, dominantMovementType: null, likelyUserGroups: [], mode: null, summary: "" },
    evidence: { count: 0, signalCount: 0, strongest: [], sourceTypes: [], confidenceExplanation: "" },
    dataQuality: { evidenceCompleteness: "none", sourceFreshness: "unknown", unresolvedGaps: [], laneMode: "UNKNOWN" },
    score: null, riskClass: null, latentState: null, distanceKm: null, gapKm: null,
    invisibility: { index: null, deviationMeanKm: null, deviationMaxKm: null, shortcutRatio: null, pctOffroad: null },
    terrain: { landCover: null, avgSlope: null, hasRiver: false, riverWidthM: null, requiresCanoe: false, seasonalPhase: null },
    entropySpikes: [],
  };

  try {
    const [corridorRows, divRows, terrainRows, devRows, temporalRows, entropyRows, detectionRows, evidenceRows, runRows] = await Promise.all([
      queryNeon<any>(`SELECT * FROM poe_corridors WHERE id = $1`, [corridorId]),
      queryNeon<any>(`SELECT * FROM poe_divergence WHERE corridor_id = $1`, [corridorId]),
      queryNeon<any>(`SELECT * FROM poe_terrain WHERE corridor_id = $1`, [corridorId]),
      queryNeon<any>(`SELECT * FROM poe_deviation WHERE corridor_id = $1`, [corridorId]),
      queryNeon<any>(`SELECT * FROM poe_temporal WHERE corridor_id = $1 ORDER BY bucket_date ASC`, [corridorId]),
      queryNeon<any>(`SELECT * FROM poe_entropy WHERE lane_id = (SELECT lane_id FROM poe_corridors WHERE id = $1 LIMIT 1) AND spiked = true ORDER BY delta_h DESC LIMIT 5`, [corridorId]),
      queryNeon<any>(`SELECT * FROM poe_detection_events WHERE corridor_id = $1 ORDER BY created_at DESC LIMIT 5`, [corridorId]),
      queryNeon<any>(`SELECT * FROM poe_evidence WHERE corridor_id = $1 ORDER BY confidence DESC LIMIT 5`, [corridorId]),
      queryNeon<any>(`SELECT * FROM poe_runs ORDER BY started_at DESC LIMIT 1`),
    ]);

    const c = corridorRows[0];
    if (!c) {
      return { ...empty, state: "no_evidence" };
    }

    const div = divRows[0];
    const ter = terrainRows[0];
    const dev = devRows[0];
    const latestRun = runRows[0];

    // ── Age ──────────────────────────────────────────────────────
    const firstDetected = c.first_detected || null;
    const lastSeen = c.last_updated || null;
    let activeDurationDays: number | null = null;
    if (firstDetected && lastSeen) {
      const diffMs = new Date(lastSeen).getTime() - new Date(firstDetected).getTime();
      activeDurationDays = Math.max(1, Math.round(diffMs / 86400000));
    }

    // ── Evolution ────────────────────────────────────────────────
    let trend: "rising" | "stable" | "declining" | "unknown" = "unknown";
    if (temporalRows.length >= 3) {
      const recent = temporalRows.slice(-3);
      const earlier = temporalRows.slice(0, 3);
      const recentAvg = recent.reduce((s: number, r: any) => s + (r.signal_count || 0), 0) / recent.length;
      const earlierAvg = earlier.reduce((s: number, r: any) => s + (r.signal_count || 0), 0) / earlier.length;
      if (recentAvg > earlierAvg * 1.3) trend = "rising";
      else if (recentAvg < earlierAvg * 0.7) trend = "declining";
      else trend = "stable";
    }

    const divergenceRatio = div?.divergence_ratio ?? null;
    const divergenceTrend = div?.trend ?? null;
    const formalVol = div?.formal_volume ?? null;
    const informalVol = div?.informal_volume ?? null;

    let evolSummary = "";
    if (trend === "rising") evolSummary = "Signal activity is increasing over recent observation periods.";
    else if (trend === "declining") evolSummary = "Signal activity has decreased compared to earlier periods.";
    else if (trend === "stable") evolSummary = "Signal activity has remained consistent across observation periods.";
    if (divergenceTrend === "widening" && divergenceRatio != null && divergenceRatio > 0.8) {
      evolSummary += ` The gap between formal and informal movement is widening — formal monitoring captures less than ${Math.round((1 - divergenceRatio) * 100)}% of estimated traffic.`;
    }

    // ── Usage ────────────────────────────────────────────────────
    const latestTemporal = temporalRows[temporalRows.length - 1];
    const crossingFreq = latestTemporal?.estimated_daily_crossings ?? null;
    const dominantType = latestTemporal?.dominant_type ?? null;

    const userGroups: string[] = [];
    const signalTypes = new Set<string>();
    for (const e of evidenceRows) {
      if (e.evidence_type) signalTypes.add(e.evidence_type);
    }
    if (signalTypes.has("displacement") || signalTypes.has("conflict")) userGroups.push("displaced populations");
    if (signalTypes.has("market") || signalTypes.has("transport")) userGroups.push("cross-border traders");
    if (signalTypes.has("community") || signalTypes.has("linguistic")) userGroups.push("border communities");
    if (signalTypes.has("disease")) userGroups.push("health-seeking movement");
    if (userGroups.length === 0) userGroups.push("mixed civilian movement");

    let usageSummary = "";
    if (crossingFreq != null && crossingFreq > 0) {
      usageSummary = `Estimated ${crossingFreq} daily crossings.`;
    }
    if (dominantType) {
      usageSummary += ` Dominant signal type: ${dominantType}.`;
    }
    if (userGroups.length > 0) {
      usageSummary += ` Most observed activity matches ${userGroups.join(", ")}.`;
    }

    // ── Evidence ─────────────────────────────────────────────────
    const strongest = detectionRows.map((d: any) => ({
      type: d.event_type || "detection",
      source: "poe_detection",
      timestamp: d.created_at || "",
      confidence: d.score || 0,
      summary: d.summary || "",
    }));

    const sourceTypes = [...signalTypes];
    const evidenceCount = c.evidence_count || 0;
    const signalCount = c.signal_count || 0;

    let confidenceExpl = "";
    if (signalCount > 20 && sourceTypes.length >= 3) {
      confidenceExpl = `Assessment based on ${signalCount} signals from ${sourceTypes.length} independent source types across ${temporalRows.length} observation periods.`;
    } else if (signalCount > 5) {
      confidenceExpl = `Assessment based on ${signalCount} signals. Confidence would increase with additional independent source types.`;
    } else if (signalCount > 0) {
      confidenceExpl = `Limited evidence: ${signalCount} signals detected. Assessment is preliminary.`;
    } else {
      confidenceExpl = "No signals detected for this corridor. Assessment is based on structural analysis only.";
    }
    if (divergenceRatio != null && divergenceRatio > 0.9) {
      confidenceExpl += " Formal system captures less than 10% of estimated movement.";
    }
    confidenceExpl += " This corridor is inferred — geometry is modeled between intelligence-confirmed endpoints.";

    // ── Data Quality ─────────────────────────────────────────────
    let completeness: "full" | "partial" | "sparse" | "none" = "none";
    if (signalCount >= 20 && sourceTypes.length >= 3 && temporalRows.length >= 5) completeness = "full";
    else if (signalCount >= 5 || temporalRows.length >= 2) completeness = "partial";
    else if (signalCount > 0) completeness = "sparse";

    let freshness: "current" | "stale" | "unknown" = "unknown";
    if (latestRun?.completed_at) {
      const age = Date.now() - new Date(latestRun.completed_at).getTime();
      freshness = age < 24 * 3600 * 1000 ? "current" : "stale";
    }

    const gaps: string[] = [];
    if (!div) gaps.push("No divergence data available");
    if (!ter) gaps.push("No terrain analysis available");
    if (!dev) gaps.push("No deviation analysis available");
    if (temporalRows.length === 0) gaps.push("No temporal observations");
    if (entropyRows.length === 0 && signalCount > 10) gaps.push("Entropy analysis pending");

    const laneMode = latestRun?.status === "completed" ? "LIVE" as const : "SANDBOX" as const;

    // ── Determine overall state ──────────────────────────────────
    let state: DataState = "live";
    if (completeness === "none") state = "no_evidence";
    else if (completeness === "sparse") state = "partial";

    // ── Build view model ─────────────────────────────────────────
    return {
      state,
      corridorId,
      corridorName: `${c.start_node} \u2192 ${c.end_node}`,
      age: { firstDetected, lastSeen, activeDurationDays },
      evolution: {
        trend,
        routeStability: null,
        divergenceRatio,
        formalVolume: formalVol,
        informalVolume: informalVol,
        divergenceTrend,
        summary: evolSummary,
      },
      usage: {
        crossingFrequency: crossingFreq,
        dominantMovementType: dominantType,
        likelyUserGroups: userGroups,
        mode: c.inferred_mode || null,
        summary: usageSummary,
      },
      evidence: {
        count: evidenceCount,
        signalCount,
        strongest,
        sourceTypes,
        confidenceExplanation: confidenceExpl,
      },
      dataQuality: {
        evidenceCompleteness: completeness,
        sourceFreshness: freshness,
        unresolvedGaps: gaps,
        laneMode,
      },
      score: c.score ?? null,
      riskClass: c.risk_class ?? null,
      latentState: c.latent_state ?? null,
      distanceKm: c.distance_km ?? null,
      gapKm: c.gap_km ?? null,
      invisibility: {
        index: dev?.invisibility_index ?? null,
        deviationMeanKm: dev?.deviation_mean_km ?? null,
        deviationMaxKm: dev?.deviation_max_km ?? null,
        shortcutRatio: dev?.shortcut_ratio ?? null,
        pctOffroad: dev?.deviation_pct_gt_1km ?? null,
      },
      terrain: {
        landCover: ter?.primary_land_cover ?? null,
        avgSlope: ter?.avg_slope_deg ?? null,
        hasRiver: ter?.has_river_crossing ?? false,
        riverWidthM: ter?.river_width_m ?? null,
        requiresCanoe: ter?.requires_canoe ?? false,
        seasonalPhase: ter?.seasonal_phase ?? null,
      },
      entropySpikes: entropyRows.map((e: any) => ({
        nodeId: e.node_id,
        deltaH: e.delta_h,
        riskClass: e.risk_class,
      })),
    };
  } catch (err) {
    console.error("[buildCorridorIntelligence]", err);
    return { ...empty, state: "unavailable" };
  }
}
