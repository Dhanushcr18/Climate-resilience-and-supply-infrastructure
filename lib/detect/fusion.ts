/**
 * Bayesian-style Multi-Source Evidence Fusion Engine
 */
import { DEFAULT_SOURCE_CONFIGS, FUSION_CONFIG } from "./config";
import { Observation, RoadDetectionState, RoadStatus, SourceRegistryEntry, SourceType } from "./types";

export interface FuseOptions {
  edgeId: string;
  edgeName: string;
  observations: Observation[];
  priorRiskScore: number; // 0 - 100 from rain hydrological model
  t: number;
  sourceConfigs?: Record<SourceType, SourceRegistryEntry>;
}

export function fuseRoadEvidence(options: FuseOptions): RoadStatus {
  const { edgeId, edgeName, observations, priorRiskScore, t, sourceConfigs } = options;
  const configs = sourceConfigs || DEFAULT_SOURCE_CONFIGS;

  // 1. Initial Prior from Hydrological Model
  // Clamp prior probability into (0.02, 0.98) to prevent log-odds infinite bounds
  const priorProb = Math.min(0.98, Math.max(0.02, priorRiskScore / 100));
  let logOdds = Math.log(priorProb / (1 - priorProb));

  // 2. Filter observations applicable to this edge already received by time t
  const activeObs = observations.filter(
    (o) => o.edgeId === edgeId && o.receivedAtT <= t
  );

  // Sort descending by recency
  activeObs.sort((a, b) => b.observedAtT - a.observedAtT);

  // Group by source type to enforce correlation caps & diminishing returns
  const cumulativeSourceWeight: Partial<Record<SourceType, number>> = {};
  const contributingSources = new Set<SourceType>();
  let hasHumanVerified = false;
  const evidenceSummaryParts: string[] = [];

  for (const obs of activeObs) {
    const config = configs[obs.sourceType] || DEFAULT_SOURCE_CONFIGS[obs.sourceType];
    if (!config || !config.enabled) continue;

    // Temporal decay based on observation age
    const ageHours = Math.max(0, t - obs.observedAtT);
    const halfLife = Math.max(1, config.halfLifeHours || 12);
    const decay = Math.pow(0.5, ageHours / halfLife);

    // Provenance multiplier
    let provMult = 1.0;
    if (obs.provenance === "human_verified") {
      provMult = FUSION_CONFIG.HUMAN_VERIFIED_MULTIPLIER;
      if (obs.claim === "blocked" && ageHours <= 24) {
        hasHumanVerified = true;
      }
    } else if (obs.provenance === "live") {
      provMult = FUSION_CONFIG.LIVE_PROVENANCE_MULTIPLIER;
    }

    const rawWeight = config.reliabilityWeight * obs.confidence * decay * provMult;

    // Correlation cap: human verified field intel is trusted with high ceiling; automated feeds have correlation caps
    const sourceCap = obs.provenance === "human_verified" ? 3.5 : FUSION_CONFIG.MAX_SAME_SOURCE_WEIGHT_CAP;
    const currentWeight = cumulativeSourceWeight[obs.sourceType] || 0;
    const remainingCap = Math.max(0, sourceCap - currentWeight);
    const effectiveWeight = Math.min(rawWeight, remainingCap);

    if (effectiveWeight > 0.05) {
      cumulativeSourceWeight[obs.sourceType] = currentWeight + effectiveWeight;
      contributingSources.add(obs.sourceType);

      // Log-odds update with higher impact for human field verified intel
      const logOddsMultiplier = obs.provenance === "human_verified" ? 3.0 : 1.8;

      if (obs.claim === "blocked") {
        logOdds += effectiveWeight * logOddsMultiplier;
      } else if (obs.claim === "clear") {
        logOdds -= effectiveWeight * logOddsMultiplier; // Contradiction lowers probability
      } else if (obs.claim === "degraded") {
        logOdds += effectiveWeight * (logOddsMultiplier * 0.5);
      }

      // Add to explanation parts if recent and substantial
      if (ageHours <= 24 && evidenceSummaryParts.length < 4) {
        evidenceSummaryParts.push(obs.details);
      }
    }
  }

  // 3. Compute final fused probability: P = 1 / (1 + e^-L)
  const rawProbBlocked = Math.min(0.99, Math.max(0.01, 1 / (1 + Math.exp(-logOdds))));
  
  // Check if there are genuine blocked claims within the valid window
  const hasBlockedClaim = activeObs.some(
    (o) => o.claim === "blocked" && Math.max(0, t - o.observedAtT) <= 24
  );

  // Without any actual blocked observation, probability of physical blockage cannot exceed WATCH threshold
  let probBlocked = rawProbBlocked;
  if (!hasBlockedClaim && probBlocked > FUSION_CONFIG.WATCH_THRESHOLD) {
    probBlocked = Math.min(0.40, Math.max(0.15, priorRiskScore / 100));
  }
  const roundedProb = Math.round(probBlocked * 100) / 100;

  // 4. State Rules
  let state: RoadDetectionState = "clear";
  const numIndependentSources = contributingSources.size;

  if (roundedProb >= FUSION_CONFIG.CONFIRMED_THRESHOLD && hasBlockedClaim) {
    // Confirmed requires >= 2 independent source types OR human-verified
    if (numIndependentSources >= FUSION_CONFIG.MIN_INDEPENDENT_SOURCES_FOR_CONFIRMED || hasHumanVerified) {
      state = "confirmed";
    } else {
      // Single source cannot confirm by itself -> marked probable/verifying
      state = "probable";
    }
  } else if (roundedProb >= FUSION_CONFIG.PROBABLE_THRESHOLD && hasBlockedClaim) {
    state = "probable";
  } else if (roundedProb >= FUSION_CONFIG.WATCH_THRESHOLD || activeObs.some((o) => o.claim === "degraded")) {
    state = "watch";
  } else {
    state = "clear";
  }

  // 5. Generate concise explanation string with real numbers
  const pctStr = `${Math.round(roundedProb * 100)}%`;
  let explanation = `${edgeName}: ${pctStr} blocked probability. Prior rainfall score: ${priorRiskScore}/100.`;
  if (evidenceSummaryParts.length > 0) {
    explanation += ` Evidence: ${evidenceSummaryParts.slice(0, 3).join("; ")}.`;
  }
  if (state === "probable" && roundedProb >= FUSION_CONFIG.CONFIRMED_THRESHOLD) {
    explanation += " [Flagged: Awaiting second independent source confirmation]";
  }

  return {
    edgeId,
    probBlocked: roundedProb,
    state,
    evidence: activeObs,
    independentSources: numIndependentSources,
    explanation,
    priorRisk: priorRiskScore,
  };
}

/**
 * Fuses all edges across the road network for a given time t
 */
export function fuseAllRoads(
  edges: { id: string; name: string }[],
  observations: Observation[],
  priorRiskScores: Map<string, number>,
  t: number,
  sourceConfigs?: Record<SourceType, SourceRegistryEntry>
): Map<string, RoadStatus> {
  const result = new Map<string, RoadStatus>();

  for (const edge of edges) {
    const priorScore = priorRiskScores.get(edge.id) || 0;
    const status = fuseRoadEvidence({
      edgeId: edge.id,
      edgeName: edge.name,
      observations,
      priorRiskScore: priorScore,
      t,
      sourceConfigs,
    });
    result.set(edge.id, status);
  }

  return result;
}
