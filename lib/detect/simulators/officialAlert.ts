/**
 * Civil & IMD Official Meteorological Alert Simulator
 */
import { NetworkEdge } from "@/lib/sim/network";
import { ScenarioId } from "@/lib/sim/scenarios";
import { DEFAULT_SOURCE_CONFIGS } from "../config";
import { Observation } from "../types";

export interface ScriptedCivilAlert {
  id: string;
  scenario: ScenarioId;
  validFromT: number;
  validToT: number;
  severity: "yellow" | "orange" | "red";
  region: string;
  edgeIds: string[];
  headline: string;
}

export const SCENARIO_CIVIL_ALERTS: ScriptedCivilAlert[] = [
  {
    id: "alert-kerala-2018-01",
    scenario: "kerala-2018",
    validFromT: 6,
    validToT: 48,
    severity: "red",
    region: "Wayanad & Western Ghats",
    edgeIds: ["HAS-MNG", "MDK-MNG", "WYN-KZD", "TSR-KCH"],
    headline: "IMD Red Alert: Extremely heavy rainfall and high landslide risk in Ghat corridors",
  },
  {
    id: "alert-kerala-2018-02",
    scenario: "kerala-2018",
    validFromT: 14,
    validToT: 60,
    severity: "orange",
    region: "Central Kerala Lowlands",
    edgeIds: ["TSR-KCH", "KCH-KTM"],
    headline: "NDMA Advisory: Periyar & Meenachil basin riverine overflow watch",
  },
  {
    id: "alert-chennai-2015-01",
    scenario: "chennai-2015",
    validFromT: 4,
    validToT: 36,
    severity: "red",
    region: "North Tamil Nadu Coastal Corridor",
    edgeIds: ["BLR-CHN", "SLM-CHN"],
    headline: "Chennai Depression Inundation Warning: Severe storm surge along NH-48 / NH-44",
  },
  {
    id: "alert-ghat-landslide-01",
    scenario: "ghat-landslide",
    validFromT: 8,
    validToT: 30,
    severity: "orange",
    region: "South Karnataka Malnad",
    edgeIds: ["HAS-MNG", "MYS-MDK"],
    headline: "State Disaster Authority: Debris flow warning across Shiradi and Sampaje passes",
  },
];

export function simulateOfficialAlertObservations(
  scenario: ScenarioId,
  edges: NetworkEdge[],
  currentT: number
): Observation[] {
  const observations: Observation[] = [];
  const config = DEFAULT_SOURCE_CONFIGS.official_alert;
  const latency = config.latencyHours; // 1.0h

  const relevantAlerts = SCENARIO_CIVIL_ALERTS.filter(
    (a) => a.scenario === scenario && currentT >= a.validFromT + latency
  );

  for (const alert of relevantAlerts) {
    const receivedAtT = alert.validFromT + latency;

    for (const edgeId of alert.edgeIds) {
      const edge = edges.find((e) => e.id === edgeId);
      if (!edge) continue;

      observations.push({
        id: `obs-alert-${alert.id}-${edgeId}`,
        edgeId,
        sourceType: "official_alert",
        claim: "degraded", // Alert indicates caution/degradation, not guaranteed physical closure
        confidence: alert.severity === "red" ? 0.6 : 0.45,
        observedAtT: alert.validFromT,
        receivedAtT,
        provenance: config.provenance,
        details: `${alert.headline} impacting ${edge.name}`,
        evidence: {
          alertId: alert.id,
          severity: alert.severity,
          issuingAgency: "IMD / State Disaster Management Authority",
          validFromT: alert.validFromT,
          validToT: alert.validToT,
        },
      });
    }
  }

  return observations;
}
