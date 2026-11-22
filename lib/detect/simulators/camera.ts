/**
 * Fixed CCTV Vision AI Classifier Simulator
 */
import { NetworkEdge } from "@/lib/sim/network";
import { ScenarioId } from "@/lib/sim/scenarios";
import { DEFAULT_SOURCE_CONFIGS } from "../config";
import { seededRandom } from "../prng";
import { getGroundTruth } from "../truth";
import { Observation } from "../types";

export const FIXED_CAMERA_EDGES = [
  "HAS-MNG", // Shiradi Ghat
  "MDK-MNG", // Sampaje Ghat
  "WYN-KZD", // Thamarassery Ghat
  "TSR-KCH", // Periyar lowland
  "KCH-KTM", // Kuttanad lowland
  "CBE-PLK", // Walayar
];

export function simulateCameraObservations(
  scenario: ScenarioId,
  edges: NetworkEdge[],
  currentT: number
): Observation[] {
  const observations: Observation[] = [];
  const config = DEFAULT_SOURCE_CONFIGS.camera;
  const latency = config.latencyHours; // 0.25h (15 min)

  // Evaluate hourly check-ins for the key 6 fixed camera edges
  const maxHour = Math.floor(currentT);

  for (let h = 1; h <= maxHour; h++) {
    const receivedAtT = h + latency;
    if (receivedAtT > currentT) continue;

    for (const edgeId of FIXED_CAMERA_EDGES) {
      const edge = edges.find((e) => e.id === edgeId);
      if (!edge) continue;

      const truth = getGroundTruth(scenario, edge, h);

      // Confusion noise: 10% chance of classification error
      const confusionRoll = seededRandom(`cam-confusion-${scenario}-${edgeId}-${h}`);
      const isConfused = confusionRoll < 0.1;

      let claim: "blocked" | "degraded" | "clear" = "clear";
      let confidence = 0.85;
      let details = `Toll plaza optical feed shows clear asphalt on ${edge.name}`;

      if (truth.isTrulyClosed) {
        claim = isConfused ? "degraded" : "blocked";
        confidence = isConfused ? 0.5 : 0.88;
        details = isConfused
          ? `CCTV AI detected heavy road spray and obscuration on ${edge.name}`
          : `Optical vision AI detected debris & active mudslide accumulation on ${edge.name}`;
      } else if (truth.isTrulyDegraded) {
        claim = isConfused ? "clear" : "degraded";
        confidence = 0.65;
        details = `Optical CCTV shows standing water puddling and slow-crawling traffic on ${edge.name}`;
      }

      // Add observation if not clear or if recent
      if (claim !== "clear" || h % 6 === 0) {
        observations.push({
          id: `obs-cam-${scenario}-${edgeId}-h${h}`,
          edgeId,
          sourceType: "camera",
          claim,
          confidence,
          observedAtT: h,
          receivedAtT,
          provenance: config.provenance,
          details,
          evidence: {
            cameraStation: `CCTV-CAM-${edgeId}`,
            detectedCategory: claim === "blocked" ? "landslide_debris" : "waterlogging",
            opticalResolution: "1080p 30fps",
          },
        });
      }
    }
  }

  return observations;
}
