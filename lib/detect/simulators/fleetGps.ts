/**
 * Fleet Telemetry GPS Stalled-Probe Simulator
 */
import { NetworkEdge } from "@/lib/sim/network";
import { ScenarioId } from "@/lib/sim/scenarios";
import { DEFAULT_SOURCE_CONFIGS } from "../config";
import { seededRandom, seededRandomInt } from "../prng";
import { getGroundTruth } from "../truth";
import { Observation } from "../types";

export interface ProbeCluster {
  edgeId: string;
  t: number;
  stalledProbeCount: number;
  avgSpeedKmh: number;
  durationMinutes: number;
  isFalsePositive?: boolean;
}

export function simulateFleetGpsObservations(
  scenario: ScenarioId,
  edges: NetworkEdge[],
  currentT: number
): { observations: Observation[]; probeClusters: ProbeCluster[] } {
  const observations: Observation[] = [];
  const probeClusters: ProbeCluster[] = [];
  const config = DEFAULT_SOURCE_CONFIGS.fleet_gps;
  const latency = config.latencyHours; // 0.5h (30 min)

  // Evaluate hourly intervals up to currentT
  const maxHour = Math.floor(currentT);

  for (let h = 1; h <= maxHour; h++) {
    const receivedAtT = h + latency;
    if (receivedAtT > currentT) continue;

    for (const edge of edges) {
      const truth = getGroundTruth(scenario, edge, h);

      // Seeded probe count for this edge at hour h (3 to 6 probes)
      const numProbes = seededRandomInt(`gps-probes-${scenario}-${edge.id}-${h}`, 3, 6);

      let stalledCount = 0;
      let totalSpeed = 0;
      const normalSpeed = edge.terrain === "ghat" ? 45 : 75;

      // Seeded false-positive event: urban bottleneck / fender-bender on BLR-MYS at h=10..12
      const isFalsePositiveJam =
        edge.id === "BLR-MYS" && (h === 10 || h === 11);

      if (truth.isTrulyClosed) {
        // True road closure: probes stall completely (speed ratio < 0.15)
        stalledCount = numProbes;
        totalSpeed = seededRandom(`gps-closed-speed-${edge.id}-${h}`) * 4; // 0-4 km/h
      } else if (isFalsePositiveJam) {
        // Traffic jam false positive on plain safe highway: 3-4 probes stalled for 25 min
        stalledCount = Math.min(numProbes, 4);
        totalSpeed = 8;
      } else if (truth.isTrulyDegraded) {
        // Degraded road (heavy rain): speeds drop to 40-50%
        stalledCount = 1; // only 1 probe stopped, rest crawling
        totalSpeed = normalSpeed * 0.45 * numProbes;
      } else {
        // Normal clear road
        stalledCount = 0;
        totalSpeed = normalSpeed * 0.95 * numProbes;
      }

      const avgSpeed = Math.round((totalSpeed / numProbes) * 10) / 10;
      const speedRatio = avgSpeed / normalSpeed;

      // Anomaly rule: >= 3 probes below 15% speed for >= 20 min => 'blocked'
      if (stalledCount >= 3 && speedRatio < 0.15) {
        const confidence = Math.min(0.85, 0.65 + 0.05 * (stalledCount - 3));
        const durationMinutes = isFalsePositiveJam ? 25 : 35 + (h % 3) * 10;

        probeClusters.push({
          edgeId: edge.id,
          t: h,
          stalledProbeCount: stalledCount,
          avgSpeedKmh: avgSpeed,
          durationMinutes,
          isFalsePositive: isFalsePositiveJam,
        });

        observations.push({
          id: `obs-gps-${scenario}-${edge.id}-h${h}`,
          edgeId: edge.id,
          sourceType: "fleet_gps",
          claim: "blocked",
          confidence: Math.round(confidence * 100) / 100,
          observedAtT: h,
          receivedAtT,
          provenance: config.provenance,
          details: `${stalledCount} probe vehicles stalled (<${avgSpeed} km/h) for ${durationMinutes} min on ${edge.name}${
            isFalsePositiveJam ? " [Traffic Jam Anomaly]" : ""
          }`,
          evidence: {
            stalledProbes: stalledCount,
            totalProbes: numProbes,
            avgSpeedKmh: avgSpeed,
            durationMinutes,
            speedRatio: Math.round(speedRatio * 100) / 100,
            isFalsePositive: isFalsePositiveJam,
          },
        });
      } else if (speedRatio < 0.6 && speedRatio >= 0.15) {
        observations.push({
          id: `obs-gps-${scenario}-${edge.id}-h${h}`,
          edgeId: edge.id,
          sourceType: "fleet_gps",
          claim: "degraded",
          confidence: 0.55,
          observedAtT: h,
          receivedAtT,
          provenance: config.provenance,
          details: `Fleet transit velocities slowed to ${avgSpeed} km/h (${Math.round(speedRatio * 100)}% free-flow) on ${edge.name}`,
          evidence: {
            stalledProbes: stalledCount,
            totalProbes: numProbes,
            avgSpeedKmh: avgSpeed,
            speedRatio: Math.round(speedRatio * 100) / 100,
          },
        });
      }
    }
  }

  return { observations, probeClusters };
}
