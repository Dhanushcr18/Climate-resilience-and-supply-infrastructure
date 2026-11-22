import { describe, it, expect } from "vitest";
import { dijkstra, findRoutes, findRerouteFromCurrentEdge } from "../lib/sim/routing";
import { EDGES } from "../lib/sim/network";

describe("Routing engine (routing.ts)", () => {
  it("computes direct shortest path when risks are zero", () => {
    const riskMap = new Map<string, number>();
    const result = dijkstra("BLR", "MYS", riskMap, false);
    expect(result).not.toBeNull();
    expect(result!.nodes).toEqual(["BLR", "MYS"]);
    expect(result!.edges.length).toBe(1);
    expect(result!.totalMinutes).toBe(140);
  });

  it("avoids closed edges when considering risk", () => {
    // Shiradi Ghat (HAS-MNG) is closed
    const riskMap = new Map<string, number>();
    riskMap.set("HAS-MNG", 90);

    const route = dijkstra("HAS", "MNG", riskMap, true);
    // Should NOT use HAS-MNG directly since it is closed (score >= 85)
    if (route) {
      expect(route.edges.some((e) => e.id === "HAS-MNG")).toBe(false);
    }
  });

  it("penalizes high risk edges and picks safer alternative corridor", () => {
    // For Bengaluru to Mangaluru:
    // Route A: BLR -> HAS -> MNG (via Shiradi Ghat, base ~420 min)
    // Route B: BLR -> MYS -> MDK -> MNG (via Sampaje Ghat, base ~485 min)
    const riskMap = new Map<string, number>();
    // Set Shiradi Ghat to high risk 80 (penalty = 0.8^2 * 600 = 384 min)
    riskMap.set("HAS-MNG", 80);

    const routes = findRoutes("BLR", "MNG", riskMap);
    expect(routes.fastest).not.toBeNull();
    expect(routes.safest).not.toBeNull();

    // Fastest ignores risk and takes Shiradi
    expect(routes.fastest!.edges.some((e) => e.id === "HAS-MNG")).toBe(true);

    // Safest avoids or penalizes Shiradi and prefers the lower-risk corridor
    expect(routes.safest!.edges.some((e) => e.id === "HAS-MNG")).toBe(false);
  });

  it("returns null when completely surrounded by closed roads", () => {
    const riskMap = new Map<string, number>();
    // Close all roads connecting to Mangaluru (HAS-MNG, MDK-MNG, KNR-MNG)
    riskMap.set("HAS-MNG", 95);
    riskMap.set("MDK-MNG", 95);
    riskMap.set("KNR-MNG", 95);

    const route = dijkstra("BLR", "MNG", riskMap, true);
    expect(route).toBeNull();
  });

  it("handles rerouting from mid-edge position correctly", () => {
    const riskMap = new Map<string, number>();
    const edge = EDGES.find((e) => e.id === "BLR-HAS")!;
    // Truck is 50% along BLR-HAS heading to HAS, dest is MNG
    const reroute = findRerouteFromCurrentEdge(edge, 0.5, "HAS", "MNG", riskMap);
    expect(reroute).not.toBeNull();
    expect(reroute!.totalMinutes).toBeGreaterThan(0);
  });
});
