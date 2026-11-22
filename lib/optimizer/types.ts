export interface OptimizerTruck {
  id: string;
  location: string;
  capacity: number;
  coldChainLimitMinutes?: number;
  availableAt: number;
}

export interface OptimizerOrder {
  id: string;
  pickupFacility: string;
  deliveryFacility: string;
  itemId: string;
  qty: number;
  earliestT: number;
  deadlineT: number;
  priority: "critical" | "high" | "normal";
  coldChain: boolean;
}

export interface OptimizerFacility {
  id: string;
  stock: Record<string, {
    available: number;
    safetyStock: number;
  }>;
}

export interface OptimizationConstraints {
  maxSolverSeconds?: number;
  coldChainLimitMinutes?: number;
}

export interface OptimizationRequest {
  trucks: OptimizerTruck[];
  orders: OptimizerOrder[];
  facilities: OptimizerFacility[];
  facilityIds: string[];
  travelTimeMinutes: number[][];
  edgeRiskPercent: number[][];
  constraints: OptimizationConstraints;
  nowT?: number;
}

export interface OptimizerStop {
  orderId: string;
  kind: "pickup" | "delivery";
  facilityId: string;
  itemId: string;
  qty: number;
  arrivalT: number;
}

export interface TruckAssignment {
  truckId: string;
  sequence: OptimizerStop[];
  objectiveCost?: number;
}

export interface UnassignedOrder {
  orderId: string;
  reason: string;
}

export interface OptimizationResult {
  assignments: TruckAssignment[];
  unassignedOrders: UnassignedOrder[];
  objective: number;
  solver: "builtin" | "cuopt";
  solveMs: number;
  fallbackReason?: string;
}
