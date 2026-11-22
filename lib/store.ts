import { create } from "zustand";
import { ScenarioId } from "./sim/scenarios";
import { Observation, SourceType } from "./detect/types";
import { RegionId } from "./sim/network";
import { SupportedLanguage } from "./i18n";

export type SimMode = "agent" | "baseline";

export interface DetectionLayerToggles {
  satelliteFlood: boolean;
  roadSensors: boolean;
  cameras: boolean;
  stalledProbes: boolean;
  reportPins: boolean;
  fusedRings: boolean;
}

interface SimStoreState {
  // Scenario & playback
  scenario: ScenarioId;
  simT: number; // 0 to 72
  isPlaying: boolean;
  speed: number; // 1, 2, 5, 10
  mode: SimMode; // 'agent' vs 'baseline'

  // Selection & Region Division
  selectedRegion: RegionId;
  selectedShipmentCode: string | null;
  selectedEdgeId: string | null;
  selectedDecisionId: string | null;
  activeSidebarTab: "corridors" | "fleet";

  // Truck Focus & Live Relocation
  truckFocusTarget: { lat: number; lng: number; zoom?: number; code: string; timestamp: number } | null;
  manualReroutedTrucks: string[];

  // View settings
  showHeatmap: boolean;
  showRecommendedAlternate: boolean;
  theme: "dark" | "light";
  language: SupportedLanguage;

  // Multi-source Detection & Evidence Layer Controls
  detectionLayers: DetectionLayerToggles;
  enabledSources: Record<SourceType, boolean>;
  userObservations: Observation[];

  // Actions
  setLanguage: (lang: SupportedLanguage) => void;
  setScenario: (scenario: ScenarioId) => void;
  setSimT: (t: number) => void;
  advanceSimT: (delta: number) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  setMode: (mode: SimMode) => void;
  toggleMode: () => void;
  setSelectedRegion: (region: RegionId) => void;
  setSelectedShipment: (code: string | null) => void;
  setSelectedEdge: (edgeId: string | null) => void;
  setSelectedDecision: (decisionId: string | null) => void;
  setActiveSidebarTab: (tab: "corridors" | "fleet") => void;
  setTruckFocusTarget: (target: { lat: number; lng: number; zoom?: number; code: string; timestamp: number } | null) => void;
  toggleTruckManualReroute: (truckCode: string) => void;
  setShowHeatmap: (show: boolean) => void;
  toggleRecommendedAlternate: () => void;
  toggleDetectionLayer: (layer: keyof DetectionLayerToggles) => void;
  toggleSourceEnabled: (source: SourceType) => void;
  addUserObservation: (obs: Observation) => void;
  removeUserObservationsForEdge: (edgeId: string) => void;
  reopenEdge: (edgeId: string, currentT?: number) => void;
  clearUserObservations: () => void;
  toggleTheme: () => void;
  resetSim: () => void;
}

export const SYNC_CHANNEL_NAME = "climate_change_fleet_sync";

function broadcastSimSync(patch: Partial<SimStoreState>) {
  if (typeof window === "undefined") return;
  try {
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel(SYNC_CHANNEL_NAME);
      bc.postMessage(patch);
      bc.close();
    }
  } catch (e) {
    // Ignore environments without BroadcastChannel
  }
}

export const useSimStore = create<SimStoreState>((set) => ({
  scenario: "kerala-2018",
  simT: 18,
  isPlaying: false,
  speed: 2,
  mode: "agent",

  selectedRegion: "south",
  selectedShipmentCode: null,
  selectedEdgeId: null,
  selectedDecisionId: null,
  activeSidebarTab: "fleet",
  truckFocusTarget: null,
  manualReroutedTrucks: [],

  showHeatmap: true,
  showRecommendedAlternate: true,
  theme: "dark",
  language: "en",

  detectionLayers: {
    satelliteFlood: true,
    roadSensors: true,
    cameras: true,
    stalledProbes: true,
    reportPins: true,
    fusedRings: true,
  },

  enabledSources: {
    rain_model: true,
    satellite: true,
    fleet_gps: true,
    traffic_speed: true,
    road_sensor: true,
    camera: true,
    official_alert: true,
    photo_report: true,
    text_report: true,
  },

  userObservations: [],

  setLanguage: (language) => set({ language }),
  setScenario: (scenario) => {
    set({ scenario, simT: 18, isPlaying: false, userObservations: [] });
    broadcastSimSync({ scenario, simT: 18, isPlaying: false, userObservations: [] });
  },
  setSimT: (t) => {
    const simT = Math.max(0, Math.min(72, t));
    set({ simT });
    broadcastSimSync({ simT });
  },
  advanceSimT: (delta) =>
    set((state) => {
      const simT = Math.min(72, Math.max(0, state.simT + delta));
      const isPlaying = simT >= 72 ? false : state.isPlaying;
      broadcastSimSync({ simT, isPlaying });
      return { simT, isPlaying };
    }),
  setIsPlaying: (isPlaying) => {
    set({ isPlaying });
    broadcastSimSync({ isPlaying });
  },
  togglePlay: () =>
    set((state) => {
      const isPlaying = !state.isPlaying;
      broadcastSimSync({ isPlaying });
      return { isPlaying };
    }),
  setSpeed: (speed) => set({ speed }),
  setMode: (mode) => {
    set({ mode });
    broadcastSimSync({ mode });
  },
  toggleMode: () =>
    set((state) => {
      const mode = state.mode === "agent" ? "baseline" : "agent";
      broadcastSimSync({ mode });
      return { mode };
    }),
  setSelectedRegion: (selectedRegion) =>
    set((state) => {
      let newLang = state.language;
      // If user selected an Indian regional language, adapt it to the zone
      if (state.language !== "en") {
        if (selectedRegion === "south") {
          if (!["kn", "ta", "te", "ml"].includes(state.language)) {
            newLang = "kn";
          }
        } else if (selectedRegion !== "all") {
          newLang = "hi";
        }
      }
      return {
        selectedRegion,
        selectedShipmentCode: null,
        selectedEdgeId: null,
        selectedDecisionId: null,
        language: newLang,
      };
    }),
  setSelectedShipment: (selectedShipmentCode) =>
    set({ selectedShipmentCode, selectedEdgeId: null }),
  setSelectedEdge: (selectedEdgeId) =>
    set({ selectedEdgeId, selectedShipmentCode: null }),
  setSelectedDecision: (selectedDecisionId) => set({ selectedDecisionId }),
  setActiveSidebarTab: (activeSidebarTab) => set({ activeSidebarTab }),
  setTruckFocusTarget: (truckFocusTarget) => set({ truckFocusTarget }),
  toggleTruckManualReroute: (truckCode) =>
    set((state) => {
      const exists = state.manualReroutedTrucks.includes(truckCode);
      const updated = exists
        ? state.manualReroutedTrucks.filter((c) => c !== truckCode)
        : [...state.manualReroutedTrucks, truckCode];
      return {
        manualReroutedTrucks: updated,
        selectedShipmentCode: truckCode,
      };
    }),
  setShowHeatmap: (showHeatmap) => set({ showHeatmap }),
  toggleRecommendedAlternate: () =>
    set((state) => ({ showRecommendedAlternate: !state.showRecommendedAlternate })),
  toggleDetectionLayer: (layer) =>
    set((state) => ({
      detectionLayers: {
        ...state.detectionLayers,
        [layer]: !state.detectionLayers[layer],
      },
    })),
  toggleSourceEnabled: (source) =>
    set((state) => ({
      enabledSources: {
        ...state.enabledSources,
        [source]: !state.enabledSources[source],
      },
    })),
  addUserObservation: (obs) =>
    set((state) => ({
      userObservations: [obs, ...state.userObservations],
    })),
  removeUserObservationsForEdge: (edgeId) =>
    set((state) => ({
      userObservations: state.userObservations.filter((o) => o.edgeId !== edgeId),
    })),
  reopenEdge: (edgeId, currentT) =>
    set((state) => {
      const filtered = state.userObservations.filter((o) => o.edgeId !== edgeId);
      const t = currentT ?? state.simT;
      const clearObs: Observation = {
        id: `reopen-${edgeId}-${Date.now()}`,
        edgeId,
        sourceType: "official_alert",
        claim: "clear",
        confidence: 0.99,
        observedAtT: t,
        receivedAtT: t,
        provenance: "human_verified",
        details: `Dispatcher Clearance: Road inspection verified clear and passable. Resumed standard corridor routing.`,
      };
      const newObs = [clearObs, ...filtered];
      broadcastSimSync({ userObservations: newObs });
      return { userObservations: newObs };
    }),
  clearUserObservations: () => {
    set({ userObservations: [] });
    broadcastSimSync({ userObservations: [] });
  },
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "dark" ? "light" : "dark";
      if (typeof document !== "undefined") {
        if (next === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
      return { theme: next };
    }),
  resetSim: () => {
    const resetState = {
      simT: 18,
      isPlaying: false,
      selectedShipmentCode: null,
      selectedEdgeId: null,
      selectedDecisionId: null,
      userObservations: [],
    };
    set(resetState);
    broadcastSimSync(resetState);
  },
}));

// Initialize Cross-Tab Event Listener in Browser
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    const receiverChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    receiverChannel.onmessage = (event) => {
      if (event.data && typeof event.data === "object") {
        useSimStore.setState(event.data);
      }
    };
  } catch (e) {
    // Graceful fallback
  }
}
