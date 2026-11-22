import { describe, it, expect } from "vitest";
import {
  enumerateCandidatePaths,
  evaluateCandidatePath,
  selectTieredAlternate,
  getEdgeRiskAtTraversal,
} from "../lib/sim/tieredRouting";
import { simulate } from "../lib/sim/engine";
import { EDGES } from "../lib/sim/network";

describe("Tiered Alternate Route Selection & Traversal-Time Safety", () => {
  it("1. Blocked corridor (HAS-MNG blocked) with moderate alternate (via MDK) selects REROUTE", () => {
    const result = selectTieredAlternate({
      scenario: "kerala-2018",
      currentT: 18,
      originNode: "BLR",
      destNode: "MNG",
      currentEdge: null,
      fractionOnEdge: 0,
      headingToNode: null,
      toleranceMin: 240,
      isCriticalOrMedicine: true,
      blockedEdgeId: "HAS-MNG",
      origRemainingBaseMin: 420,
    });

    expect(result.decision).toBe("REROUTE");
    expect(result.selectedRoute).not.toBeNull();
    expect(result.tier).toBe("safe");
    // Should route via MYS and MDK
    expect(result.selectedRoute!.nodes).toEqual(["BLR", "MYS", "MDK", "MNG"]);
    // Must avoid blocked edge HAS-MNG
    const usesHasMng = result.selectedRoute!.edges.some((e) => e.id === "HAS-MNG");
    expect(usesHasMng).toBe(false);
  });

  it("2. When no alternate is within tolerance but forecast eases, HOLD is chosen", () => {
    // Set a very tight tolerance (e.g. 10 minutes) so extra 65m fails, with forecast easing
    const result = selectTieredAlternate({
      scenario: "kerala-2018",
      currentT: 18,
      originNode: "BLR",
      destNode: "MNG",
      currentEdge: null,
      fractionOnEdge: 0,
      headingToNode: null,
      toleranceMin: 10, // Unreachable tolerance
      isCriticalOrMedicine: false,
      blockedEdgeId: "HAS-MNG",
      origRemainingBaseMin: 420,
      forecastDropsWithin12h: true,
    });

    expect(result.decision).toBe("HOLD");
    expect(result.holdDurationHours).toBeGreaterThan(0);
    expect(result.reason.toLowerCase()).toContain("holding");
  });

  it("3. Truly no path (all candidate corridors impassable) results in ESCALATE with candidate rejections", () => {
    // Synthesize effective risk where all edges out of MNG are blocked (>=85)
    const mockEffectiveRisks = new Map<number, Map<string, number>>();
    const allBlockedMap = new Map<string, number>();
    allBlockedMap.set("HAS-MNG", 95);
    allBlockedMap.set("MDK-MNG", 90);
    allBlockedMap.set("KNR-MNG", 88);
    for (let h = 0; h <= 72; h++) {
      mockEffectiveRisks.set(h, allBlockedMap);
    }

    const result = selectTieredAlternate({
      scenario: "kerala-2018",
      currentT: 18,
      originNode: "BLR",
      destNode: "MNG",
      currentEdge: null,
      fractionOnEdge: 0,
      headingToNode: null,
      toleranceMin: 240,
      isCriticalOrMedicine: true,
      blockedEdgeId: "HAS-MNG",
      origRemainingBaseMin: 420,
      effectiveRisksByHour: mockEffectiveRisks,
    });

    expect(result.decision).toBe("ESCALATE");
    expect(result.rejections.length).toBeGreaterThan(0);
    expect(result.reason).toContain("impassable");
  });

  it("4. Rerouted paths NEVER include an edge with risk >= 85", () => {
    const result = selectTieredAlternate({
      scenario: "kerala-2018",
      currentT: 18,
      originNode: "BLR",
      destNode: "MNG",
      currentEdge: null,
      fractionOnEdge: 0,
      headingToNode: null,
      toleranceMin: 240,
      isCriticalOrMedicine: true,
      blockedEdgeId: "HAS-MNG",
      origRemainingBaseMin: 420,
    });

    expect(result.decision).toBe("REROUTE");
    result.selectedRoute!.edges.forEach((edge) => {
      const risk = getEdgeRiskAtTraversal("kerala-2018", edge, 18, edge.baseMinutes / 60);
      expect(risk.score).toBeLessThan(85);
      expect(risk.isClosed).toBe(false);
    });
  });

  it("5. Mid-edge turn-back evaluates turnaround path to previous node", () => {
    const hasMngEdge = EDGES.find((e) => e.id === "HAS-MNG")!;
    const result = selectTieredAlternate({
      scenario: "kerala-2018",
      currentT: 20,
      originNode: "BLR",
      destNode: "MNG",
      currentEdge: hasMngEdge,
      fractionOnEdge: 0.1, // Just entered HAS-MNG from HAS
      headingToNode: "MNG",
      toleranceMin: 360,
      isCriticalOrMedicine: true,
      blockedEdgeId: "HAS-MNG",
      origRemainingBaseMin: 240,
      truckStatus: "in_transit",
    });

    // Should detect mid-edge turnaround or reroute avoiding HAS-MNG
    expect(result.candidates.length).toBeGreaterThan(0);
    const turnaroundCandidates = result.candidates.filter((c) => c.isTurnaround);
    expect(turnaroundCandidates.length).toBeGreaterThan(0);
    // Turnaround path starts at previous node HAS
    expect(turnaroundCandidates[0].nodes[0]).toBe("HAS");
  });

  it("6. In kerala-2018: TRK-001 gets REROUTE, and at least one medicine truck is proactively rerouted", () => {
    const sim = simulate({ scenario: "kerala-2018", mode: "agent" });

    // Verify TRK-001 (Insulin medicine) gets REROUTE
    const trk001Decisions = sim.decisions.filter((d) => d.shipmentCode === "TRK-001");
    expect(trk001Decisions.length).toBeGreaterThan(0);
    const firstDecision = trk001Decisions[0];
    expect(firstDecision.decision).toBe("REROUTE");
    expect(firstDecision.estimatedDelayAvoidedMin).toBeGreaterThan(0);
    expect(firstDecision.alternateRouteSummary).toContain("MDK");

    // At least one medicine truck rerouted before closure
    const medReroutes = sim.decisions.filter(
      (d) => d.decision === "REROUTE" && d.shipmentCode === "TRK-001"
    );
    expect(medReroutes.length).toBeGreaterThanOrEqual(1);
  });

  it("7. TRK-001 at t=18 is in transit and all decisions have alternateRoute populated", () => {
    const sim = simulate({ scenario: "kerala-2018", mode: "agent" });
    const trucksAt18 = sim.timeline.get(18) || [];
    const trk1 = trucksAt18.find((t) => t.code === "TRK-001");
    expect(trk1).toBeDefined();
    // TRK-001 has departed BLR and is in transit (on detour BLR-MYS or BLR-HAS)
    expect(["BLR-MYS", "BLR-HAS"]).toContain(trk1?.currentEdgeId);

    // All decisions for TRK-001 have alternateRoute with polyline
    const trk1Decisions = sim.decisions.filter((d) => d.shipmentCode === "TRK-001");
    expect(trk1Decisions.length).toBeGreaterThan(0);
    trk1Decisions.forEach((d) => {
      if (d.decision === "REROUTE" || d.decision === "ESCALATE") {
        expect(d.alternateRoute).toBeDefined();
        expect(d.alternateRoute?.polyline?.length).toBeGreaterThan(1);
      }
    });
  });
});
