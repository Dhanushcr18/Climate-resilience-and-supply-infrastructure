/**
 * Satellite SAR & Optical Water Extent Simulator
 */
import { NetworkEdge } from "@/lib/sim/network";
import { ScenarioId } from "@/lib/sim/scenarios";
import { DEFAULT_SOURCE_CONFIGS } from "../config";
import { seededRandom } from "../prng";
import { getGroundTruth } from "../truth";
import { Observation, SatelliteFloodPolygon } from "../types";

export function simulateSatelliteObservations(
  scenario: ScenarioId,
  edges: NetworkEdge[],
  currentT: number
): { observations: Observation[]; floodPolygons: SatelliteFloodPolygon[] } {
  const observations: Observation[] = [];
  const floodPolygons: SatelliteFloodPolygon[] = [];
  const config = DEFAULT_SOURCE_CONFIGS.satellite;

  // Orbit passes every 12 sim hours: 12, 24, 36, 48, 60, 72
  const passHours = [12, 24, 36, 48, 60, 72];

  for (const passT of passHours) {
    if (passT > currentT) continue; // Not yet arrived

    const observedAtT = Math.max(0, passT - 6); // Observed 6 hours prior
    const receivedAtT = passT; // Received with 6h latency = passT

    // 25% seeded chance pass is cloud-obscured
    const cloudRoll = seededRandom(`sat-cloud-${scenario}-${passT}`);
    if (cloudRoll < 0.25) {
      // Cloud obscured pass - sensor failed to acquire clear optical/radar data
      continue;
    }

    // Build flood polygons for edges that were truly closed at observedAtT
    const floodedEdgeIds: string[] = [];
    for (const edge of edges) {
      const truth = getGroundTruth(scenario, edge, observedAtT);
      if (truth.isTrulyClosed) {
        floodedEdgeIds.push(edge.id);
      }
    }

    // Include 1 false-positive polygon over a lowland edge during peak hours (e.g. at pass 24)
    if (passT === 24 && !floodedEdgeIds.includes("TSR-KCH")) {
      floodedEdgeIds.push("TSR-KCH"); // Seeded false-positive flood polygon
    }

    // Create GeoJSON polygon representations
    for (const edgeId of floodedEdgeIds) {
      const edge = edges.find((e) => e.id === edgeId);
      if (!edge || edge.path.length < 2) continue;

      // Create a buffered quad polygon around edge path
      const pts = edge.path;
      const polyCoords: [number, number][] = [];
      const delta = 0.045; // ~5 km width buffer
      pts.forEach((p) => polyCoords.push([p[1] + delta, p[0] + delta]));
      for (let i = pts.length - 1; i >= 0; i--) {
        polyCoords.push([pts[i][1] - delta, pts[i][0] - delta]);
      }
      polyCoords.push(polyCoords[0]); // close polygon

      floodPolygons.push({
        id: `sat-flood-${scenario}-${passT}-${edgeId}`,
        passT,
        coordinates: [polyCoords],
        edgeIds: [edgeId],
        isFalsePositive: edgeId === "TSR-KCH" && passT === 24,
      });

      // Add 'blocked' observation
      observations.push({
        id: `obs-sat-${scenario}-${edgeId}-pass${passT}`,
        edgeId,
        sourceType: "satellite",
        claim: "blocked",
        confidence: 0.8,
        observedAtT,
        receivedAtT,
        provenance: config.provenance,
        details: `SAR water signature indicates flood inundation across ${edge.name} (pass t=${passT}h)`,
        evidence: {
          passT,
          floodSurfaceRatio: 0.88,
          syntheticAperture: "C-Band Sentinel-1",
        },
      });
    }

    // For non-flooded edges, add clear observation with confidence 0.75
    for (const edge of edges) {
      if (!floodedEdgeIds.includes(edge.id)) {
        observations.push({
          id: `obs-sat-${scenario}-${edge.id}-pass${passT}`,
          edgeId: edge.id,
          sourceType: "satellite",
          claim: "clear",
          confidence: 0.75,
          observedAtT,
          receivedAtT,
          provenance: config.provenance,
          details: `SAR pass confirmed clear corridor with dry asphalt response (pass t=${passT}h)`,
          evidence: {
            passT,
            floodSurfaceRatio: 0.02,
          },
        });
      }
    }
  }

  return { observations, floodPolygons };
}
