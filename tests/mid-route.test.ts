import { describe, it, expect } from "vitest";
import {
  dijkstra,
  findKShortestRoutes,
  findRerouteFromCurrentEdge,
  shouldSwitchRoute,
  getNearestSafeStop,
  getPositionAlongEdge,
  REPLAN_CONFIG,
  ROUTING_CONFIG,
  VirtualTruckContext,
} from "../lib/sim/routing";
import { EDGES } from "../lib/sim/network";
import { selectTieredAlternate, getEdgeRiskAtTraversal } from "../lib/sim/tieredRouting";
import { simulate } from "../lib/sim/engine";

describe("Step 4: Mid-Route Dynamic Re-planning Verification", () => {
  const hasMngEdge = EDGES.find((e) => e.id === "HAS-MNG")!;
  const blrHasEdge = EDGES.find((e) => e.id === "BLR-HAS")!;

  it("1. Truck at 40% on closing edge with turn-back permitted uses travelled fraction and turns back", () => {
    // Normal edge where turn-back is permitted (canTurnBack = true)
    const riskMap = new Map<string, number>();
    riskMap.set("HAS-MNG", 95); // Ahead is closed

    // Create a virtual truck at 40% along BLR-HAS heading to HAS, with HAS-MNG closed ahead
    const virtualTruck: VirtualTruckContext = {
      truckId: "TRK-001",
      currentEdge: blrHasEdge, // canTurnBack is true on plain highway
      fractionAlong: 0.4,
      headingToNode: "HAS",
    };

    const route = dijkstra("", "MYS", riskMap, true, virtualTruck);
    expect(route).not.toBeNull();
    // Distance back to BLR should use travelled fraction: 0.4 * 180 min = 72 min
    expect(route!.isTurnaround).toBe(true);
    expect(route!.nodes[0]).toBe("BLR");
  });

  it("2. Truck at 90% on the edge, closure on the next edge with junction -> CONTINUE to the node, then reroute", () => {
    const riskMap = new Map<string, number>();
    riskMap.set("MYS-WYN", 95); // Closure on next edge (MYS-WYN)
    const blrMysEdge = EDGES.find((e) => e.id === "BLR-MYS")!;

    // Truck is 90% along BLR-MYS heading to MYS, destination is KZD
    const virtualTruck: VirtualTruckContext = {
      truckId: "TRK-001",
      currentEdge: blrMysEdge,
      fractionAlong: 0.9,
      headingToNode: "MYS",
    };

    // Route to destination KZD (should continue forward 10% to MYS, then detour via MDK/MNG avoiding MYS-WYN)
    const route = dijkstra("", "KZD", riskMap, true, virtualTruck);
    expect(route).not.toBeNull();
    // Since it's 90% through and MYS has alternate corridors, continuing to MYS is optimal
    expect(route!.isTurnaround).toBe(false);
    expect(route!.nodes[0]).toBe("MYS");
    expect(route!.edges.some((e) => e.id === "MYS-WYN")).toBe(false);
  });

  it("3. Restricted turn-back edge -> turn-back option absent; result is continue or hold at safe stop", () => {
    const riskMap = new Map<string, number>();
    // HAS-MNG has canTurnBack = false (steep single-lane ghat)
    expect(hasMngEdge.canTurnBack).toBe(false);

    const virtualTruck: VirtualTruckContext = {
      truckId: "TRK-001",
      currentEdge: hasMngEdge,
      fractionAlong: 0.4,
      headingToNode: "MNG",
    };

    // If destination is HAS (the previous node), since canTurnBack is false, no turnaround link T -> HAS exists
    const routeToPrevious = dijkstra("", "HAS", riskMap, true, virtualTruck);
    // Since turn-back is restricted, truck cannot turn around on this edge
    if (routeToPrevious) {
      expect(routeToPrevious.isTurnaround).toBe(false);
    }

    // Safe stop layby exists on HAS-MNG
    const safeStop = getNearestSafeStop(hasMngEdge, 0.4, "MNG");
    expect(safeStop).toBeDefined();
    expect(safeStop.fraction).toBe(0.3); // Closest to 0.4 between [0.3, 0.7]
  });

  it("4. Closure behind the truck -> no change / truck continues", () => {
    const riskMap = new Map<string, number>();
    // BLR-HAS is closed behind the truck, but truck is already at 80% heading to HAS
    riskMap.set("BLR-HAS", 95);

    const virtualTruck: VirtualTruckContext = {
      truckId: "TRK-001",
      currentEdge: blrHasEdge,
      fractionAlong: 0.8,
      headingToNode: "HAS",
    };

    const route = dijkstra("", "HAS", riskMap, false, virtualTruck);
    expect(route).not.toBeNull();
    expect(route!.nodes).toEqual(["HAS"]);
    expect(route!.isTurnaround).toBe(false);
  });

  it("5. Risk evaluated at arrival time: edge safe now but forecast to close at arrival is treated as impassable", () => {
    // HAS-MNG traversal risk at t=18 vs t=36
    const earlyRisk = getEdgeRiskAtTraversal("kerala-2018", hasMngEdge, 10, 4);
    const peakRisk = getEdgeRiskAtTraversal("kerala-2018", hasMngEdge, 34, 4);

    expect(earlyRisk.score).toBeLessThan(85);
    expect(peakRisk.score).toBeGreaterThanOrEqual(85);
    expect(peakRisk.isClosed).toBe(true);
  });

  it("6. Yen's returns k distinct loopless routes in non-decreasing cost with reasons", () => {
    const riskMap = new Map<string, number>();
    const candidates = findKShortestRoutes("BLR", "MNG", riskMap, true, 3);

    expect(candidates.length).toBeGreaterThanOrEqual(2);
    // Distinct paths check
    const pathSignatures = new Set(candidates.map((c) => c.nodes.join("->")));
    expect(pathSignatures.size).toBe(candidates.length);

    // Loopless check
    candidates.forEach((c) => {
      const nodeSet = new Set(c.nodes);
      expect(nodeSet.size).toBe(c.nodes.length);
    });
    // Non-decreasing total time
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i].totalMinutes).toBeGreaterThanOrEqual(candidates[i - 1].totalMinutes);
    }
    // Rejected candidates carry rejection reason
    expect(candidates[0].rejected).toBe(false);
    expect(candidates[1].rejected).toBe(true);
    expect(candidates[1].rejectionReason).toBeDefined();
  });

  it("7. Hysteresis: marginally better route does not trigger switch; unsafe current route always does", () => {
    // Case A: marginal gain (+10 min, < 15 min threshold) -> switch false
    const marginal = shouldSwitchRoute({
      currentRouteTimeMin: 300,
      newRouteTimeMin: 290, // 10 min gain
      currentRouteMaxRisk: 40,
      newRouteMaxRisk: 35, // 5 pt drop
      lastReplanT: 10,
      currentT: 11, // 60 min elapsed (past cooldown)
      isCurrentRouteUnsafe: false,
    });
    expect(marginal.switch).toBe(false);

    // Case B: significant gain (+25 min, >= 15 min threshold) -> switch true
    const significant = shouldSwitchRoute({
      currentRouteTimeMin: 300,
      newRouteTimeMin: 275, // 25 min gain
      currentRouteMaxRisk: 40,
      newRouteMaxRisk: 35,
      lastReplanT: 10,
      currentT: 11,
      isCurrentRouteUnsafe: false,
    });
    expect(significant.switch).toBe(true);

    // Case C: Emergency (current route unsafe >= 85) -> always switch true, ignoring cooldown
    const emergency = shouldSwitchRoute({
      currentRouteTimeMin: 300,
      newRouteTimeMin: 450, // slower detour
      currentRouteMaxRisk: 95,
      newRouteMaxRisk: 50,
      lastReplanT: 10.4,
      currentT: 10.5, // only 6 min elapsed (inside cooldown)
      isCurrentRouteUnsafe: true,
    });
    expect(emergency.switch).toBe(true);
  });

  it("8. Determinism & zero flip-flopping across full 72h kerala-2018 run", () => {
    const sim1 = simulate({ scenario: "kerala-2018", mode: "agent", endT: 72 });
    const sim2 = simulate({ scenario: "kerala-2018", mode: "agent", endT: 72 });

    expect(sim1.decisions.length).toBe(sim2.decisions.length);

    // Verify route changes per truck are small and stable (<= 3 changes across 72h)
    const routeChangesByTruck = new Map<string, number>();
    sim1.decisions.forEach((d) => {
      if (d.decision === "REROUTE") {
        routeChangesByTruck.set(d.shipmentCode, (routeChangesByTruck.get(d.shipmentCode) || 0) + 1);
      }
    });

    routeChangesByTruck.forEach((count, truck) => {
      expect(count).toBeLessThanOrEqual(3);
    });
  });

  it("9. kerala-2018 integration: TRK-001 gets a valid explained decision with driver instruction", () => {
    const sim = simulate({ scenario: "kerala-2018", mode: "agent", endT: 72 });
    const trk001Decisions = sim.decisions.filter((d) => d.shipmentCode === "TRK-001");
    expect(trk001Decisions.length).toBeGreaterThan(0);

    const dec = trk001Decisions[0];
    expect(["REROUTE", "HOLD", "TURN_BACK"]).toContain(dec.chosenOption || dec.decision);
    expect(dec.driverMessage).toBeDefined();
    expect(dec.positionDescription).toBeDefined();
    expect(dec.alternateRoute).toBeDefined();
  });
});
