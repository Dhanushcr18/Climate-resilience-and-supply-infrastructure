import { OptimizationRequest, OptimizationResult, TruckAssignment, OptimizerStop } from "./types";

interface CuOptPostResponse {
  reqId?: string;
  req_id?: string;
  status?: string;
  response?: unknown;
  solver_response?: unknown;
  vehicle_data?: unknown;
  solution?: unknown;
}

export function buildCuOptPayload(request: OptimizationRequest) {
  const locations = request.facilityIds;
  const locationIndex = new Map(locations.map((id, index) => [id, index]));
  const taskLocations: number[] = [];
  const demand: number[] = [];
  const taskWindows: number[][] = [];
  const serviceTimes: number[] = [];
  const taskOrderMap: Array<{ orderId: string; kind: "pickup" | "delivery" }> = [];

  request.orders.forEach((order) => {
    const pickupIndex = locationIndex.get(order.pickupFacility);
    const deliveryIndex = locationIndex.get(order.deliveryFacility);
    if (pickupIndex === undefined || deliveryIndex === undefined) return;
    taskLocations.push(pickupIndex, deliveryIndex);
    demand.push(order.qty, -order.qty);
    taskWindows.push([order.earliestT, order.deadlineT], [order.earliestT, order.deadlineT]);
    serviceTimes.push(order.coldChain ? 5 : 0, order.coldChain ? 5 : 0);
    taskOrderMap.push(
      { orderId: order.id, kind: "pickup" },
      { orderId: order.id, kind: "delivery" }
    );
  });

  const pickupPairs = request.orders.map((order) => {
    const taskIndex = taskOrderMap.findIndex((task) => task.orderId === order.id && task.kind === "pickup");
    const deliveryTaskIndex = taskOrderMap.findIndex((task) => task.orderId === order.id && task.kind === "delivery");
    return [taskIndex, deliveryTaskIndex];
  }).filter((pair) => pair[0] >= 0 && pair[1] >= 0);

  const fleetLocations = request.trucks.map((truck) => {
    const index = locationIndex.get(truck.location) ?? 0;
    return [index, index];
  });

  return {
    cost_matrix_data: { data: { "0": request.travelTimeMinutes } },
    travel_time_matrix_data: { data: { "0": request.travelTimeMinutes } },
    task_data: {
      task_locations: taskLocations,
      demand: demand.length ? [demand] : [[]],
      task_time_windows: taskWindows,
      service_times: serviceTimes,
      pickup_and_delivery_pairs: pickupPairs,
    },
    fleet_data: {
      vehicle_locations: fleetLocations,
      capacities: [request.trucks.map((truck) => truck.capacity)],
      vehicle_time_windows: request.trucks.map((truck) => [
        truck.availableAt,
        request.constraints.maxSolverSeconds ? truck.availableAt + request.constraints.maxSolverSeconds * 60 : 72,
      ]),
    },
    solver_config: {
      time_limit: Math.min(8, request.constraints.maxSolverSeconds ?? 8),
    },
  };
}

function parseTaskIndex(value: unknown, taskCount: number): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value < taskCount) return value;
  if (typeof value === "string") {
    const match = value.match(/(?:task[_-]?|^)(\d+)$/i);
    if (match) {
      const index = Number(match[1]);
      if (index >= 0 && index < taskCount) return index;
    }
  }
  return null;
}

function extractResponseJson(body: unknown): unknown {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (record.response && typeof record.response === "object") return record.response;
  if (record.solver_response) return record.solver_response;
  if (record.solution) return record.solution;
  return record;
}

export async function solveCuOpt(request: OptimizationRequest): Promise<OptimizationResult> {
  const baseUrl = (process.env.CUOPT_URL || "").replace(/\/+$/, "");
  if (!baseUrl) throw new Error("CUOPT_URL is not configured");
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "CLIENT-VERSION": "custom",
  };
  if (process.env.CUOPT_API_KEY) {
    headers.Authorization = `Bearer ${process.env.CUOPT_API_KEY}`;
  }

  try {
    const payload = buildCuOptPayload(request);
    const postResponse = await fetch(`${baseUrl}/cuopt/request`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!postResponse.ok) throw new Error(`cuOpt returned HTTP ${postResponse.status}`);

    let body: CuOptPostResponse;
    try {
      body = await postResponse.json() as CuOptPostResponse;
    } catch {
      throw new Error("Invalid JSON from cuOpt");
    }
    if (!body || typeof body !== "object") throw new Error("Malformed cuOpt response");

    let solutionBody: unknown = body.response ?? body.solver_response ?? body.solution;
    if (body.reqId || body.req_id) {
      const reqId = body.reqId ?? body.req_id;
      if (!solutionBody) {
        for (let attempt = 0; attempt < 80; attempt++) {
          if (controller.signal.aborted) throw new Error("cuOpt timeout");
          const solutionResponse = await fetch(`${baseUrl}/cuopt/solution/${encodeURIComponent(reqId!)}`, {
            headers,
            signal: controller.signal,
          });
          if (!solutionResponse.ok) throw new Error(`cuOpt solution returned HTTP ${solutionResponse.status}`);
          let polled: unknown;
          try {
            polled = await solutionResponse.json();
          } catch {
            throw new Error("Invalid JSON from cuOpt solution endpoint");
          }
          const polledRecord = polled as Record<string, unknown>;
          if (polledRecord.status === "completed" ||
              polledRecord.status === "COMPLETED" ||
              polledRecord.status === "success") {
            solutionBody = extractResponseJson(polled);
            break;
          }
          if (polledRecord.status === "failed" || polledRecord.status === "error") {
            throw new Error("cuOpt reported infeasible or failed solve");
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        if (!solutionBody) throw new Error("cuOpt timeout");
      }
    }

    const root = extractResponseJson(solutionBody) as Record<string, unknown> | null;
    const solverResponse = (root?.solver_response ?? root) as Record<string, unknown>;
    const vehicleData =
      (solverResponse?.vehicle_data as unknown) ??
      (root?.vehicle_data as unknown) ??
      (body.vehicle_data as unknown);
    if (!vehicleData || typeof vehicleData !== "object") throw new Error("Malformed cuOpt plan");

    const taskMap: Array<{ orderId: string; kind: "pickup" | "delivery"; facilityId: string; itemId: string; qty: number }> = [];
    request.orders.forEach((order) => {
      taskMap.push({
        orderId: order.id,
        kind: "pickup",
        facilityId: order.pickupFacility,
        itemId: order.itemId,
        qty: order.qty,
      });
      taskMap.push({
        orderId: order.id,
        kind: "delivery",
        facilityId: order.deliveryFacility,
        itemId: order.itemId,
        qty: -order.qty,
      });
    });

    const assignments: TruckAssignment[] = [];
    const assigned = new Set<string>();
    for (const truck of request.trucks) {
      const vehicleEntry =
        (vehicleData as Record<string, unknown>)[truck.id] ??
        (vehicleData as Record<string, unknown>)[String(request.trucks.indexOf(truck))];
      if (!vehicleEntry || typeof vehicleEntry !== "object") {
        assignments.push({ truckId: truck.id, sequence: [], objectiveCost: 0 });
        continue;
      }
      const vehicle = vehicleEntry as Record<string, unknown>;
      const taskIds = vehicle.task_id;
      const arrivalStamps = vehicle.arrival_stamp;
      if (!Array.isArray(taskIds)) {
        assignments.push({ truckId: truck.id, sequence: [], objectiveCost: 0 });
        continue;
      }
      const sequence: OptimizerStop[] = [];
      taskIds.forEach((taskId, position) => {
        const taskIndex = parseTaskIndex(taskId, taskMap.length);
        if (taskIndex === null) return;
        const task = taskMap[taskIndex];
        if (!task) return;
        const arrival = Array.isArray(arrivalStamps) && typeof arrivalStamps[position] === "number"
          ? arrivalStamps[position]
          : truck.availableAt;
        sequence.push({
          orderId: task.orderId,
          kind: task.kind,
          facilityId: task.facilityId,
          itemId: task.itemId,
          qty: task.qty,
          arrivalT: arrival,
        });
        assigned.add(task.orderId);
      });
      assignments.push({ truckId: truck.id, sequence, objectiveCost: typeof vehicle.cost === "number" ? vehicle.cost : undefined });
    }

    const unassignedOrders = request.orders
      .filter((order) => !assigned.has(order.id))
      .map((order) => ({ orderId: order.id, reason: "Not assigned by cuOpt" }));

    return {
      assignments,
      unassignedOrders,
      objective: typeof (solverResponse as Record<string, unknown>).solution_cost === "number"
        ? (solverResponse as Record<string, unknown>).solution_cost as number
        : typeof (solverResponse as Record<string, unknown>).objective_value === "number"
        ? (solverResponse as Record<string, unknown>).objective_value as number
        : sequenceObjective(assignments),
      solver: "cuopt",
      solveMs: Date.now() - started,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("cuOpt timeout");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function sequenceObjective(assignments: TruckAssignment[]): number {
  return assignments.reduce((sum, assignment) => sum + assignment.sequence.length, 0);
}
