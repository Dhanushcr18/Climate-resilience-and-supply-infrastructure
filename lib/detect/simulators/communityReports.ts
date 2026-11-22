/**
 * Seeded Community Field Reports (Photo & Text) Simulator
 */
import { NetworkEdge } from "@/lib/sim/network";
import { ScenarioId } from "@/lib/sim/scenarios";
import { DEFAULT_SOURCE_CONFIGS } from "../config";
import { Observation } from "../types";

export interface SeededReportItem {
  id: string;
  scenario: ScenarioId;
  edgeId: string;
  sourceType: "photo_report" | "text_report";
  claim: "blocked" | "degraded";
  confidence: number;
  observedAtT: number;
  text: string;
  locationHint: string;
}

export const SEEDED_COMMUNITY_REPORTS: SeededReportItem[] = [
  {
    id: "rep-kerala-photo-01",
    scenario: "kerala-2018",
    edgeId: "HAS-MNG", // Shiradi Ghat
    sourceType: "photo_report",
    claim: "blocked",
    confidence: 0.85,
    observedAtT: 18.0,
    text: "Driver photo: massive rockfall and fallen trees completely obstructing both lanes at km 124 near Sakleshpur",
    locationHint: "NH-75 Shiradi Ghat km 124",
  },
  {
    id: "rep-kerala-text-01",
    scenario: "kerala-2018",
    edgeId: "HAS-MNG", // Shiradi Ghat
    sourceType: "text_report",
    claim: "blocked",
    confidence: 0.65,
    observedAtT: 17.5,
    text: "Local bus operator radio dispatch: traffic halted due to water rushing over highway culvert near Shiradi village",
    locationHint: "Shiradi Village Culvert",
  },
  {
    id: "rep-kerala-photo-02",
    scenario: "kerala-2018",
    edgeId: "TSR-KCH", // Periyar lowland
    sourceType: "photo_report",
    claim: "degraded",
    confidence: 0.75,
    observedAtT: 22.0,
    text: "Field photo: 20 cm overflow from Periyar river submerging service lanes near Aluva bypass",
    locationHint: "Aluva Bypass NH-544",
  },
  {
    id: "rep-chennai-text-01",
    scenario: "chennai-2015",
    edgeId: "BLR-CHN",
    sourceType: "text_report",
    claim: "blocked",
    confidence: 0.7,
    observedAtT: 14.0,
    text: "NHAI Highway Patrol: Chembarambakkam surplus water flooding Sriperumbudur corridor",
    locationHint: "Sriperumbudur NH-48",
  },
];

export function simulateCommunityReports(
  scenario: ScenarioId,
  edges: NetworkEdge[],
  currentT: number
): Observation[] {
  const observations: Observation[] = [];

  const relevantReports = SEEDED_COMMUNITY_REPORTS.filter((r) => r.scenario === scenario);

  for (const report of relevantReports) {
    const config = DEFAULT_SOURCE_CONFIGS[report.sourceType];
    const latency = config.latencyHours;
    const receivedAtT = report.observedAtT + latency;

    // Must respect latency: not available before receivedAtT
    if (receivedAtT > currentT) continue;

    const edge = edges.find((e) => e.id === report.edgeId);
    if (!edge) continue;

    observations.push({
      id: `obs-community-${report.id}`,
      edgeId: report.edgeId,
      sourceType: report.sourceType,
      claim: report.claim,
      confidence: report.confidence,
      observedAtT: report.observedAtT,
      receivedAtT,
      provenance: "simulated",
      details: `${report.text} (${edge.name})`,
      evidence: {
        reportId: report.id,
        locationHint: report.locationHint,
        sourceMedium: report.sourceType === "photo_report" ? "Driver App Upload" : "Civic Radio Dispatch",
      },
    });
  }

  return observations;
}
