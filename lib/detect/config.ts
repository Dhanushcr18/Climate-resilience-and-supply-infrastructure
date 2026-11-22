/**
 * Source Registry & Detection Engine Configuration
 */
import { SourceRegistryEntry, SourceType } from "./types";

export const DEFAULT_SOURCE_CONFIGS: Record<SourceType, SourceRegistryEntry> = {
  rain_model: {
    type: "rain_model",
    label: "Rainfall Risk Prior",
    enabled: true,
    provenance: "simulated",
    latencyHours: 0.0,
    reliabilityWeight: 0.8,
    halfLifeHours: 12.0,
    icon: "CloudRain",
    description: "Numerical hydrology & precipitation run-off baseline prior",
  },
  satellite: {
    type: "satellite",
    label: "SAR & Optical Satellite",
    enabled: true,
    provenance: "simulated",
    latencyHours: 6.0,
    reliabilityWeight: 1.1,
    halfLifeHours: 24.0,
    icon: "Satellite",
    description: "Sentinel-1/2 synthetic aperture radar water extent observation",
  },
  fleet_gps: {
    type: "fleet_gps",
    label: "Fleet Probe Anomaly",
    enabled: true,
    provenance: "simulated",
    latencyHours: 0.5, // 30 minutes
    reliabilityWeight: 1.2,
    halfLifeHours: 8.0,
    icon: "Truck",
    description: "In-transit telemetry speed drops and standstill clusters",
  },
  traffic_speed: {
    type: "traffic_speed",
    label: "Traffic Speed Index",
    enabled: true,
    provenance: "simulated",
    latencyHours: 0.25, // 15 minutes
    reliabilityWeight: 0.8,
    halfLifeHours: 6.0,
    icon: "Activity",
    description: "Commercial route segment flow velocity vs free-flow ratio",
  },
  road_sensor: {
    type: "road_sensor",
    label: "IoT Culvert & Inclinometer",
    enabled: true,
    provenance: "simulated",
    latencyHours: 0.1, // 6 minutes
    reliabilityWeight: 1.3,
    halfLifeHours: 12.0,
    icon: "Radio",
    description: "Culvert water depth gauge, piezometer and slope motion sensors",
  },
  camera: {
    type: "camera",
    label: "Optical CCTV Vision AI",
    enabled: true,
    provenance: "simulated",
    latencyHours: 0.25, // 15 minutes
    reliabilityWeight: 1.0,
    halfLifeHours: 8.0,
    icon: "Camera",
    description: "Fixed toll/corridor CCTV optical classifier with confusion noise",
  },
  official_alert: {
    type: "official_alert",
    label: "Civil / IMD Alert",
    enabled: true,
    provenance: "simulated",
    latencyHours: 1.0,
    reliabilityWeight: 0.9,
    halfLifeHours: 36.0,
    icon: "AlertOctagon",
    description: "State disaster management authority & IMD meteorological alerts",
  },
  photo_report: {
    type: "photo_report",
    label: "Driver / Citizen Photo",
    enabled: true,
    provenance: "simulated",
    latencyHours: 0.2, // 12 minutes
    reliabilityWeight: 1.1,
    halfLifeHours: 18.0,
    icon: "Image",
    description: "Field uploaded photos validated by AI vision or human dispatcher",
  },
  text_report: {
    type: "text_report",
    label: "Social / Dispatch Intel",
    enabled: true,
    provenance: "simulated",
    latencyHours: 0.4, // 24 minutes
    reliabilityWeight: 0.6,
    halfLifeHours: 12.0,
    icon: "MessageSquare",
    description: "Verified radio dispatch logs, police reports, and crowdsourced feeds",
  },
};

export const FUSION_CONFIG = {
  // Probability thresholds
  CONFIRMED_THRESHOLD: 0.85,
  PROBABLE_THRESHOLD: 0.60,
  WATCH_THRESHOLD: 0.35,

  // Required independent sources for 'confirmed' if no human verification
  MIN_INDEPENDENT_SOURCES_FOR_CONFIRMED: 2,

  // Weight multipliers
  HUMAN_VERIFIED_MULTIPLIER: 2.2,
  LIVE_PROVENANCE_MULTIPLIER: 1.2,

  // Diminishing returns cap for repeated observations from the same source
  MAX_SAME_SOURCE_WEIGHT_CAP: 1.5,
};
