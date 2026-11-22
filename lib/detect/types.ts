/**
 * Multi-Source Incident Detection & Evidence Fusion - Core Types
 */

export type SourceType =
  | "rain_model"
  | "satellite"
  | "fleet_gps"
  | "traffic_speed"
  | "camera"
  | "road_sensor"
  | "photo_report"
  | "text_report"
  | "official_alert";

export type ClaimType = "blocked" | "degraded" | "clear";

export type ProvenanceType = "simulated" | "live" | "human_verified";

export interface Observation {
  id: string;
  edgeId: string;
  sourceType: SourceType;
  claim: ClaimType;
  confidence: number; // 0.0 - 1.0 (clamped)
  observedAtT: number; // sim hours
  receivedAtT: number; // sim hours (observedAtT + latency)
  provenance: ProvenanceType;
  details: string;
  evidence?: Record<string, number | string | boolean>;
}

export type RoadDetectionState = "clear" | "watch" | "probable" | "confirmed";

export interface RoadStatus {
  edgeId: string;
  probBlocked: number; // 0.0 - 1.0
  state: RoadDetectionState;
  evidence: Observation[];
  independentSources: number;
  explanation: string;
  firstDetectedT?: number;
  confirmedT?: number;
  priorRisk?: number;
}

export interface SourceRegistryEntry {
  type: SourceType;
  label: string;
  enabled: boolean;
  provenance: ProvenanceType;
  latencyHours: number;
  reliabilityWeight: number; // 0.1 - 2.5
  halfLifeHours: number; // exponential half-life for temporal evidence decay
  icon: string;
  description: string;
}

export interface SatelliteFloodPolygon {
  id: string;
  passT: number;
  coordinates: [number, number][][]; // GeoJSON Polygon coordinates [lng, lat]
  edgeIds: string[];
  isFalsePositive?: boolean;
}
