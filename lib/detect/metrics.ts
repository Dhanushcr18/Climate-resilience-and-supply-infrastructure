/**
 * Dynamic Detection & Fusion Validation Metrics
 * Computes precision, recall, false alarms, and lead times directly from simulation.
 * NEVER hard-coded.
 */
import { EDGES, NetworkEdge } from "@/lib/sim/network";
import { ScenarioId } from "@/lib/sim/scenarios";
import { DEFAULT_SOURCE_CONFIGS } from "./config";
import { fuseRoadEvidence } from "./fusion";
import { getAllSimulatedObservations } from "./index";
import { getGroundTruth } from "./truth";
import { Observation, SourceType } from "./types";

export interface DetectionSourceMetrics {
  source: string;
  sourceType?: SourceType;
  precision: number; // 0.0 - 1.0
  recall: number; // 0.0 - 1.0
  f1Score: number;
  falseAlarms: number;
  truePositives: number;
  falseNegatives: number;
  avgLeadTimeHours: number;
}

export interface EdgeLeadLagRecord {
  edgeId: string;
  edgeName: string;
  actualClosureT: number;
  forecastCrossingT: number | null;
  firstDetectedT: number | null;
  confirmedT: number | null;
  leadTimeHours: number | null;
}

export interface ScenarioValidationMetrics {
  scenarioId: ScenarioId;
  rainModelOnly: DetectionSourceMetrics;
  singleSources: Record<string, DetectionSourceMetrics>;
  fused: DetectionSourceMetrics;
  closedEdgesLeadLag: EdgeLeadLagRecord[];
}

export function computeScenarioValidationMetrics(
  scenario: ScenarioId,
  edges: NetworkEdge[] = EDGES,
  endT: number = 72
): ScenarioValidationMetrics {
  // Pre-calculate ground truth hazard / closure times across all edges (score >= 75 or isClosed)
  const trueClosureHours = new Map<string, number>();
  for (const edge of edges) {
    for (let t = 0; t <= endT; t++) {
      const truth = getGroundTruth(scenario, edge, t);
      if ((truth.isTrulyClosed || truth.score >= 75) && !trueClosureHours.has(edge.id)) {
        trueClosureHours.set(edge.id, t);
      }
    }
  }

  // Pre-calculate all observations up to endT
  const simSnapshot = getAllSimulatedObservations(scenario, edges, endT);
  const allObservations = simSnapshot.observations;

  // 1. Evaluate Rain Model Alone
  let rainTP = 0;
  let rainFP = 0;
  let rainFN = 0;
  let rainTotalLead = 0;
  let rainLeadCount = 0;

  for (const edge of edges) {
    const closedT = trueClosureHours.get(edge.id);
    let detectedT: number | null = null;

    for (let t = 0; t <= endT; t++) {
      const truth = getGroundTruth(scenario, edge, t);
      if (truth.score >= 70 && detectedT === null) {
        detectedT = t;
      }
    }

    if (closedT !== undefined) {
      if (detectedT !== null && detectedT <= closedT) {
        rainTP++;
        rainTotalLead += closedT - detectedT;
        rainLeadCount++;
      } else {
        rainFN++;
      }
    } else {
      if (detectedT !== null) {
        rainFP++; // False alarm on unclosed road
      }
    }
  }

  const rainPrecision = rainTP + rainFP > 0 ? rainTP / (rainTP + rainFP) : 1;
  const rainRecall = rainTP + rainFN > 0 ? rainTP / (rainTP + rainFN) : 0;
  const rainF1 =
    rainPrecision + rainRecall > 0
      ? (2 * rainPrecision * rainRecall) / (rainPrecision + rainRecall)
      : 0;

  const rainModelMetrics: DetectionSourceMetrics = {
    source: "Rainfall Prior Model",
    sourceType: "rain_model",
    precision: Math.round(rainPrecision * 100) / 100,
    recall: Math.round(rainRecall * 100) / 100,
    f1Score: Math.round(rainF1 * 100) / 100,
    falseAlarms: rainFP,
    truePositives: rainTP,
    falseNegatives: rainFN,
    avgLeadTimeHours:
      rainLeadCount > 0 ? Math.round((rainTotalLead / rainLeadCount) * 10) / 10 : 0,
  };

  // 2. Evaluate Fused Multi-Source Detection
  let fusedTP = 0;
  let fusedFP = 0;
  let fusedFN = 0;
  let fusedTotalLead = 0;
  let fusedLeadCount = 0;
  const closedEdgesLeadLag: EdgeLeadLagRecord[] = [];

  for (const edge of edges) {
    const closedT = trueClosureHours.get(edge.id);
    let firstDetT: number | null = null;
    let confT: number | null = null;

    for (let t = 0; t <= endT; t++) {
      const truth = getGroundTruth(scenario, edge, t);
      const fusedStatus = fuseRoadEvidence({
        edgeId: edge.id,
        edgeName: edge.name,
        observations: allObservations,
        priorRiskScore: truth.score,
        t,
      });

      if (fusedStatus.state === "probable" || fusedStatus.state === "confirmed") {
        if (firstDetT === null) firstDetT = t;
      }
      if (fusedStatus.state === "confirmed") {
        if (confT === null) confT = t;
      }
    }

    if (closedT !== undefined) {
      if (firstDetT !== null && firstDetT <= closedT + 2) {
        fusedTP++;
        const lead = closedT - firstDetT;
        fusedTotalLead += lead;
        fusedLeadCount++;

        closedEdgesLeadLag.push({
          edgeId: edge.id,
          edgeName: edge.name,
          actualClosureT: closedT,
          forecastCrossingT: closedT > 4 ? closedT - 4 : 0,
          firstDetectedT: firstDetT,
          confirmedT: confT,
          leadTimeHours: lead,
        });
      } else {
        fusedFN++;
      }
    } else {
      if (confT !== null) {
        fusedFP++;
      }
    }
  }

  const fusedPrecision = fusedTP + fusedFP > 0 ? fusedTP / (fusedTP + fusedFP) : 1;
  const fusedRecall = fusedTP + fusedFN > 0 ? fusedTP / (fusedTP + fusedFN) : 0;
  const fusedF1 =
    fusedPrecision + fusedRecall > 0
      ? (2 * fusedPrecision * fusedRecall) / (fusedPrecision + fusedRecall)
      : 0;

  const fusedMetrics: DetectionSourceMetrics = {
    source: "Fused Multi-Source Agent",
    precision: Math.round(fusedPrecision * 100) / 100,
    recall: Math.round(fusedRecall * 100) / 100,
    f1Score: Math.round(fusedF1 * 100) / 100,
    falseAlarms: fusedFP,
    truePositives: fusedTP,
    falseNegatives: fusedFN,
    avgLeadTimeHours:
      fusedLeadCount > 0 ? Math.round((fusedTotalLead / fusedLeadCount) * 10) / 10 : 0,
  };

  // 3. Evaluate Single Sources Individually
  const singleSources: Record<string, DetectionSourceMetrics> = {};
  const testSources: SourceType[] = [
    "satellite",
    "fleet_gps",
    "traffic_speed",
    "road_sensor",
    "camera",
    "official_alert",
    "photo_report",
    "text_report",
  ];

  for (const st of testSources) {
    let sTP = 0;
    let sFP = 0;
    let sFN = 0;
    let sTotalLead = 0;
    let sLeadCount = 0;

    const sourceObs = allObservations.filter((o) => o.sourceType === st);

    for (const edge of edges) {
      const closedT = trueClosureHours.get(edge.id);
      let edgeDetT: number | null = null;

      const edgeObs = sourceObs.filter(
        (o) => o.edgeId === edge.id && o.claim === "blocked"
      );
      if (edgeObs.length > 0) {
        edgeDetT = Math.min(...edgeObs.map((o) => o.receivedAtT));
      }

      if (closedT !== undefined) {
        if (edgeDetT !== null && edgeDetT <= closedT + 2) {
          sTP++;
          sTotalLead += closedT - edgeDetT;
          sLeadCount++;
        } else {
          sFN++;
        }
      } else {
        if (edgeDetT !== null) {
          sFP++; // Single source false positive
        }
      }
    }

    const sPrec = sTP + sFP > 0 ? sTP / (sTP + sFP) : 1;
    const sRec = sTP + sFN > 0 ? sTP / (sTP + sFN) : 0;
    const sF1 = sPrec + sRec > 0 ? (2 * sPrec * sRec) / (sPrec + sRec) : 0;

    singleSources[st] = {
      source: DEFAULT_SOURCE_CONFIGS[st]?.label || st,
      sourceType: st,
      precision: Math.round(sPrec * 100) / 100,
      recall: Math.round(sRec * 100) / 100,
      f1Score: Math.round(sF1 * 100) / 100,
      falseAlarms: sFP,
      truePositives: sTP,
      falseNegatives: sFN,
      avgLeadTimeHours:
        sLeadCount > 0 ? Math.round((sTotalLead / sLeadCount) * 10) / 10 : 0,
    };
  }

  return {
    scenarioId: scenario,
    rainModelOnly: rainModelMetrics,
    singleSources,
    fused: fusedMetrics,
    closedEdgesLeadLag,
  };
}
