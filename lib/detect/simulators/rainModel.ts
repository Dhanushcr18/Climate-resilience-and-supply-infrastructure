/**
 * Rainfall Risk Prior Model Simulator
 * Wraps the existing deterministic hydrological forecast into an Observation prior.
 */
import { NetworkEdge } from "@/lib/sim/network";
import { calculateRiskScore } from "@/lib/sim/risk";
import { getRainForecast, getRainHistory, ScenarioId } from "@/lib/sim/scenarios";
import { DEFAULT_SOURCE_CONFIGS } from "../config";
import { Observation } from "../types";

export function simulateRainModelObservations(
  scenario: ScenarioId,
  edges: NetworkEdge[],
  currentT: number
): Observation[] {
  const observations: Observation[] = [];
  const config = DEFAULT_SOURCE_CONFIGS.rain_model;

  for (const edge of edges) {
    const history = getRainHistory(scenario, edge.id, currentT);
    const forecast = getRainForecast(scenario, edge.id, currentT, 24);
    const assessment = calculateRiskScore(edge, history, forecast);

    let claim: "blocked" | "degraded" | "clear" = "clear";
    let confidence = Math.round(((100 - assessment.score) / 100) * 100) / 100;

    if (assessment.score >= 50) {
      claim = "blocked";
      confidence = Math.round((assessment.score / 100) * 100) / 100;
    } else if (assessment.score >= 25) {
      claim = "degraded";
      confidence = Math.round((assessment.score / 100) * 100) / 100;
    }

    observations.push({
      id: `obs-rain-${scenario}-${edge.id}-t${Math.floor(currentT)}`,
      edgeId: edge.id,
      sourceType: "rain_model",
      claim,
      confidence,
      observedAtT: currentT,
      receivedAtT: currentT,
      provenance: config.provenance,
      details: `Hydrological rainfall runoff model score: ${assessment.score}/100 (${assessment.reason})`,
      evidence: {
        score: assessment.score,
        past24hMm: assessment.past24hMm,
        forecast24hMm: assessment.forecast24hMm,
        peakIntensityMmPerHour: assessment.peakIntensityMmPerHour,
        isClosed: assessment.isClosed,
      },
    });
  }

  return observations;
}
