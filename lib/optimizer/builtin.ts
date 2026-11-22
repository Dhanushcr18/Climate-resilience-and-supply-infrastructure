import {
  OptimizationRequest,
  OptimizationResult,
  OptimizerStop,
  TruckAssignment,
} from "./types";

const priorityRank = { critical: 3, high: 2, normal: 1 };

export function solveBuiltin(request: OptimizationRequest): OptimizationResult {
  const assignments: TruckAssignment[] = request.trucks.map((truck) => ({
    truckId: truck.id,
    sequence: [],
    objectiveCost: 0,
  }));
  const unassignedOrders: OptimizationResult["unassignedOrders"] = [];
  const facilityIndex = new Map(request.facilityIds.map((id, index) => [id, index]));
  const stock = new Map(request.facilities.map((facility) =>
    [facility.id, new Map(Object.entries(facility.stock).map(([itemId, value]) =>
      [itemId, value.available]))]
  ));
  const remainingCapacity = new Map(request.trucks.map((truck) => [truck.id, truck.capacity]));
  const clock = new Map(request.trucks.map((truck) => [truck.id, truck.availableAt]));
  const location = new Map(request.trucks.map((truck) => [truck.id, truck.location]));

  const ordered = [...request.orders].sort((a, b) => {
    const priority = priorityRank[b.priority] - priorityRank[a.priority];
    return priority || a.deadlineT - b.deadlineT || a.id.localeCompare(b.id);
  });

  for (const order of ordered) {
    const pickupStock = stock.get(order.pickupFacility)?.get(order.itemId);
    const pickupFacility = request.facilities.find((f) => f.id === order.pickupFacility);
    const safety = pickupFacility?.stock[order.itemId]?.safetyStock ?? 0;
    if (pickupStock === undefined) {
      unassignedOrders.push({ orderId: order.id, reason: "Pickup facility or item not found" });
      continue;
    }
    if (pickupStock - order.qty < safety) {
      unassignedOrders.push({ orderId: order.id, reason: "Insufficient stock above safety reserve" });
      continue;
    }

    let selected: TruckAssignment | null = null;
    let selectedTruckIndex = -1;
    let selectedCost = Number.POSITIVE_INFINITY;
    let selectedPickupArrival = 0;

    for (let i = 0; i < request.trucks.length; i++) {
      const truck = request.trucks[i];
      if ((remainingCapacity.get(truck.id) ?? 0) < order.qty) continue;
      const pickupIndex = facilityIndex.get(order.pickupFacility);
      const deliveryIndex = facilityIndex.get(order.deliveryFacility);
      const originIndex = facilityIndex.get(location.get(truck.id) ?? "");
      if (pickupIndex === undefined || deliveryIndex === undefined || originIndex === undefined) continue;
      const pickupMinutes = request.travelTimeMinutes[originIndex]?.[pickupIndex];
      const deliveryMinutes = request.travelTimeMinutes[pickupIndex]?.[deliveryIndex];
      if (!Number.isFinite(pickupMinutes) || !Number.isFinite(deliveryMinutes)) continue;

      const pickupAt = (clock.get(truck.id) ?? truck.availableAt) +
        pickupMinutes / 60 + Math.max(0, order.earliestT - (clock.get(truck.id) ?? truck.availableAt));
      const deliveryAt = pickupAt + deliveryMinutes / 60;
      if (deliveryAt > order.deadlineT) continue;
      if (order.coldChain) {
        const limit = truck.coldChainLimitMinutes ?? request.constraints.coldChainLimitMinutes ?? 0;
        if (limit > 0 && deliveryMinutes > limit) continue;
      }
      if (request.edgeRiskPercent[originIndex]?.[pickupIndex] >= 85 ||
          request.edgeRiskPercent[pickupIndex]?.[deliveryIndex] >= 85) continue;

      const cost = pickupAt + deliveryAt;
      if (cost < selectedCost) {
        selected = assignments[i];
        selectedTruckIndex = i;
        selectedCost = cost;
        selectedPickupArrival = pickupAt;
      }
    }

    if (!selected) {
      unassignedOrders.push({ orderId: order.id, reason: "No safe feasible truck assignment" });
      continue;
    }

    const truck = request.trucks[selectedTruckIndex];
    const deliveryIndex = facilityIndex.get(order.deliveryFacility)!;
    const pickupIndex = facilityIndex.get(order.pickupFacility)!;
    void deliveryIndex;
    void pickupIndex;
    const travelPickup = request.travelTimeMinutes[
      facilityIndex.get(location.get(truck.id) ?? "")!
    ]?.[facilityIndex.get(order.pickupFacility)!] ?? 0;
    const pickupArrival = (clock.get(truck.id) ?? truck.availableAt) +
      travelPickup / 60 + Math.max(0, order.earliestT - (clock.get(truck.id) ?? truck.availableAt));
    const deliveryTravel = request.travelTimeMinutes[
      facilityIndex.get(order.pickupFacility)!
    ]?.[facilityIndex.get(order.deliveryFacility)!] ?? 0;
    const deliveryArrival = pickupArrival + deliveryTravel / 60;
    const pickupStop: OptimizerStop = {
      orderId: order.id,
      kind: "pickup",
      facilityId: order.pickupFacility,
      itemId: order.itemId,
      qty: order.qty,
      arrivalT: pickupArrival,
    };
    const deliveryStop: OptimizerStop = {
      orderId: order.id,
      kind: "delivery",
      facilityId: order.deliveryFacility,
      itemId: order.itemId,
      qty: -order.qty,
      arrivalT: deliveryArrival,
    };
    selected.sequence.push(pickupStop, deliveryStop);
    remainingCapacity.set(truck.id, (remainingCapacity.get(truck.id) ?? 0) - order.qty);
    clock.set(truck.id, deliveryArrival);
    location.set(truck.id, order.deliveryFacility);
    stock.get(order.pickupFacility)?.set(order.itemId, (pickupStock ?? 0) - order.qty);
  }

  return {
    assignments,
    unassignedOrders,
    objective: assignments.reduce((sum, assignment) => sum + assignment.sequence.length, 0),
    solver: "builtin",
    solveMs: 0,
  };
}
