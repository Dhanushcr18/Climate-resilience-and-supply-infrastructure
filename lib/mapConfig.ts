/**
 * Central Basemap Configuration for ResilienceOps
 * 
 * Provides keyless, free OpenStreetMap and OpenFreeMap providers with automatic
 * error recovery and offline fallback.
 */

export type BasemapProviderId = "openfreemap" | "osm-raster" | "none";

export interface BasemapProvider {
  id: BasemapProviderId | string;
  name: string;
  type: "vector" | "raster" | "none";
  url?: string;
  styleUrl?: string;
  maxZoom?: number;
  attribution: string;
}

export const BASEMAP_PROVIDERS: BasemapProvider[] = [
  {
    id: "openfreemap",
    name: "OpenFreeMap",
    type: "vector",
    styleUrl: "https://tiles.openfreemap.org/styles/positron",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
    attribution: 'OpenFreeMap &copy; OpenMapTiles, Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  {
    id: "osm-raster",
    name: "OpenStreetMap",
    type: "raster",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  {
    id: "none",
    name: "Offline Canvas",
    type: "none",
    attribution: "Basemap offline (Network only)",
  },
];

/**
 * Returns active provider list, checking for optional NEXT_PUBLIC_MAP_STYLE_URL override
 */
export function getAvailableProviders(): BasemapProvider[] {
  const envOverride = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
  if (envOverride && typeof envOverride === "string" && envOverride.trim() !== "") {
    const customProvider: BasemapProvider = {
      id: "custom-env",
      name: "Custom Style",
      type: "vector",
      styleUrl: envOverride.trim(),
      url: envOverride.trim(),
      attribution: "Custom Map Provider",
    };
    return [customProvider, ...BASEMAP_PROVIDERS];
  }
  return BASEMAP_PROVIDERS;
}

/**
 * Default South India corridor viewport
 * Center [11.0, 77.0], zoom ~6, bounds with ~8% padding covering all nodes BLR -> TVM -> CHN
 */
export const DEFAULT_MAP_VIEW = {
  center: [11.0, 77.0] as [number, number],
  zoom: 6,
  minZoom: 4,
  maxZoom: 12,
  bounds: [
    [8.159, 74.423],
    [13.447, 80.704],
  ] as [[number, number], [number, number]],
};
