/**
 * IoT Culvert Water Depth & Inclinometer Sensor Simulator
 */
import { NetworkEdge } from "@/lib/sim/network";
import { ScenarioId } from "@/lib/sim/scenarios";
import { DEFAULT_SOURCE_CONFIGS } from "../config";
import { seededRandom } from "../prng";
import { getGroundTruth } from "../truth";
import { Observation } from "../types";

export interface SensorTelemetryReading {
  edgeId: string;
  sensorType: "water_depth" | "inclinometer" | "piezometer";
  value: number;
  unit: string;
  zScore: number;
  isAnomaly: boolean;
  isOnline: boolean;
  t: number;
}

export function simulateRoadSensorObservations(
  scenario: ScenarioId,
  edges: NetworkEdge[],
  currentT: number
): { observations: Observation[]; sensorReadings: SensorTelemetryReading[] } {
  const observations: Observation[] = [];
  const sensorReadings: SensorTelemetryReading[] = [];
  const config = DEFAULT_SOURCE_CONFIGS.road_sensor;
  const latency = config.latencyHours; // 0.1h (6 min)
  const maxHour = Math.floor(currentT);

  for (let h = 1; h <= maxHour; h++) {
    const receivedAtT = h + latency;
    if (receivedAtT > currentT) continue;

    for (const edge of edges) {
      // Only vulnerable terrain types have roadside IoT arrays
      if (edge.terrain === "plain") continue;

      // Seeded sensor dropout check (6% packet loss chance)
      const dropoutRoll = seededRandom(`sensor-dropout-${scenario}-${edge.id}-${h}`);
      if (dropoutRoll < 0.06) {
        sensorReadings.push({
          edgeId: edge.id,
          sensorType: edge.terrain === "ghat" ? "inclinometer" : "water_depth",
          value: 0,
          unit: edge.terrain === "ghat" ? "mm/h" : "cm",
          zScore: 0,
          isAnomaly: false,
          isOnline: false,
          t: h,
        });
        continue; // Sensor offline / dropped out
      }

      const truth = getGroundTruth(scenario, edge, h);
      const isGhat = edge.terrain === "ghat";

      if (isGhat) {
        // Slope inclinometer & pore pressure
        // Normal baseline: 0.5 - 2.0 mm/h. Anomaly threshold: > 15 mm/h
        const rainFactor = Math.min(3.0, truth.rainPast24hMm / 40);
        let slopeMotionMmPerH = 1.0 + rainFactor * 2.5;

        if (truth.isTrulyClosed) {
          // Slope failure event
          slopeMotionMmPerH = 18.5 + seededRandom(`slope-${edge.id}-${h}`) * 12.0;
        }

        const zScore = Math.max(0, (slopeMotionMmPerH - 1.5) / 1.8);
        const isAnomaly = slopeMotionMmPerH > 15.0 && zScore > 3.0;

        sensorReadings.push({
          edgeId: edge.id,
          sensorType: "inclinometer",
          value: Math.round(slopeMotionMmPerH * 10) / 10,
          unit: "mm/h",
          zScore: Math.round(zScore * 10) / 10,
          isAnomaly,
          isOnline: true,
          t: h,
        });

        if (isAnomaly) {
          observations.push({
            id: `obs-sensor-slope-${scenario}-${edge.id}-h${h}`,
            edgeId: edge.id,
            sourceType: "road_sensor",
            claim: "blocked",
            confidence: 0.85,
            observedAtT: h,
            receivedAtT,
            provenance: config.provenance,
            details: `Borehole inclinometer detected critical slope displacement of ${Math.round(
              slopeMotionMmPerH
            )} mm/h (z=${zScore.toFixed(1)}) on ${edge.name}`,
            evidence: {
              sensorType: "inclinometer",
              slopeVelocityMmPerHour: Math.round(slopeMotionMmPerH * 10) / 10,
              zScore: Math.round(zScore * 10) / 10,
              porePressureKPa: Math.round(45 + rainFactor * 30),
            },
          });
        }
      } else {
        // Lowland or coastal: Ultrasonic culvert water level gauge
        // Normal baseline: 2 - 8 cm. Anomaly threshold: > 30 cm
        const rainFactor = Math.min(4.0, truth.rainPast24hMm / 35);
        let waterDepthCm = 4.0 + rainFactor * 5.0;

        if (truth.isTrulyClosed) {
          waterDepthCm = 34.0 + seededRandom(`culvert-${edge.id}-${h}`) * 25.0;
        }

        const zScore = Math.max(0, (waterDepthCm - 5.0) / 4.0);
        const isBlocked = waterDepthCm > 30.0 && zScore > 3.0;
        const isDegraded = !isBlocked && waterDepthCm > 15.0;

        sensorReadings.push({
          edgeId: edge.id,
          sensorType: "water_depth",
          value: Math.round(waterDepthCm),
          unit: "cm",
          zScore: Math.round(zScore * 10) / 10,
          isAnomaly: isBlocked || isDegraded,
          isOnline: true,
          t: h,
        });

        if (isBlocked) {
          observations.push({
            id: `obs-sensor-water-${scenario}-${edge.id}-h${h}`,
            edgeId: edge.id,
            sourceType: "road_sensor",
            claim: "blocked",
            confidence: 0.9,
            observedAtT: h,
            receivedAtT,
            provenance: config.provenance,
            details: `Ultrasonic culvert sensor reports ${Math.round(
              waterDepthCm
            )} cm overtopping water depth (z=${zScore.toFixed(1)}) on ${edge.name}`,
            evidence: {
              sensorType: "water_depth",
              waterDepthCm: Math.round(waterDepthCm),
              zScore: Math.round(zScore * 10) / 10,
            },
          });
        } else if (isDegraded) {
          observations.push({
            id: `obs-sensor-water-${scenario}-${edge.id}-h${h}`,
            edgeId: edge.id,
            sourceType: "road_sensor",
            claim: "degraded",
            confidence: 0.6,
            observedAtT: h,
            receivedAtT,
            provenance: config.provenance,
            details: `Culvert water level elevated to ${Math.round(
              waterDepthCm
            )} cm approaching roadway threshold on ${edge.name}`,
            evidence: {
              sensorType: "water_depth",
              waterDepthCm: Math.round(waterDepthCm),
            },
          });
        }
      }
    }
  }

  return { observations, sensorReadings };
}
