import { describe, it, expect } from "vitest";
import { z } from "zod";
import { extractReportDeterministic } from "@/lib/detect/extract";
import { simulate } from "@/lib/sim/engine";
import { Observation } from "@/lib/detect/types";

// Schema test matching vision classify route
const VisionClassificationSchema = z.object({
  label: z.enum(["blocked", "degraded", "clear"]),
  confidence: z.number().min(0).max(1),
  waterDepthEstimateCm: z.number().nullable().optional(),
  passableForTruck: z.boolean(),
  reason: z.string().max(500),
  source: z.enum(["live_vision", "live_nvidia", "offline_fallback", "demo_manifest"]),
});

describe("Milestone D4: Computer Vision & Incident Reporting", () => {
  it("1. Vision classification schema validates correctly", () => {
    const valid = {
      label: "blocked",
      confidence: 0.94,
      waterDepthEstimateCm: 55,
      passableForTruck: false,
      reason: "Deep water across highway lanes",
      source: "offline_fallback",
    };

    const parsed = VisionClassificationSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("2. Vision classification schema rejects invalid confidence or labels", () => {
    const invalidConfidence = {
      label: "blocked",
      confidence: 1.5, // > 1.0 invalid
      waterDepthEstimateCm: 55,
      passableForTruck: false,
      reason: "Invalid confidence",
      source: "offline_fallback",
    };

    const parsed = VisionClassificationSchema.safeParse(invalidConfidence);
    expect(parsed.success).toBe(false);
  });

  it("3. User-injected photo observation triggers autonomous agent reroute", () => {
    // In Kerala 2018 at t=0, rain forecast is 0/100, trucks would normally take default paths
    const userPhotoObs: Observation = {
      id: "test-user-photo-1",
      edgeId: "HAS-MNG",
      sourceType: "photo_report",
      claim: "blocked",
      confidence: 0.95,
      observedAtT: 0,
      receivedAtT: 0,
      provenance: "human_verified",
      details: "Field verified photo shows 60cm standing water on Shiradi Ghat",
    };

    const sim = simulate({
      scenario: "kerala-2018",
      mode: "agent",
      useDetection: true,
      observations: [userPhotoObs],
    });

    // Check road status for HAS-MNG at hour 0
    const statusAt0 = sim.roadStatusByHour?.get(0)?.get("HAS-MNG");
    expect(statusAt0).toBeDefined();
    expect(statusAt0?.probBlocked).toBeGreaterThanOrEqual(0.85);
    expect(statusAt0?.state).toBe("confirmed");

    // Check decisions: shipments headed through HAS-MNG must be rerouted or held
    const shiradiDecisions = sim.decisions.filter((d) => d.edgeId === "HAS-MNG");
    expect(shiradiDecisions.length).toBeGreaterThan(0);
    expect(shiradiDecisions[0].evidenceTrail?.state).toBe("confirmed");
  });

  it("4. Road resolution clearance observation reopens corridor to clear", () => {
    // Inject a clearance observation with claim: "clear", provenance: "human_verified", confidence: 0.99
    const clearObs: Observation = {
      id: "test-reopen-1",
      edgeId: "HAS-MNG",
      sourceType: "official_alert",
      claim: "clear",
      confidence: 0.99,
      observedAtT: 17.0,
      receivedAtT: 17.0,
      provenance: "human_verified",
      details: "Dispatcher Clearance: Road inspection verified clear and passable. Resumed standard corridor routing.",
    };

    const sim = simulate({
      scenario: "chennai-2015",
      mode: "agent",
      useDetection: true,
      observations: [clearObs],
    });

    const statusAt17 = sim.roadStatusByHour?.get(17)?.get("HAS-MNG");
    expect(statusAt17).toBeDefined();
    expect(statusAt17?.state).toBe("clear");
    expect(statusAt17?.probBlocked).toBeLessThan(0.35);
    expect(sim.effectiveRisksByHour?.get(17)?.get("HAS-MNG")).toBe(0);

    // Convoys are not rerouted away from HAS-MNG
    const rerouteOnMng = sim.decisions.find(
      (d) => d.edgeId === "HAS-MNG" && d.decision === "REROUTE"
    );
    expect(rerouteOnMng).toBeUndefined();
  });
});
