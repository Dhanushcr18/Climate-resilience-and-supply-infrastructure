import { SEEDED_SHIPMENTS } from "@/lib/sim/shipments";
import { NODES, EDGES } from "@/lib/sim/network";
import { dijkstra } from "@/lib/sim/routing";
import { ScenarioId } from "@/lib/sim/scenarios";
import { OptimizationRequest, OptimizerOrder, OptimizerTruck } from "./types";

export function getCargoItem(shipment: (typeof SEEDED_SHIPMENTS)[number]): string {
  return shipment.cargo;
}

export function buildScenarioOptimizationRequest(params: {
  scenario: ScenarioId;
  nowT: number;
  riskByEdge?: Map<string, number>;
}): OptimizationRequest {
  const ids = Object.keys(NODES).sort();
  const index = new Map(ids.map((id, i) => [id, i]));
  const riskMap = params.riskByEdge ?? new Map<string, number>();
  const travelTimeMinutes: number[][] = [];
  const edgeRiskPercent: number[][] = [];

  for (const from of ids) {
    const travelRow: number[] = [];
    const riskRow: number[] = [];
    for (const to of ids) {
      if (from === to) {
        travelRow.push(0);
        riskRow.push(0);
        continue;
      }
      const route = dijkstra(from, to, riskMap, true);
      if (!route) {
        travelRow.push(Number.POSITIVE_INFINITY);
        riskRow.push(100);
      } else {
        travelRow.push(route.totalMinutes);
        riskRow.push(route.edges.reduce((max, edge) => {
          const risk = riskMap.get(edge.id) ?? 0;
          return Math.max(max, risk);
        }, 0));
      }
    }
    travelTimeMinutes.push(travelRow);
    edgeRiskPercent.push(riskRow);
  }

  const trucks: OptimizerTruck[] = SEEDED_SHIPMENTS.map((shipment) => ({
    id: shipment.code,
    location: shipment.origin,
    capacity: 100,
    coldChainLimitMinutes: shipment.perishable ? 360 : undefined,
    availableAt: shipment.departureHour,
  }));

  const orders: OptimizerOrder[] = SEEDED_SHIPMENTS
    .filter((shipment) => shipment.departureHour >= params.nowT)
    .map((shipment) => ({
      id: shipment.code,
      pickupFacility: shipment.origin,
      deliveryFacility: shipment.destination,
      itemId: getCargoItem(shipment),
      qty: 10,
      earliestT: shipment.departureHour,
      deadlineT: 72,
      priority: shipment.priority,
      coldChain: shipment.perishable,
    }));

  const facilities = ids.map((id) => {
    const stock: Record<string, { available: number; safetyStock: number }> = {};
    for (const itemId of ["medicine", "food", "fuel", "water"]) {
      stock[itemId] = { available: 1000, safetyStock: 100 };
    }
    return { id, stock };
  });

  return {
    trucks,
    orders,
    facilities,
    facilityIds: ids,
    travelTimeMinutes,
    edgeRiskPercent,
    constraints: { maxSolverSeconds: 8, coldChainLimitMinutes: 360 },
    nowT: params.nowT,
  };
}
