/**
 * Ground truth helper for deterministic incident simulators
 */
import { NetworkEdge } from "@/lib/sim/network";
import { calculateRiskScore, RiskAssessment } from "@/lib/sim/risk";
import { getRainForecast, getRainHistory, ScenarioId } from "@/lib/sim/scenarios";

export interface EdgeGroundTruth {
  edgeId: string;
  t: number;
  score: number;
  isTrulyClosed: boolean;
  isTrulyDegraded: boolean;
  rainPast24hMm: number;
  peakIntensityMm: number;
  terrain: string;
  assessment: RiskAssessment;
}

export function getGroundTruth(
  scenario: ScenarioId,
  edge: NetworkEdge,
  t: number
): EdgeGroundTruth {
  const history = getRainHistory(scenario, edge.id, t);
  const forecast = getRainForecast(scenario, edge.id, t, 24);
  const assessment = calculateRiskScore(edge, history, forecast);

  return {
    edgeId: edge.id,
    t,
    score: assessment.score,
    isTrulyClosed: assessment.isClosed,
    isTrulyDegraded: assessment.score >= 50 && !assessment.isClosed,
    rainPast24hMm: assessment.past24hMm,
    peakIntensityMm: assessment.peakIntensityMmPerHour,
    terrain: edge.terrain,
    assessment,
  };
}
