/**
 * Scenario definitions and rainfall simulation models
 */
import { EDGES, getEdgeMidpoint } from "./network";
import { haversine } from "./geo";

export type ScenarioId = "kerala-2018" | "chennai-2015" | "ghat-landslide" | "live";

export interface StormPulse {
  centerLat: number;
  centerLng: number;
  peakHour: number;      // e.g. 36
  peakIntensityMm: number; // e.g. 42 mm/h
  radiusKm: number;       // e.g. 180 km
  durationHours: number;  // e.g. 24 hours
}

export interface ScenarioDefinition {
  id: ScenarioId;
  name: string;
  label: string;
  description: string;
  pulses: StormPulse[];
}

export const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = {
  "kerala-2018": {
    id: "kerala-2018",
    name: "Kerala Monsoon Surge (Aug 2018)",
    label: "Illustrative scenario modelled on the August 2018 Kerala floods (not actual gauge data)",
    description: "Multi-day extreme monsoon depression impacting Wayanad, Thrissur, Kochi, and Kottayam basins with saturated ghat corridors.",
    pulses: [
      {
        centerLat: 11.6085, // Wayanad
        centerLng: 76.083,
        peakHour: 36,
        peakIntensityMm: 42,
        radiusKm: 160,
        durationHours: 26,
      },
      {
        centerLat: 10.2, // Periyar / Kochi basin
        centerLng: 76.3,
        peakHour: 38,
        peakIntensityMm: 38,
        radiusKm: 175,
        durationHours: 28,
      },
      {
        centerLat: 9.6, // Kuttanad / Kottayam
        centerLng: 76.5,
        peakHour: 42,
        peakIntensityMm: 36,
        radiusKm: 140,
        durationHours: 24,
      },
    ],
  },
  "chennai-2015": {
    id: "chennai-2015",
    name: "Coromandel Cyclone Cloudburst (Dec 2015)",
    label: "Illustrative scenario modelled on the Nov-Dec 2015 Chennai floods",
    description: "Catastrophic coastal downpour over Chennai and northern Tamil Nadu corridors, inundating expressways and closing low-lying crossings.",
    pulses: [
      {
        centerLat: 13.0827, // Chennai
        centerLng: 80.2707,
        peakHour: 40,
        peakIntensityMm: 52,
        radiusKm: 130,
        durationHours: 22,
      },
      {
        centerLat: 12.8, // Kanchipuram / Vellore approach
        centerLng: 79.7,
        peakHour: 42,
        peakIntensityMm: 34,
        radiusKm: 110,
        durationHours: 20,
      },
    ],
  },
  "ghat-landslide": {
    id: "ghat-landslide",
    name: "Western Ghats Critical Landslide Surge",
    label: "Illustrative scenario modelled on localized Western Ghats landslide episodes",
    description: "Targeted orographic rainfall hitting Shiradi Ghat (HAS-MNG), Sampaje Ghat (MDK-MNG), and Thamarassery Ghat (WYN-KZD).",
    pulses: [
      {
        centerLat: 12.85, // Shiradi / Sampaje corridor
        centerLng: 75.4,
        peakHour: 32,
        peakIntensityMm: 46,
        radiusKm: 95,
        durationHours: 20,
      },
      {
        centerLat: 11.5, // Thamarassery ghat
        centerLng: 75.9,
        peakHour: 34,
        peakIntensityMm: 44,
        radiusKm: 90,
        durationHours: 18,
      },
    ],
  },
  "live": {
    id: "live",
    name: "Live Open-Meteo Weather Corridor",
    label: "Live Open-Meteo 72h forecast (interpolated along road network)",
    description: "Live real-time forecast from Open-Meteo with automatic offline scenario fallback.",
    pulses: [], // overridden dynamically
  },
};

/**
 * Seeded pseudo-random number generator for deterministic noise
 */
function seededNoise(seed: number): number {
  const x = Math.sin(seed * 9999 + 1) * 10000;
  return x - Math.floor(x);
}

/**
 * Pure function: calculates true rainfall mm/h for a given edge and time t (0 to 72)
 */
export function getTrueRainMmPerHour(
  scenarioId: ScenarioId,
  edgeId: string,
  t: number
): number {
  const scenario = SCENARIOS[scenarioId] || SCENARIOS["kerala-2018"];
  const edge = EDGES.find((e) => e.id === edgeId);
  if (!edge) return 0;

  const midpoint = getEdgeMidpoint(edge);
  let totalRain = 0;

  for (let i = 0; i < scenario.pulses.length; i++) {
    const pulse = scenario.pulses[i];
    const distKm = haversine(
      midpoint[0],
      midpoint[1],
      pulse.centerLat,
      pulse.centerLng
    );

    // Spatial decay: exp(-(d / radius)^2)
    const spatial = Math.exp(-Math.pow(distKm / pulse.radiusKm, 2));

    // Temporal decay: exp(-((t - peakHour) / (duration / 2))^2)
    const halfDuration = pulse.durationHours / 2;
    const temporal = Math.exp(-Math.pow((t - pulse.peakHour) / halfDuration, 2));

    const pulseIntensity = pulse.peakIntensityMm * spatial * temporal;

    // Small deterministic micro-variation
    const noise = (seededNoise(t * 31 + i * 17 + edgeId.charCodeAt(0)) - 0.5) * 0.08;
    const rain = Math.max(0, pulseIntensity * (1 + noise));
    totalRain += rain;
  }

  return Math.round(totalRain * 100) / 100;
}

/**
 * Returns rainfall history for past 24 hours up to nowT (inclusive: [nowT - 23, ..., nowT])
 */
export function getRainHistory(
  scenarioId: ScenarioId,
  edgeId: string,
  nowT: number
): number[] {
  const history: number[] = [];
  const startT = Math.max(0, Math.floor(nowT) - 23);
  const endT = Math.floor(nowT);

  // Fill zero-padding if nowT < 23
  for (let t = nowT - 23; t < 0; t++) {
    history.push(0);
  }

  for (let t = Math.max(0, startT); t <= endT; t++) {
    history.push(getTrueRainMmPerHour(scenarioId, edgeId, t));
  }
  return history;
}

/**
 * Agent's forecast view: true rainfall plus bounded seeded error growing with lead time.
 * The agent must NOT peek at the future beyond what a forecast provides!
 */
export function getRainForecast(
  scenarioId: ScenarioId,
  edgeId: string,
  nowT: number,
  horizonH = 24
): number[] {
  const forecast: number[] = [];
  const startT = Math.floor(nowT) + 1;
  const endT = Math.floor(nowT) + horizonH;

  for (let t = startT; t <= endT; t++) {
    const trueRain = getTrueRainMmPerHour(scenarioId, edgeId, t);
    const leadTime = t - nowT;

    // Lead-time error factor: up to +/- 15% error at 24h lead time
    const seed = t * 13 + edgeId.charCodeAt(0) * 7 + Math.floor(nowT);
    const noiseFactor = (seededNoise(seed) - 0.5) * 0.3 * (leadTime / horizonH);
    const forecastedRain = Math.max(0, trueRain * (1 + noiseFactor));

    forecast.push(Math.round(forecastedRain * 100) / 100);
  }

  return forecast;
}
