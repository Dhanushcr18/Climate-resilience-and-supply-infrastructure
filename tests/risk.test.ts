import { describe, it, expect } from "vitest";
import { calculateRiskScore, RISK_CONFIG } from "../lib/sim/risk";
import { EDGES } from "../lib/sim/network";
import { getRainHistory, getRainForecast } from "../lib/sim/scenarios";

describe("Risk Model (risk.ts)", () => {
  const plainEdge = EDGES.find((e) => e.terrain === "plain")!;
  const ghatEdge = EDGES.find((e) => e.terrain === "ghat" && e.vulnerability >= 0.85)!;

  it("returns low risk for zero rainfall", () => {
    const assessment = calculateRiskScore(plainEdge, [0, 0, 0], [0, 0, 0]);
    expect(assessment.score).toBeLessThan(RISK_CONFIG.LEVEL_MODERATE_THRESHOLD);
    expect(assessment.level).toBe("low");
    expect(assessment.isClosed).toBe(false);
  });

  it("handles missing or empty arrays gracefully", () => {
    const assessment = calculateRiskScore(plainEdge, [], []);
    expect(assessment.score).toBeDefined();
    expect(assessment.level).toBe("low");
    expect(assessment.rain48hMm).toBe(0);
  });

  it("respects accumulation boundary at 20mm and 200mm", () => {
    // 20mm total -> accumulation component should be 0
    const at20 = calculateRiskScore(plainEdge, [10], [10]);
    expect(at20.components.accumulation).toBe(0);

    // 200mm total over 48h -> accumulation component hits max 45
    // 24h past of 100mm, 24h forecast of 100mm -> peak intensity low
    const past = Array(24).fill(100 / 24);
    const forecast = Array(24).fill(100 / 24);
    const at200 = calculateRiskScore(plainEdge, past, forecast);
    expect(at200.components.accumulation).toBe(RISK_CONFIG.ACCUM_MAX_SCORE);
  });

  it("respects intensity boundary values (5 mm/h and 40 mm/h)", () => {
    // Below 5 mm/h -> intensity = 0
    const under5 = calculateRiskScore(plainEdge, [4, 4], [4, 4]);
    expect(under5.components.intensity).toBe(0);

    // 40 mm/h -> intensity component hits max 20
    const at40 = calculateRiskScore(plainEdge, [40], [0]);
    expect(at40.components.intensity).toBe(RISK_CONFIG.INTENSITY_MAX_SCORE);
  });

  it("amplifies risk for vulnerable ghat edges during heavy rain and closes road at >=85", () => {
    // Extreme rain: 250 mm total, peak 45 mm/h
    const heavyPast = Array(24).fill(120 / 24);
    const heavyForecast = Array(24).fill(130 / 24);
    // Insert peak
    heavyPast[12] = 45;

    const ghatAssessment = calculateRiskScore(ghatEdge, heavyPast, heavyForecast);
    expect(ghatAssessment.score).toBeGreaterThanOrEqual(85);
    expect(ghatAssessment.isClosed).toBe(true);
    expect(ghatAssessment.level).toBe("severe");
    expect(ghatAssessment.reason).toContain("steep ghat terrain");
  });

  it("inspects edge assessments at t=18 in kerala-2018", () => {
    const southEdges = EDGES.filter((e) => e.region === "south");
    const results = southEdges.map((e) => {
      const history = getRainHistory("kerala-2018", e.id, 18);
      const forecast = getRainForecast("kerala-2018", e.id, 18, 24);
      const assessment = calculateRiskScore(e, history, forecast);
      return {
        id: e.id,
        name: e.name,
        terrain: e.terrain,
        score: assessment.score,
        level: assessment.level,
        isClosed: assessment.isClosed,
      };
    });
    console.log("=== ASSESSMENTS AT t=18 in kerala-2018 ===");
    console.table(results);
  });

  it("generates transparent reason string with numbers", () => {
    const assessment = calculateRiskScore(ghatEdge, [10, 20], [30, 40]);
    expect(assessment.reason).toMatch(/\d+ mm over 48h/);
    expect(assessment.reason).toMatch(/peak \d+ mm\/h/);
    expect(assessment.reason).toContain("vulnerability");
  });
});
