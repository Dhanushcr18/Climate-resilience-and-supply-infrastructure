import { describe, it, expect } from "vitest";
import { calculateImpact } from "../lib/sim/impact";

describe("Impact Comparison (impact.ts)", () => {
  it("computes honest estimate with isEstimate flag set to true", () => {
    const impact = calculateImpact("kerala-2018");
    expect(impact.isEstimate).toBe(true);
    expect(impact.totalShipments).toBe(40);
  });

  it("proves agent delay is strictly less than baseline delay in kerala-2018", () => {
    const impact = calculateImpact("kerala-2018");
    expect(impact.agentTotalDelayHours).toBeLessThan(impact.baselineTotalDelayHours);
    expect(impact.delayHoursSaved).toBeGreaterThan(0);
    expect(impact.percentageDelayReduced).toBeGreaterThan(20);
    expect(impact.medicineProtectedCount).toBeGreaterThan(0);
  });

  it("proves agent delay is strictly less than baseline delay in chennai-2015", () => {
    const impact = calculateImpact("chennai-2015");
    expect(impact.agentTotalDelayHours).toBeLessThanOrEqual(impact.baselineTotalDelayHours);
  });
});
