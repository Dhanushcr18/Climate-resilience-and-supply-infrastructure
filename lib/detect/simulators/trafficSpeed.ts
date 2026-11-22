/**
 * Commercial Traffic Speed Index Simulator
 */
import { NetworkEdge } from "@/lib/sim/network";
import { ScenarioId } from "@/lib/sim/scenarios";
import { DEFAULT_SOURCE_CONFIGS } from "../config";
import { seededRandom } from "../prng";
import { getGroundTruth } from "../truth";
import { Observation } from "../types";

export function simulateTrafficSpeedObservations(
  scenario: ScenarioId,
  edges: NetworkEdge[],
  currentT: number
): Observation[] {
  const observations: Observation[] = [];
  const config = DEFAULT_SOURCE_CONFIGS.traffic_speed;
  const latency = config.latencyHours; // 0.25h (15 min)
  const maxHour = Math.floor(currentT);

  for (let h = 1; h <= maxHour; h++) {
    const receivedAtT = h + latency;
    if (receivedAtT > currentT) continue;

    for (const edge of edges) {
      const truth = getGroundTruth(scenario, edge, h);
      const noise = (seededRandom(`speed-noise-${scenario}-${edge.id}-${h}`) - 0.5) * 0.1;

      let speedRatio = 0.95 + noise;

      if (truth.isTrulyClosed) {
        speedRatio = Math.max(0.05, 0.12 + noise);
      } else if (truth.isTrulyDegraded) {
        speedRatio = Math.max(0.35, 0.50 + noise);
      }

      speedRatio = Math.max(0.02, Math.min(1.0, speedRatio));

      if (speedRatio < 0.3) {
        observations.push({
          id: `obs-speed-${scenario}-${edge.id}-h${h}`,
          edgeId: edge.id,
          sourceType: "traffic_speed",
          claim: "blocked",
          confidence: 0.6,
          observedAtT: h,
          receivedAtT,
          provenance: config.provenance,
          details: `Commercial flow velocity collapsed to ${Math.round(speedRatio * 100)}% of nominal free-flow speed on ${edge.name}`,
          evidence: {
            speedRatio: Math.round(speedRatio * 100) / 100,
            freeFlowKmh: edge.terrain === "ghat" ? 50 : 80,
            measuredKmh: Math.round(speedRatio * (edge.terrain === "ghat" ? 50 : 80)),
          },
        });
      } else if (speedRatio < 0.6) {
        observations.push({
          id: `obs-speed-${scenario}-${edge.id}-h${h}`,
          edgeId: edge.id,
          sourceType: "traffic_speed",
          claim: "degraded",
          confidence: 0.5,
          observedAtT: h,
          receivedAtT,
          provenance: config.provenance,
          details: `Flow speed degraded to ${Math.round(speedRatio * 100)}% of free-flow on ${edge.name}`,
          evidence: {
            speedRatio: Math.round(speedRatio * 100) / 100,
          },
        });
      }
    }
  }

  return observations;
}
