/**
 * Deterministic template explanation generator
 */
import { Shipment } from "./shipments";
import { RouteResult } from "./routing";

export interface ExplanationFacts {
  shipment: Shipment;
  decision: "CONTINUE" | "REROUTE" | "HOLD" | "ESCALATE";
  riskyRoadName: string;
  riskScore: number;
  rain48hMm: number;
  extraMinutes: number;
  estimatedDelayAvoidedHours: number;
  viaRouteDescription?: string;
  holdDurationHours?: number;
}

export interface GeneratedExplanation {
  explanation: string;
  driverMessage: string;
}

export function generateTemplateExplanation(facts: ExplanationFacts): GeneratedExplanation {
  const {
    shipment,
    decision,
    riskyRoadName,
    riskScore,
    rain48hMm,
    extraMinutes,
    estimatedDelayAvoidedHours,
    viaRouteDescription,
    holdDurationHours,
  } = facts;

  const cargoNoun = shipment.cargo === "medicine" ? "medical supplies" : shipment.cargo;

  if (decision === "REROUTE") {
    const viaText = viaRouteDescription ? ` via ${viaRouteDescription}` : "";
    const delaySavedText =
      estimatedDelayAvoidedHours > 0
        ? ` but avoids an estimated ${estimatedDelayAvoidedHours.toFixed(1)}h closure delay.`
        : ".";

    const explanation = `${shipment.code} (${cargoNoun}) rerouted${viaText}: ${riskyRoadName} has ${riskScore}% landslide/flood risk (${Math.round(rain48hMm)} mm rain in 48h). Adds ${extraMinutes} min${delaySavedText}`;
    const driverMessage = `${shipment.code}: Take ${viaRouteDescription || "alternate"} route. Reason: severe flood/slide hazard on ${riskyRoadName}. +${extraMinutes} min.`;

    return { explanation, driverMessage };
  }

  if (decision === "HOLD") {
    const holdHours = holdDurationHours || 6;
    const explanation = `${shipment.code} (${cargoNoun}) instructed to HOLD at nearest staging hub: ${riskyRoadName} risk is ${riskScore}% with impassable flash flood surge. Weather forecast indicates safe clearing in ~${holdHours}h.`;
    const driverMessage = `${shipment.code}: HOLD at current safe hub for ~${holdHours}h. Road closed ahead (${riskyRoadName}). Await clearance update.`;

    return { explanation, driverMessage };
  }

  if (decision === "ESCALATE") {
    const explanation = `${shipment.code} (${cargoNoun}) flagged for HUMAN DISPATCHER ESCALATION: All viable corridors to ${shipment.destination} are flooded or blocked (risk ${riskScore}% on ${riskyRoadName}). Requires emergency inter-state agency clearance.`;
    const driverMessage = `${shipment.code}: PULL OVER SAFELY. Corridors to destination are flooded. Human dispatch escalated. Standby for coordinator call.`;

    return { explanation, driverMessage };
  }

  // CONTINUE
  const explanation = `${shipment.code} (${cargoNoun}) cleared to CONTINUE on planned route: hazards ahead remain within safe operational limits (${riskScore}% risk).`;
  const driverMessage = `${shipment.code}: All corridors clear. Continue at scheduled cruising speed.`;

  return { explanation, driverMessage };
}
