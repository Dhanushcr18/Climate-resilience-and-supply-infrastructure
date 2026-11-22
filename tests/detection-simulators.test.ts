import { describe, it, expect } from "vitest";
import { EDGES } from "@/lib/sim/network";
import { getAllSimulatedObservations } from "@/lib/detect";
import { simulateSatelliteObservations } from "@/lib/detect/simulators/satellite";
import { simulateFleetGpsObservations } from "@/lib/detect/simulators/fleetGps";
import { simulateRoadSensorObservations } from "@/lib/detect/simulators/roadSensor";

describe("Milestone D1: Detection Core & Simulators", () => {
  const scenario = "kerala-2018";

  it("1. Determinism: identical inputs produce identical observations", () => {
    const run1 = getAllSimulatedObservations(scenario, EDGES, 24);
    const run2 = getAllSimulatedObservations(scenario, EDGES, 24);

    expect(run1.observations.length).toBeGreaterThan(0);
    expect(run1.observations.length).toBe(run2.observations.length);

    for (let i = 0; i < run1.observations.length; i++) {
      expect(run1.observations[i].id).toBe(run2.observations[i].id);
      expect(run1.observations[i].confidence).toBe(run2.observations[i].confidence);
      expect(run1.observations[i].claim).toBe(run2.observations[i].claim);
    }
  });

  it("2. Latency respected: NO observation is available before receivedAtT", () => {
    const tValues = [6, 12, 18, 24, 30, 48];
    for (const t of tValues) {
      const { observations } = getAllSimulatedObservations(scenario, EDGES, t);
      for (const obs of observations) {
        expect(obs.receivedAtT).toBeLessThanOrEqual(t);
        expect(obs.receivedAtT).toBeGreaterThanOrEqual(obs.observedAtT);
      }
    }
  });

  it("3. Satellite cloud misses: seeded pass cloud obscuration occurs", () => {
    // Check passes 12 to 72; at least one pass has cloudRoll < 0.25 and produces no observations for that pass
    const satResult = simulateSatelliteObservations(scenario, EDGES, 72);
    expect(satResult.observations.length).toBeGreaterThan(0);

    const passesCovered = new Set(
      satResult.observations.map((o) => (o.evidence?.passT as number) || 0)
    );
    // 6 possible passes: 12, 24, 36, 48, 60, 72. With 25% chance, at least 1 should be obscured
    const totalPossiblePasses = [12, 24, 36, 48, 60, 72];
    const missedPasses = totalPossiblePasses.filter((p) => !passesCovered.has(p));
    expect(missedPasses.length).toBeGreaterThan(0);
  });

  it("4. GPS anomaly: requires >= 3 probes below 15% speed for >= 20 min to claim blocked", () => {
    const { observations, probeClusters } = simulateFleetGpsObservations(scenario, EDGES, 30);
    const blockedGpsObs = observations.filter((o) => o.claim === "blocked");

    expect(blockedGpsObs.length).toBeGreaterThan(0);
    for (const obs of blockedGpsObs) {
      const stalledProbes = obs.evidence?.stalledProbes as number;
      const speedRatio = obs.evidence?.speedRatio as number;
      const durationMinutes = obs.evidence?.durationMinutes as number;

      expect(stalledProbes).toBeGreaterThanOrEqual(3);
      expect(speedRatio).toBeLessThan(0.15);
      expect(durationMinutes).toBeGreaterThanOrEqual(20);
    }
  });

  it("5. False-positive traffic jam is generated on an unclosed road", () => {
    const { probeClusters } = simulateFleetGpsObservations(scenario, EDGES, 15);
    const falsePositive = probeClusters.find(
      (c) => c.isFalsePositive && c.edgeId === "BLR-MYS"
    );

    expect(falsePositive).toBeDefined();
    expect(falsePositive?.stalledProbeCount).toBeGreaterThanOrEqual(3);
  });

  it("6. IoT Sensors drop out with seeded packet loss", () => {
    const { sensorReadings } = simulateRoadSensorObservations(scenario, EDGES, 48);
    const dropouts = sensorReadings.filter((r) => !r.isOnline);

    expect(dropouts.length).toBeGreaterThan(0);
  });

  it("7. Observations never use future truth", () => {
    const { observations } = getAllSimulatedObservations(scenario, EDGES, 20);
    for (const obs of observations) {
      expect(obs.observedAtT).toBeLessThanOrEqual(20);
    }
  });
});
