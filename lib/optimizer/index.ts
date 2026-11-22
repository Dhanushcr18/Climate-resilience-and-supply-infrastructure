import { solveBuiltin } from "./builtin";
import { solveCuOpt } from "./cuopt";
import { validateOptimizationResult } from "./validate";
import { OptimizationRequest, OptimizationResult } from "./types";

export async function solve(request: OptimizationRequest): Promise<OptimizationResult> {
  const cuoptUrl = process.env.CUOPT_URL;
  if (!cuoptUrl) {
    const builtin = solveBuiltin(request);
    const validated = validateOptimizationResult(request, builtin);
    return validated.valid ? builtin : {
      ...builtin,
      assignments: [],
      unassignedOrders: request.orders.map((order) => ({
        orderId: order.id,
        reason: "Builtin result failed validation",
      })),
      fallbackReason: "Builtin result failed validation",
    };
  }

  try {
    const cuopt = await solveCuOpt(request);
    const validation = validateOptimizationResult(request, cuopt);
    if (!validation.valid) throw new Error(validation.reason || "Invalid cuOpt plan");
    return cuopt;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "cuOpt unavailable";
    const builtin = solveBuiltin(request);
    const validation = validateOptimizationResult(request, builtin);
    if (!validation.valid) {
      return {
        assignments: [],
        unassignedOrders: request.orders.map((order) => ({
          orderId: order.id,
          reason: "No validated plan available",
        })),
        objective: Number.POSITIVE_INFINITY,
        solver: "builtin",
        solveMs: Date.now() - Date.now(),
        fallbackReason: `${reason}; builtin failed validation`,
      };
    }
    return { ...builtin, fallbackReason: reason };
  }
}

export { solveBuiltin } from "./builtin";
