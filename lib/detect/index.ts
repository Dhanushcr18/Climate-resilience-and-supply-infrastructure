/**
 * Detection Core Index
 * Aggregates all deterministic multi-source incident simulators.
 */
import { NetworkEdge } from "@/lib/sim/network";
import { ScenarioId } from "@/lib/sim/scenarios";
import { DEFAULT_SOURCE_CONFIGS } from "./config";
import { simulateCameraObservations } from "./simulators/camera";
import { simulateCommunityReports } from "./simulators/communityReports";
import { ProbeCluster, simulateFleetGpsObservations } from "./simulators/fleetGps";
import { simulateOfficialAlertObservations } from "./simulators/officialAlert";
import { simulateRainModelObservations } from "./simulators/rainModel";
import { SensorTelemetryReading, simulateRoadSensorObservations } from "./simulators/roadSensor";
import { simulateSatelliteObservations } from "./simulators/satellite";
import { simulateTrafficSpeedObservations } from "./simulators/trafficSpeed";
import { Observation, SatelliteFloodPolygon, SourceType } from "./types";

export * from "./config";
export * from "./prng";
export * from "./truth";
export * from "./types";
export * from "./simulators/satellite";
export * from "./simulators/fleetGps";
export * from "./simulators/trafficSpeed";
export * from "./simulators/roadSensor";
export * from "./simulators/camera";
export * from "./simulators/officialAlert";
export * from "./simulators/communityReports";
export * from "./simulators/rainModel";

export interface DetectionSimulationSnapshot {
  observations: Observation[];
  satellitePolygons: SatelliteFloodPolygon[];
  probeClusters: ProbeCluster[];
  sensorReadings: SensorTelemetryReading[];
}

export function getAllSimulatedObservations(
  scenario: ScenarioId,
  edges: NetworkEdge[],
  currentT: number,
  enabledSources?: Partial<Record<SourceType, boolean>>
): DetectionSimulationSnapshot {
  const isEnabled = (type: SourceType): boolean => {
    if (enabledSources && typeof enabledSources[type] === "boolean") {
      return enabledSources[type]!;
    }
    return DEFAULT_SOURCE_CONFIGS[type]?.enabled ?? true;
  };

  const observations: Observation[] = [];
  let satellitePolygons: SatelliteFloodPolygon[] = [];
  let probeClusters: ProbeCluster[] = [];
  let sensorReadings: SensorTelemetryReading[] = [];

  // 1. Rain model prior
  if (isEnabled("rain_model")) {
    observations.push(...simulateRainModelObservations(scenario, edges, currentT));
  }

  // 2. Satellite
  if (isEnabled("satellite")) {
    const satResult = simulateSatelliteObservations(scenario, edges, currentT);
    observations.push(...satResult.observations);
    satellitePolygons = satResult.floodPolygons;
  }

  // 3. Fleet GPS
  if (isEnabled("fleet_gps")) {
    const gpsResult = simulateFleetGpsObservations(scenario, edges, currentT);
    observations.push(...gpsResult.observations);
    probeClusters = gpsResult.probeClusters;
  }

  // 4. Traffic speed
  if (isEnabled("traffic_speed")) {
    observations.push(...simulateTrafficSpeedObservations(scenario, edges, currentT));
  }

  // 5. Road sensors
  if (isEnabled("road_sensor")) {
    const sensorResult = simulateRoadSensorObservations(scenario, edges, currentT);
    observations.push(...sensorResult.observations);
    sensorReadings = sensorResult.sensorReadings;
  }

  // 6. Camera
  if (isEnabled("camera")) {
    observations.push(...simulateCameraObservations(scenario, edges, currentT));
  }

  // 7. Official Alerts
  if (isEnabled("official_alert")) {
    observations.push(...simulateOfficialAlertObservations(scenario, edges, currentT));
  }

  // 8 & 9. Community reports (photo & text)
  if (isEnabled("photo_report") || isEnabled("text_report")) {
    const reports = simulateCommunityReports(scenario, edges, currentT);
    const filteredReports = reports.filter((r) => isEnabled(r.sourceType));
    observations.push(...filteredReports);
  }

  // Final sanity filter: Latency check (No observation before receivedAtT)
  const validObservations = observations.filter((o) => o.receivedAtT <= currentT);

  return {
    observations: validObservations,
    satellitePolygons,
    probeClusters,
    sensorReadings,
  };
}
