/**
 * Compares "With Agent" vs "Without Agent (Baseline)" impact metrics
 */
import { simulate, SimulationResult } from "./engine";
import { ScenarioId } from "./scenarios";

export interface ImpactSummary {
  scenarioId: ScenarioId;
  isEstimate: boolean; // Must always be true per rules

  // Shipment counts
  totalShipments: number;
  shipmentsRerouted: number;
  shipmentsHeld: number;
  shipmentsEscalated: number;
  shipmentsStuckBaseline: number;
  medicineProtectedCount: number;

  // Delays
  baselineTotalDelayHours: number;
  agentTotalDelayHours: number;
  delayHoursSaved: number;
  percentageDelayReduced: number;

  // Breakdown per shipment
  shipmentComparisons: {
    code: string;
    cargo: string;
    priority: string;
    baselineDelayHours: number;
    agentDelayHours: number;
    delaySavedHours: number;
    decisionMade: string;
  }[];
}

/**
 * Pure function to compute comparative impact
 */
export function calculateImpact(scenarioId: ScenarioId): ImpactSummary {
  const agentRun = simulate({ scenario: scenarioId, mode: "agent" });
  const baselineRun = simulate({ scenario: scenarioId, mode: "baseline" });

  let shipmentsRerouted = 0;
  let shipmentsHeld = 0;
  let shipmentsEscalated = 0;

  agentRun.decisions.forEach((d) => {
    if (d.decision === "REROUTE") shipmentsRerouted++;
    else if (d.decision === "HOLD") shipmentsHeld++;
    else if (d.decision === "ESCALATE") shipmentsEscalated++;
  });

  let shipmentsStuckBaseline = 0;
  let baselineTotalDelayHours = 0;
  let agentTotalDelayHours = 0;
  let medicineProtectedCount = 0;

  const shipmentComparisons: ImpactSummary["shipmentComparisons"] = [];

  // Group by shipment code
  const allCodes = Array.from(baselineRun.shipmentDelays.keys());

  allCodes.forEach((code) => {
    const baseDelay = baselineRun.shipmentDelays.get(code) || 0;
    const agentDelay = agentRun.shipmentDelays.get(code) || 0;
    const diff = Math.max(0, baseDelay - agentDelay);

    baselineTotalDelayHours += baseDelay;
    agentTotalDelayHours += agentDelay;

    if (baseDelay > 0) {
      shipmentsStuckBaseline++;
    }

    // Find decision made for this shipment
    const dec = agentRun.decisions.find((d) => d.shipmentCode === code);
    const decisionStr = dec ? dec.decision : "CONTINUE";

    // Sample truck to get metadata
    const sampleTruck = agentRun.timeline.get(0)?.find((t) => t.code === code);
    const cargo = sampleTruck?.shipment.cargo || "general";
    const priority = sampleTruck?.shipment.priority || "normal";

    if ((cargo === "medicine" || priority === "critical") && baseDelay > 0 && agentDelay === 0) {
      medicineProtectedCount++;
    }

    shipmentComparisons.push({
      code,
      cargo,
      priority,
      baselineDelayHours: baseDelay,
      agentDelayHours: agentDelay,
      delaySavedHours: diff,
      decisionMade: decisionStr,
    });
  });

  const delayHoursSaved = Math.max(
    0,
    baselineTotalDelayHours - agentTotalDelayHours
  );
  const percentageDelayReduced =
    baselineTotalDelayHours > 0
      ? Math.round((delayHoursSaved / baselineTotalDelayHours) * 100)
      : 0;

  return {
    scenarioId,
    isEstimate: true,
    totalShipments: allCodes.length,
    shipmentsRerouted,
    shipmentsHeld,
    shipmentsEscalated,
    shipmentsStuckBaseline,
    medicineProtectedCount,
    baselineTotalDelayHours,
    agentTotalDelayHours,
    delayHoursSaved,
    percentageDelayReduced,
    shipmentComparisons,
  };
}
