import { NextRequest, NextResponse } from "next/server";
import { NODES, EDGES } from "@/lib/sim/network";

interface CacheEntry {
  timestamp: number;
  data: Record<string, number[]>; // edgeId -> 72h precipitation values
}

let memoryCache: CacheEntry | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

export async function GET(req: NextRequest) {
  try {
    const now = Date.now();

    // Check 10-minute cache
    if (memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        source: "cache",
        cachedAt: new Date(memoryCache.timestamp).toISOString(),
        data: memoryCache.data,
      });
    }

    // Sample key representative nodes across corridor to avoid excessive API requests
    const sampleNodes = ["BLR", "MYS", "HAS", "MNG", "WYN", "KZD", "TSR", "KCH", "CBE", "CHN"];
    const nodeRainHourly: Record<string, number[]> = {};

    // 8 second timeout controller
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // Fetch Open-Meteo precipitation in parallel
    const fetchPromises = sampleNodes.map(async (nodeId) => {
      const node = NODES[nodeId];
      if (!node) return;

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${node.lat}&longitude=${node.lng}&hourly=precipitation,precipitation_probability&forecast_days=3&timezone=Asia%2FKolkata`;

      try {
        const res = await fetch(url, {
          signal: controller.signal,
          next: { revalidate: 600 },
        });
        if (res.ok) {
          const json = await res.json();
          const hourlyPrecip = (json?.hourly?.precipitation as number[]) || [];
          nodeRainHourly[nodeId] = hourlyPrecip.slice(0, 72);
        }
      } catch (e) {
        // Silently continue for individual node failures
      }
    });

    await Promise.all(fetchPromises);
    clearTimeout(timeout);

    // If fetch failed completely, return fallback flag
    if (Object.keys(nodeRainHourly).length === 0) {
      return NextResponse.json({
        success: false,
        fallback: true,
        error: "Open-Meteo weather service unavailable - using scenario baseline",
      });
    }

    // Interpolate precipitation to edges
    const edgePrecipitation: Record<string, number[]> = {};

    EDGES.forEach((edge) => {
      const fromRain = nodeRainHourly[edge.from] || nodeRainHourly["BLR"] || Array(72).fill(0);
      const toRain = nodeRainHourly[edge.to] || nodeRainHourly["BLR"] || Array(72).fill(0);

      const combined: number[] = [];
      for (let h = 0; h < 72; h++) {
        const valFrom = fromRain[h] || 0;
        const valTo = toRain[h] || 0;
        combined.push(Math.round(((valFrom + valTo) / 2) * 10) / 10);
      }
      edgePrecipitation[edge.id] = combined;
    });

    // Update memory cache
    memoryCache = {
      timestamp: now,
      data: edgePrecipitation,
    };

    return NextResponse.json({
      success: true,
      source: "open-meteo",
      cachedAt: new Date(now).toISOString(),
      data: edgePrecipitation,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      fallback: true,
      error: err?.message || "Weather fetch failed",
    });
  }
}
