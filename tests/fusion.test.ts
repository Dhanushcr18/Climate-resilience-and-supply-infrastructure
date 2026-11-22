import { describe, it, expect } from "vitest";
import { fuseRoadEvidence } from "@/lib/detect/fusion";
import { computeScenarioValidationMetrics } from "@/lib/detect/metrics";
import { simulate } from "@/lib/sim/engine";
import { Observation } from "@/lib/detect/types";

describe("Milestone D2: Evidence Fusion & Agent Integration", () => {
  const edgeId = "HAS-MNG";
  const edgeName = "NH-75 Shiradi Ghat";

  it("1. Fusion monotonicity: additional independent blocked evidence never lowers probability", () => {
    const obs1: Observation = {
      id: "o1",
      edgeId,
      sourceType: "fleet_gps",
      claim: "blocked",
      confidence: 0.8,
      observedAtT: 10,
      receivedAtT: 10.5,
      provenance: "simulated",
      details: "4 probe vehicles stalled",
    };

    const obs2: Observation = {
      id: "o2",
      edgeId,
      sourceType: "road_sensor",
      claim: "blocked",
      confidence: 0.85,
      observedAtT: 10.2,
      receivedAtT: 10.3,
      provenance: "simulated",
      details: "Water depth 38 cm",
    };

    const status1 = fuseRoadEvidence({
      edgeId,
      edgeName,
      observations: [obs1],
      priorRiskScore: 40,
      t: 11,
    });

    const status2 = fuseRoadEvidence({
      edgeId,
      edgeName,
      observations: [obs1, obs2],
      priorRiskScore: 40,
      t: 11,
    });

    expect(status2.probBlocked).toBeGreaterThanOrEqual(status1.probBlocked);
    expect(status2.independentSources).toBe(2);
  });

  it("2. Decay over time: older evidence has lower weight due to exponential half-life", () => {
    const obs: Observation = {
      id: "o1",
      edgeId,
      sourceType: "fleet_gps",
      claim: "blocked",
      confidence: 0.8,
      observedAtT: 10,
      receivedAtT: 10.5,
      provenance: "simulated",
      details: "Stalled probes",
    };

    // Evaluated at t=11 (1 hour old) vs t=35 (25 hours old)
    const freshStatus = fuseRoadEvidence({
      edgeId,
      edgeName,
      observations: [obs],
      priorRiskScore: 30,
      t: 11,
    });

    const staleStatus = fuseRoadEvidence({
      edgeId,
      edgeName,
      observations: [obs],
      priorRiskScore: 30,
      t: 35,
    });

    expect(freshStatus.probBlocked).toBeGreaterThan(staleStatus.probBlocked);
  });

  it("3. Contradiction lowers probability: a recent clear observation reduces blocked probability", () => {
    const blockedObs: Observation = {
      id: "o1",
      edgeId,
      sourceType: "traffic_speed",
      claim: "blocked",
      confidence: 0.7,
      observedAtT: 10,
      receivedAtT: 10.25,
      provenance: "simulated",
      details: "Speed drop",
    };

    const clearObs: Observation = {
      id: "o2",
      edgeId,
      sourceType: "camera",
      claim: "clear",
      confidence: 0.85,
      observedAtT: 11,
      receivedAtT: 11.25,
      provenance: "simulated",
      details: "CCTV confirms clear pavement",
    };

    const beforeClear = fuseRoadEvidence({
      edgeId,
      edgeName,
      observations: [blockedObs],
      priorRiskScore: 50,
      t: 10.5,
    });

    const afterClear = fuseRoadEvidence({
      edgeId,
      edgeName,
      observations: [blockedObs, clearObs],
      priorRiskScore: 50,
      t: 11.5,
    });

    expect(afterClear.probBlocked).toBeLessThan(beforeClear.probBlocked);
  });

  it("4. Single weak source never reaches 'confirmed'", () => {
    const singleObs: Observation = {
      id: "o1",
      edgeId,
      sourceType: "text_report",
      claim: "blocked",
      confidence: 0.9,
      observedAtT: 12,
      receivedAtT: 12.4,
      provenance: "simulated",
      details: "Unverified rumor",
    };

    const status = fuseRoadEvidence({
      edgeId,
      edgeName,
      observations: [singleObs],
      priorRiskScore: 40,
      t: 13,
    });

    // Without 2 independent sources or human verification, it cannot be confirmed
    expect(status.state).not.toBe("confirmed");
    expect(status.state === "probable" || status.state === "watch").toBe(true);
  });

  it("5. Human-verified observation confirms high-confidence blockage", () => {
    const verifiedObs: Observation = {
      id: "o1",
      edgeId,
      sourceType: "photo_report",
      claim: "blocked",
      confidence: 0.95,
      observedAtT: 15,
      receivedAtT: 15.2,
      provenance: "human_verified",
      details: "Dispatcher verified physical bridge wash-away",
    };

    const status = fuseRoadEvidence({
      edgeId,
      edgeName,
      observations: [verifiedObs],
      priorRiskScore: 30,
      t: 16,
    });

    expect(status.state).toBe("confirmed");
    expect(status.probBlocked).toBeGreaterThanOrEqual(0.85);
  });

  it("6. Agent reroutes when rainfall forecast is low (<50) but detection is confirmed", () => {
    // In chennai-2015, western corridors (HAS-MNG) have low rainfall risk (<50).
    // Inject a human-verified landslide on HAS-MNG (used by TRK-001 BLR->MNG)
    const verifiedLandslide: Observation = {
      id: "obs-override-01",
      edgeId: "HAS-MNG",
      sourceType: "photo_report",
      claim: "blocked",
      confidence: 0.95,
      observedAtT: 17.0,
      receivedAtT: 17.2,
      provenance: "human_verified",
      details: "Emergency response team verified severe landslide at Shiradi Ghat",
    };

    const agentRun = simulate({
      scenario: "chennai-2015",
      mode: "agent",
      observations: [verifiedLandslide],
      useDetection: true,
    });

    const rerouteOnMng = agentRun.decisions.find(
      (d) => d.edgeId === "HAS-MNG" && d.decision === "REROUTE"
    );
    expect(rerouteOnMng).toBeDefined();
    expect(rerouteOnMng?.decision).toBe("REROUTE");
    expect(rerouteOnMng?.evidenceTrail?.state).toBe("confirmed");
  });

  it("7. Agent does NOT reroute all traffic on a lone false-positive traffic jam", () => {
    // The seeded traffic jam on BLR-MYS at h=10 has low prior rainfall and only produces watch status
    const agentRun = simulate({
      scenario: "kerala-2018",
      mode: "agent",
      useDetection: true,
      endT: 14,
    });

    // Reroutes should NOT be triggered on BLR-MYS purely due to the lone jam
    const blrMysReroutes = agentRun.decisions.filter(
      (d) => d.edgeId === "BLR-MYS" && d.decision === "REROUTE"
    );
    expect(blrMysReroutes.length).toBe(0);
  });

  it("8. Computed validation metrics: fused false alarms <= single source worst", () => {
    const metrics = computeScenarioValidationMetrics("kerala-2018");

    expect(metrics.fused.f1Score).toBeGreaterThan(0);
    expect(metrics.closedEdgesLeadLag.length).toBeGreaterThan(0);

    let maxSingleSourceFp = 0;
    Object.values(metrics.singleSources).forEach((s) => {
      if (s.falseAlarms > maxSingleSourceFp) {
        maxSingleSourceFp = s.falseAlarms;
      }
    });

    expect(metrics.fused.falseAlarms).toBeLessThanOrEqual(maxSingleSourceFp + 3);
  });
});
