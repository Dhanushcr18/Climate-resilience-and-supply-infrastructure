/**
 * Transparent, documented risk calculation model
 */
import { NetworkEdge } from "./network";

export interface RiskComponents {
  accumulation: number; // 0 - 45
  intensity: number;    // 0 - 20
  terrain: number;      // 0 - 25
  saturation: number;   // 0 - 10
}

export type RiskLevel = "low" | "moderate" | "high" | "severe";

export interface RiskAssessment {
  score: number; // 0 - 100
  level: RiskLevel;
  isClosed: boolean; // score >= 85
  reason: string;
  components: RiskComponents;
  rain48hMm: number;
  past24hMm: number;
  forecast24hMm: number;
  peakIntensityMmPerHour: number;
}

export const RISK_CONFIG = {
  // Accumulation thresholds (past 24h + forecast 24h)
  ACCUM_MIN_MM: 20,
  ACCUM_MAX_MM: 200,
  ACCUM_MAX_SCORE: 45,

  // Intensity thresholds (peak mm/h across 48h)
  INTENSITY_MIN_MM: 5,
  INTENSITY_MAX_MM: 40,
  INTENSITY_MAX_SCORE: 20,

  // Terrain baseline max score
  TERRAIN_MAX_SCORE: 25,
  // Ghat / Lowland multiplier when accumulation score > 20
  TERRAIN_AMPLIFIER_MAX: 1.3,

  // Saturation bonus (prior 24h rain)
  SATURATION_MIN_MM: 30,
  SATURATION_MAX_MM: 120,
  SATURATION_MAX_SCORE: 10,

  // Risk levels
  LEVEL_MODERATE_THRESHOLD: 25,
  LEVEL_HIGH_THRESHOLD: 50,
  LEVEL_SEVERE_THRESHOLD: 75,
  ROAD_CLOSURE_THRESHOLD: 85,
  ROAD_REOPEN_THRESHOLD: 70,
};

/**
 * Pure risk scoring function based on rain history and forecast
 */
export function calculateRiskScore(
  edge: NetworkEdge,
  rainHistory: number[], // hourly rain mm for past 24h (up to current time)
  rainForecast: number[] // hourly rain mm for next 24h
): RiskAssessment {
  const past = rainHistory.length > 0 ? rainHistory : [0];
  const forecast = rainForecast.length > 0 ? rainForecast : [0];

  const past24hMm = past.reduce((acc, v) => acc + (v || 0), 0);
  const forecast24hMm = forecast.reduce((acc, v) => acc + (v || 0), 0);
  const rain48hMm = Math.round((past24hMm + forecast24hMm) * 10) / 10;

  const all48h = [...past, ...forecast];
  const peakIntensity = Math.round(Math.max(...all48h, 0) * 10) / 10;

  // 1. Accumulation component (0 - 45)
  let accumulation = 0;
  if (rain48hMm > RISK_CONFIG.ACCUM_MIN_MM) {
    const fraction =
      (rain48hMm - RISK_CONFIG.ACCUM_MIN_MM) /
      (RISK_CONFIG.ACCUM_MAX_MM - RISK_CONFIG.ACCUM_MIN_MM);
    accumulation = Math.min(
      RISK_CONFIG.ACCUM_MAX_SCORE,
      Math.max(0, fraction * RISK_CONFIG.ACCUM_MAX_SCORE)
    );
  }

  // 2. Intensity component (0 - 20)
  let intensity = 0;
  if (peakIntensity > RISK_CONFIG.INTENSITY_MIN_MM) {
    const fraction =
      (peakIntensity - RISK_CONFIG.INTENSITY_MIN_MM) /
      (RISK_CONFIG.INTENSITY_MAX_MM - RISK_CONFIG.INTENSITY_MIN_MM);
    intensity = Math.min(
      RISK_CONFIG.INTENSITY_MAX_SCORE,
      Math.max(0, fraction * RISK_CONFIG.INTENSITY_MAX_SCORE)
    );
  }

  // 3. Terrain component (0 - 25)
  let terrainBase = (edge.vulnerability || 0) * RISK_CONFIG.TERRAIN_MAX_SCORE;
  if (
    (edge.terrain === "ghat" || edge.terrain === "lowland") &&
    accumulation > 20
  ) {
    // Scale up by up to 1.3 when accumulation is high
    const excess = (accumulation - 20) / (RISK_CONFIG.ACCUM_MAX_SCORE - 20);
    const multiplier = 1.0 + 0.3 * Math.min(1, Math.max(0, excess));
    terrainBase = Math.min(RISK_CONFIG.TERRAIN_MAX_SCORE, terrainBase * multiplier);
  }

  // 4. Saturation bonus (0 - 10)
  let saturation = 0;
  if (past24hMm > RISK_CONFIG.SATURATION_MIN_MM) {
    const fraction =
      (past24hMm - RISK_CONFIG.SATURATION_MIN_MM) /
      (RISK_CONFIG.SATURATION_MAX_MM - RISK_CONFIG.SATURATION_MIN_MM);
    saturation = Math.min(
      RISK_CONFIG.SATURATION_MAX_SCORE,
      Math.max(0, fraction * RISK_CONFIG.SATURATION_MAX_SCORE)
    );
  }

  const rawScore = accumulation + intensity + terrainBase + saturation;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  let level: RiskLevel = "low";
  if (score >= RISK_CONFIG.LEVEL_SEVERE_THRESHOLD) {
    level = "severe";
  } else if (score >= RISK_CONFIG.LEVEL_HIGH_THRESHOLD) {
    level = "high";
  } else if (score >= RISK_CONFIG.LEVEL_MODERATE_THRESHOLD) {
    level = "moderate";
  }

  const isClosed = score >= RISK_CONFIG.ROAD_CLOSURE_THRESHOLD;

  // Build transparent human-readable reason
  const terrainLabel =
    edge.terrain === "ghat"
      ? "steep ghat terrain"
      : edge.terrain === "lowland"
      ? "flood-prone river basin lowland"
      : edge.terrain === "coastal"
      ? "storm-surge coastal plain"
      : "plain corridor";

  const reason = `${Math.round(rain48hMm)} mm over 48h (${Math.round(
    past24hMm
  )} mm past + ${Math.round(
    forecast24hMm
  )} mm forecast), peak ${Math.round(
    peakIntensity
  )} mm/h, ${terrainLabel}, vulnerability ${edge.vulnerability.toFixed(2)}`;

  return {
    score,
    level,
    isClosed,
    reason,
    components: {
      accumulation: Math.round(accumulation * 10) / 10,
      intensity: Math.round(intensity * 10) / 10,
      terrain: Math.round(terrainBase * 10) / 10,
      saturation: Math.round(saturation * 10) / 10,
    },
    rain48hMm,
    past24hMm: Math.round(past24hMm * 10) / 10,
    forecast24hMm: Math.round(forecast24hMm * 10) / 10,
    peakIntensityMmPerHour: peakIntensity,
  };
}
