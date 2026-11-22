import { describe, expect, it, vi, afterEach } from "vitest";
import { solveBuiltin } from "@/lib/optimizer/builtin";
import { solve } from "@/lib/optimizer";
import { validateOptimizationResult } from "@/lib/optimizer/validate";
import { OptimizationRequest, OptimizationResult } from "@/lib/optimizer/types";
import { buildScenarioOptimizationRequest } from "@/lib/optimizer/request";

function request(): OptimizationRequest {
  return {
    trucks: [
      { id: "T1", location: "A", capacity: 30, coldChainLimitMinutes: 120, availableAt: 0 },
      { id: "T2", location: "A", capacity: 30, coldChainLimitMinutes: 120, availableAt: 0 },
    ],
    orders: [
      { id: "O1", pickupFacility: "A", deliveryFacility: "B", itemId: "medicine", qty: 20, earliestT: 0, deadlineT: 5, priority: "critical", coldChain: true },
      { id: "O2", pickupFacility: "A", deliveryFacility: "C", itemId: "medicine", qty: 20, earliestT: 0, deadlineT: 5, priority: "high", coldChain: true },
    ],
    facilities: [
      { id: "A", stock: { medicine: { available: 30, safetyStock: 10 } } },
      { id: "B", stock: { medicine: { available: 0, safetyStock: 0 } } },
      { id: "C", stock: { medicine: { available: 0, safetyStock: 0 } } },
    ],
    facilityIds: ["A", "B", "C"],
    travelTimeMinutes: [[0, 60, 60], [60, 0, 60], [60, 60, 0]],
    edgeRiskPercent: [[0, 20, 20], [20, 0, 20], [20, 20, 0]],
    constraints: { maxSolverSeconds: 8, coldChainLimitMinutes: 120 },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.CUOPT_URL;
  delete process.env.CUOPT_API_KEY;
});

describe("optimizer", () => {
  it("is deterministic and prevents scarce stock double allocation", () => {
    const scenario = request();
    const first = solveBuiltin(scenario);
    const second = solveBuiltin(scenario);
    expect(first).toEqual(second);
    const pickupQty = first.assignments.flatMap((a) => a.sequence)
      .filter((stop) => stop.kind === "pickup")
      .reduce((sum, stop) => sum + stop.qty, 0);
    expect(pickupQty).toBeLessThanOrEqual(20);
    expect(validateOptimizationResult(scenario, first).valid).toBe(true);
  });

  it("rejects a closed-road plan", () => {
    const scenario = request();
    const bad: OptimizationResult = {
      assignments: [{
        truckId: "T1",
        sequence: [
          { orderId: "O1", kind: "pickup", facilityId: "A", itemId: "medicine", qty: 20, arrivalT: 1 },
          { orderId: "O1", kind: "delivery", facilityId: "B", itemId: "medicine", qty: -20, arrivalT: 2 },
        ],
      }],
      unassignedOrders: [{ orderId: "O2", reason: "No capacity" }],
      objective: 2,
      solver: "cuopt",
      solveMs: 1,
    };
    scenario.edgeRiskPercent[0][1] = 85;
    expect(validateOptimizationResult(scenario, bad).valid).toBe(false);
  });

  it("rejects safety-stock breach", () => {
    const scenario = request();
    const bad: OptimizationResult = {
      assignments: [{
        truckId: "T1",
        sequence: [
          { orderId: "O1", kind: "pickup", facilityId: "A", itemId: "medicine", qty: 20, arrivalT: 1 },
          { orderId: "O1", kind: "delivery", facilityId: "B", itemId: "medicine", qty: -20, arrivalT: 2 },
        ],
      }],
      unassignedOrders: [{ orderId: "O2", reason: "No stock" }],
      objective: 2,
      solver: "cuopt",
      solveMs: 1,
    };
    scenario.facilities[0].stock.medicine.available = 20;
    scenario.facilities[0].stock.medicine.safetyStock = 10;
    expect(validateOptimizationResult(scenario, bad).valid).toBe(false);

    const breach = structuredClone(bad);
    breach.assignments[0].sequence[0].qty = 11;
    breach.assignments[0].sequence[1].qty = -11;
    scenario.facilities[0].stock.medicine.available = 20;
    scenario.facilities[0].stock.medicine.safetyStock = 10;
    expect(validateOptimizationResult(scenario, breach).valid).toBe(false);
  });

  it("falls back on HTTP 500", async () => {
    process.env.CUOPT_URL = "http://cuopt.test";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("server error", { status: 500 })));
    const result = await solve(request());
    expect(result.solver).toBe("builtin");
    expect(result.fallbackReason).toContain("500");
  });

  it("falls back on invalid JSON", async () => {
    process.env.CUOPT_URL = "http://cuopt.test";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not-json", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })));
    const result = await solve(request());
    expect(result.solver).toBe("builtin");
  });

  it("falls back on timeout", async () => {
    process.env.CUOPT_URL = "http://cuopt.test";
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      })
    ));
    const result = await solve(request());
    expect(result.solver).toBe("builtin");
    expect(result.fallbackReason).toContain("timeout");
  }, 9000);

  it("produces valid built-in plans for the kerala scenario", () => {
    const scenario = buildScenarioOptimizationRequest({
      scenario: "kerala-2018",
      nowT: 20,
    });
    const plan = solveBuiltin(scenario);
    expect(validateOptimizationResult(scenario, plan).valid).toBe(true);
  });

  it("accepts a valid mocked cuOpt response", async () => {
    process.env.CUOPT_URL = "http://cuopt.test";
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("/cuopt/request")) {
        return new Response(JSON.stringify({ reqId: "mock-1" }), { status: 200 });
      }
      return new Response(JSON.stringify({
        status: "completed",
        response: {
          solver_response: {
            solution_cost: 2,
            vehicle_data: {
              T1: { task_id: [0, 1], arrival_stamp: [1, 2], cost: 2 },
            },
          },
        },
      }), { status: 200 });
    }));
    const result = await solve(request());
    expect(result.solver).toBe("cuopt");
    expect(validateOptimizationResult(request(), result).valid).toBe(true);
  });
});
