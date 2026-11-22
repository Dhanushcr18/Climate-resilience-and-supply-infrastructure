import { describe, it, expect } from "vitest";
import { simulate } from "../lib/sim/engine";

describe("Simulation Engine (engine.ts)", () => {
  it("guarantees determinism: identical inputs produce identical outputs", () => {
    const run1 = simulate({ scenario: "kerala-2018", mode: "agent" });
    const run2 = simulate({ scenario: "kerala-2018", mode: "agent" });

    expect(run1.decisions.length).toEqual(run2.decisions.length);
    if (run1.decisions.length > 0) {
      expect(run1.decisions[0].id).toEqual(run2.decisions[0].id);
      expect(run1.decisions[0].riskScore).toEqual(run2.decisions[0].riskScore);
      expect(run1.decisions[0].explanation).toEqual(run2.decisions[0].explanation);
    }
  });

  it("causes baseline trucks to get delayed/blocked on closed corridors", () => {
    const baselineRun = simulate({ scenario: "kerala-2018", mode: "baseline" });
    const blockedTrucks = Array.from(baselineRun.shipmentDelays.entries()).filter(
      ([_, delay]) => delay > 0
    );

    // In severe kerala-2018 flood, multiple baseline trucks should experience blockage
    expect(blockedTrucks.length).toBeGreaterThan(0);
  });

  it("agent reroutes critical trucks before road closure and avoids catastrophic delays", () => {
    const agentRun = simulate({ scenario: "kerala-2018", mode: "agent" });
    const baselineRun = simulate({ scenario: "kerala-2018", mode: "baseline" });

    // Agent must generate decisions (REROUTE / HOLD / ESCALATE)
    expect(agentRun.decisions.length).toBeGreaterThan(0);

    const reroutes = agentRun.decisions.filter((d) => d.decision === "REROUTE");
    expect(reroutes.length).toBeGreaterThan(0);

    // Verify at least one critical medicine shipment was rerouted
    const medicineReroute = reroutes.find((d) =>
      d.shipmentCode === "TRK-001" || d.shipmentCode === "TRK-003" || d.shipmentCode === "TRK-007"
    );
    expect(medicineReroute).toBeDefined();

    // Sum total delay in baseline vs agent
    let baselineTotalDelay = 0;
    baselineRun.shipmentDelays.forEach((delay) => {
      baselineTotalDelay += delay;
    });

    let agentTotalDelay = 0;
    agentRun.shipmentDelays.forEach((delay) => {
      agentTotalDelay += delay;
    });

    // Agent total delay must be less than baseline total delay
    expect(agentTotalDelay).toBeLessThan(baselineTotalDelay);
  });

  it("records transparent decision attributes including explanation and driver messages", () => {
    const agentRun = simulate({ scenario: "kerala-2018", mode: "agent" });
    const firstDecision = agentRun.decisions[0];

    expect(firstDecision.explanation).toBeDefined();
    expect(firstDecision.explanation.length).toBeGreaterThan(15);
    expect(firstDecision.driverMessage).toBeDefined();
    expect(firstDecision.riskScore).toBeGreaterThanOrEqual(50);
  });
});
