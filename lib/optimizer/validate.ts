import { OptimizationRequest, OptimizationResult } from "./types";

export function validateOptimizationResult(
  request: OptimizationRequest,
  result: OptimizationResult
): { valid: boolean; reason?: string } {
  if (!result || !Array.isArray(result.assignments)) {
    return { valid: false, reason: "Malformed optimizer response" };
  }
  const facilityIndex = new Map(request.facilityIds.map((id, index) => [id, index]));
  const truckById = new Map(request.trucks.map((truck) => [truck.id, truck]));
  const orderById = new Map(request.orders.map((order) => [order.id, order]));
  const allocated = new Set<string>();
  const stockUsed = new Map(request.facilities.map((facility) =>
    [facility.id, new Map(Object.entries(facility.stock).map(([itemId, value]) =>
      [itemId, value.available]))]
  ));
  const knownTruckIds = new Set(truckById.keys());

  for (const assignment of result.assignments) {
    if (!knownTruckIds.has(assignment.truckId)) {
      return { valid: false, reason: `Unknown truck ${assignment.truckId}` };
    }
    const truck = truckById.get(assignment.truckId)!;
    let capacityUsed = 0;
    let previousFacility = truck.location;
    let elapsed = truck.availableAt;
    let previousTime = truck.availableAt;

    for (const stop of assignment.sequence ?? []) {
      const order = orderById.get(stop.orderId);
      if (!order) return { valid: false, reason: `Unknown order ${stop.orderId}` };
      if (stop.kind === "pickup") {
        if (allocated.has(stop.orderId)) {
          return { valid: false, reason: `Order ${stop.orderId} allocated twice` };
        }
        allocated.add(stop.orderId);
      }
      if (stop.facilityId !== (stop.kind === "pickup" ? order.pickupFacility : order.deliveryFacility)) {
        return { valid: false, reason: `Wrong ${stop.kind} facility for ${stop.orderId}` };
      }
      const from = facilityIndex.get(previousFacility);
      const to = facilityIndex.get(stop.facilityId);
      if (from === undefined || to === undefined) {
        return { valid: false, reason: `Unknown facility in route for ${stop.orderId}` };
      }
      const travel = request.travelTimeMinutes[from]?.[to];
      const risk = request.edgeRiskPercent[from]?.[to];
      if (!Number.isFinite(travel)) {
        return { valid: false, reason: `Unreachable route for ${stop.orderId}` };
      }
      if (typeof risk === "number" && risk >= 85) {
        return { valid: false, reason: `Closed road used for ${stop.orderId}` };
      }
      elapsed += travel / 60;
      if (!Number.isFinite(stop.arrivalT) || stop.arrivalT + 1e-6 < elapsed || stop.arrivalT + 1e-6 < previousTime) {
        return { valid: false, reason: `Arrival time mismatch for ${stop.orderId}` };
      }
      previousTime = stop.arrivalT;
      previousFacility = stop.facilityId;

      if (stop.kind === "pickup") {
        if (stop.qty !== order.qty) {
          return { valid: false, reason: `Pickup quantity mismatch for ${stop.orderId}` };
        }
        if (stop.arrivalT < order.earliestT - 1e-6) {
          return { valid: false, reason: `Pickup before earliest time for ${stop.orderId}` };
        }
        const facilityStock = stockUsed.get(order.pickupFacility);
        const remaining = (facilityStock?.get(order.itemId) ?? 0) - order.qty;
        const safety = request.facilities.find((f) => f.id === order.pickupFacility)?.stock[order.itemId]?.safetyStock ?? 0;
        if (remaining < safety) {
          return { valid: false, reason: `Safety stock breached for ${order.pickupFacility}` };
        }
        facilityStock?.set(order.itemId, remaining);
        capacityUsed += order.qty;
      } else {
        if (stop.qty !== -order.qty) {
          return { valid: false, reason: `Delivery quantity mismatch for ${stop.orderId}` };
        }
        if (stop.arrivalT > order.deadlineT) {
          return { valid: false, reason: `Deadline missed for ${stop.orderId}` };
        }
        capacityUsed -= order.qty;
        if (order.coldChain) {
          const limit = truck.coldChainLimitMinutes ?? request.constraints.coldChainLimitMinutes;
          if (limit !== undefined) {
            const pickup = assignment.sequence.find((s) => s.orderId === order.id && s.kind === "pickup");
            if (pickup && stop.arrivalT - pickup.arrivalT > limit / 60) {
              return { valid: false, reason: `Cold-chain limit exceeded for ${stop.orderId}` };
            }
          }
        }
      }
      if (capacityUsed < 0 || capacityUsed > truck.capacity) {
        return { valid: false, reason: `Truck capacity exceeded for ${assignment.truckId}` };
      }
    }
  }

  for (const unassigned of result.unassignedOrders ?? []) {
    if (!orderById.has(unassigned.orderId) || typeof unassigned.reason !== "string") {
      return { valid: false, reason: "Malformed unassigned order reason" };
    }
    if (allocated.has(unassigned.orderId)) {
      return { valid: false, reason: `Order ${unassigned.orderId} both assigned and unassigned` };
    }
  }
  return { valid: true };
}
