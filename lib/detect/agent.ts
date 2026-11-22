/**
 * Agent Detection Integration Helpers
 * Converts multi-source fused evidence into effective risk scores and decision explanations.
 */
import { NetworkEdge } from "@/lib/sim/network";
import { RiskAssessment } from "@/lib/sim/risk";
import { RoadStatus } from "./types";

/**
 * Builds effective risk map from forecast risks and multi-source detection statuses:
 * - confirmed => 95 (treated as CLOSED >= 85)
 * - probable  => max(forecast score, 70)
 * - watch     => min(84, forecast score + 10)
 * - clear     => forecast score
 */
export function buildEffectiveRiskMap(
  forecastRisks: Map<string, RiskAssessment>,
  fusedStatuses: Map<string, RoadStatus>
): Map<string, number> {
  const effectiveMap = new Map<string, number>();

  forecastRisks.forEach((assessment, edgeId) => {
    const status = fusedStatuses.get(edgeId);
    if (!status) {
      effectiveMap.set(edgeId, assessment.score);
      return;
    }

    if (status.state === "confirmed") {
      effectiveMap.set(edgeId, 95);
    } else if (status.state === "probable") {
      effectiveMap.set(edgeId, Math.max(assessment.score, 70));
    } else if (status.state === "watch") {
      effectiveMap.set(edgeId, Math.min(84, assessment.score + 10));
    } else {
      effectiveMap.set(edgeId, assessment.score);
    }
  });

  return effectiveMap;
}
