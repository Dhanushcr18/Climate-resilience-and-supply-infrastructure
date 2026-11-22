"use client";

import React, { useMemo, useEffect, useState, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Polygon,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { EDGES, NODES, NetworkEdge, RegionId, REGION_NAMES } from "@/lib/sim/network";
import { dijkstra } from "@/lib/sim/routing";
import { calculateRiskScore, RiskAssessment } from "@/lib/sim/risk";
import { getRainHistory, getRainForecast, SCENARIOS, ScenarioId } from "@/lib/sim/scenarios";
import { RoadPopup } from "./RoadPopup";
import { TruckMarkers } from "./TruckMarkers";
import { ShipmentSimState, AgentDecision } from "@/lib/sim/engine";
import { useSimStore } from "@/lib/store";
import {
  RotateCcw,
  Radar,
  Layers,
  Satellite,
  Truck,
  Radio,
  Camera,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Eye,
  Check,
} from "lucide-react";
import {
  getAvailableProviders,
  DEFAULT_MAP_VIEW,
  BasemapProvider,
} from "@/lib/mapConfig";
import { RoadStatus, SatelliteFloodPolygon, Observation } from "@/lib/detect/types";
import { ProbeCluster } from "@/lib/detect/simulators/fleetGps";
import { SensorTelemetryReading } from "@/lib/detect/simulators/roadSensor";
import { FIXED_CAMERA_EDGES } from "@/lib/detect/simulators/camera";

interface LeafletMapProps {
  scenario: ScenarioId;
  simT: number;
  selectedEdgeId: string | null;
  onSelectEdge: (id: string | null) => void;
  trucks?: ShipmentSimState[];
  selectedShipmentCode?: string | null;
  onSelectTruck?: (code: string | null) => void;
  activeRoutePolyline?: [number, number][];
  originalRoutePolyline?: [number, number][];
  roadStatusMap?: Map<string, RoadStatus>;
  satellitePolygons?: SatelliteFloodPolygon[];
  probeClusters?: ProbeCluster[];
  sensorReadings?: SensorTelemetryReading[];
  allObservations?: Observation[];
  decisions?: AgentDecision[];
}

export const REGION_CAMERA_CONFIG: Record<RegionId, { center: [number, number]; zoom: number }> = {
  all: { center: [22.5, 79.5], zoom: 5 },
  south: { center: [11.8, 77.0], zoom: 7 },
  north: { center: [29.5, 76.8], zoom: 7 },
  west: { center: [19.8, 74.5], zoom: 7 },
  east: { center: [24.0, 87.5], zoom: 7 },
};

export const REGION_PRIMARY_CITIES: Record<RegionId, Set<string>> = {
  all: new Set(["BLR", "CHN", "DEL", "BOM", "CCU", "HYD", "AMD", "GAU"]),
  south: new Set(["BLR", "HAS", "MNG", "MYS", "MDK", "KCH", "CBE", "CHN", "HYD", "VTZ", "IXM"]),
  north: new Set(["DEL", "IXC", "ATQ", "JAI", "LKO", "VNS", "DED", "SXR"]),
  west: new Set(["BOM", "PNQ", "AMD", "STV", "NAG", "GOI", "IDR"]),
  east: new Set(["CCU", "BBI", "PAT", "IXR", "IXB", "GAU"]),
};

function RegionCameraController({ region }: { region: RegionId }) {
  const map = useMap();
  const prevRegionRef = useRef<RegionId>(region);

  useEffect(() => {
    if (prevRegionRef.current !== region) {
      prevRegionRef.current = region;
      const target = REGION_CAMERA_CONFIG[region] || REGION_CAMERA_CONFIG.all;
      map.flyTo(target.center, target.zoom, { duration: 1.2 });
    }
  }, [region, map]);

  return null;
}

// Truck focus camera controller for "Locate on Map"
function TruckFocusController() {
  const map = useMap();
  const truckFocusTarget = useSimStore((s) => s.truckFocusTarget);
  const prevTargetRef = useRef<number>(0);

  useEffect(() => {
    if (truckFocusTarget && truckFocusTarget.timestamp !== prevTargetRef.current) {
      prevTargetRef.current = truckFocusTarget.timestamp;
      map.flyTo([truckFocusTarget.lat, truckFocusTarget.lng], truckFocusTarget.zoom || 11, {
        duration: 1.2,
      });
    }
  }, [truckFocusTarget, map]);

  return null;
}

// Camera reset helper
function ResetViewControl({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  return (
    <button
      onClick={() => map.flyTo(center, zoom, { duration: 1 })}
      className="p-2 rounded-lg bg-surface-container-high/90 hover:bg-surface-variant text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center border border-white/5 shadow-md"
      title="Reset Camera View"
    >
      <RotateCcw className="w-4 h-4" />
    </button>
  );
}

// Map resize watcher calling invalidateSize on mount & container dimension changes
function MapResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const container = map.getContainer();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && container) {
      observer = new ResizeObserver(() => {
        map.invalidateSize();
      });
      observer.observe(container);
    }

    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, [map]);
  return null;
}

// Helper: midpoint of an edge path
function getEdgeMidpoint(edge: NetworkEdge): [number, number] {
  if (!edge.path || edge.path.length === 0) return [11.0, 77.0];
  const midIdx = Math.floor(edge.path.length / 2);
  return edge.path[midIdx];
}

export default function LeafletMap({
  scenario,
  simT,
  selectedEdgeId,
  onSelectEdge,
  trucks = [],
  selectedShipmentCode = null,
  onSelectTruck = () => {},
  activeRoutePolyline,
  originalRoutePolyline,
  roadStatusMap,
  satellitePolygons = [],
  probeClusters = [],
  sensorReadings = [],
  allObservations = [],
  decisions = [],
}: LeafletMapProps) {
  const showHeatmap = useSimStore((s) => s.showHeatmap);
  const setShowHeatmap = useSimStore((s) => s.setShowHeatmap);
  const showRecommendedAlternate = useSimStore((s) => s.showRecommendedAlternate);
  const toggleRecommendedAlternate = useSimStore((s) => s.toggleRecommendedAlternate);
  const detectionLayers = useSimStore((s) => s.detectionLayers);
  const toggleDetectionLayer = useSimStore((s) => s.toggleDetectionLayer);
  const selectedRegion = useSimStore((s) => s.selectedRegion);
  const setSelectedRegion = useSimStore((s) => s.setSelectedRegion);
  const manualReroutedTrucks = useSimStore((s) => s.manualReroutedTrucks);
  const truckFocusTarget = useSimStore((s) => s.truckFocusTarget);

  const visibleEdges = useMemo(() => {
    if (selectedRegion === "all") return EDGES;
    return EDGES.filter((e) => e.region === selectedRegion);
  }, [selectedRegion]);

  const visibleEdgeIds = useMemo(() => new Set(visibleEdges.map((e) => e.id)), [visibleEdges]);

  const visibleNodes = useMemo(() => {
    if (selectedRegion === "all") return Object.values(NODES);
    return Object.values(NODES).filter((n) => n.region === selectedRegion);
  }, [selectedRegion]);

  const [mounted, setMounted] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Basemap providers and fallback state
  const providers = useMemo(() => getAvailableProviders(), []);
  const [activeProviderIndex, setActiveProviderIndex] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("resilienceops_basemap_provider");
        if (saved) {
          const found = providers.findIndex((p) => p.id === saved);
          if (found !== -1) return found;
        }
      } catch {
        // sessionStorage inaccessible
      }
    }
    return 0;
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const tileErrorsRef = useRef<number[]>([]);

  const activeProvider: BasemapProvider =
    providers[activeProviderIndex] || providers[0];

  const handleProviderFallback = useCallback(
    (reason?: string) => {
      setActiveProviderIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % providers.length;
        const nextProvider = providers[nextIndex];
        try {
          sessionStorage.setItem("resilienceops_basemap_provider", nextProvider.id);
        } catch {
          // ignore
        }
        setToastMsg(
          reason
            ? `${reason} → Switched basemap to ${nextProvider.name}`
            : `Switched basemap: ${nextProvider.name}`
        );
        setTimeout(() => setToastMsg(null), 4000);
        return nextIndex;
      });
      tileErrorsRef.current = [];
    },
    [providers]
  );

  const handleTileError = useCallback(() => {
    const now = Date.now();
    tileErrorsRef.current = tileErrorsRef.current.filter((t) => now - t < 6000);
    tileErrorsRef.current.push(now);

    if (tileErrorsRef.current.length >= 4) {
      handleProviderFallback("Tile load errors detected");
    }
  }, [handleProviderFallback]);

  const handleManualCycleProvider = () => {
    handleProviderFallback();
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute risk assessment for every edge at current simT
  const edgeAssessments = useMemo(() => {
    const map = new Map<
      string,
      { assessment: RiskAssessment; forecast: number[] }
    >();
    EDGES.forEach((edge) => {
      const history = getRainHistory(scenario, edge.id, simT);
      const forecast = getRainForecast(scenario, edge.id, simT, 24);
      const assessment = calculateRiskScore(edge, history, forecast);
      map.set(edge.id, { assessment, forecast });
    });
    return map;
  }, [scenario, simT]);

  // Selected truck's polylines
  const selectedTruck = useMemo(() => {
    if (!selectedShipmentCode) return null;
    return trucks.find((t) => t.code === selectedShipmentCode) || null;
  }, [selectedShipmentCode, trucks]);

  const trackingTarget = useMemo(() => {
    // 1. Live selected truck state has the exact current position for the active simT
    if (selectedTruck) {
      return {
        lat: selectedTruck.lat,
        lng: selectedTruck.lng,
        zoom: 11,
        code: selectedTruck.code,
        timestamp: Date.now(),
      };
    }
    // 2. Fall back to manual/programmatic focus target
    if (truckFocusTarget) {
      return truckFocusTarget;
    }
    return null;
  }, [selectedTruck, truckFocusTarget]);

  const truckActivePolyline =
    activeRoutePolyline || selectedTruck?.activeRoute?.polyline;
  const truckOriginalPolyline =
    originalRoutePolyline ||
    (selectedTruck && selectedTruck.activeRoute !== selectedTruck.originalRoute
      ? selectedTruck.originalRoute?.polyline
      : undefined);

  // Active recommended alternate route calculation
  const recommendedAlternate = useMemo(() => {
    // Determine target truck: explicitly selected truck OR latest manually rerouted truck
    const targetShipmentCode =
      selectedShipmentCode ||
      (manualReroutedTrucks.length > 0
        ? manualReroutedTrucks[manualReroutedTrucks.length - 1]
        : null);

    const isTargetManuallyRerouted = Boolean(
      targetShipmentCode && manualReroutedTrucks.includes(targetShipmentCode)
    );
    const targetTruck = trucks.find((t) => t.code === targetShipmentCode);

    let dec: AgentDecision | null | undefined = null;

    // 1. If an edge is selected (user clicked a road on the map)
    if (selectedEdgeId) {
      dec =
        decisions.find(
          (d) =>
            d.edgeId === selectedEdgeId &&
            (d.decision === "REROUTE" || Boolean(d.alternateRoute))
        ) ||
        decisions.find(
          (d) =>
            d.decision === "REROUTE" &&
            Boolean(d.alternateRoute) &&
            d.alternateRoute?.edges.some((e) => e.id === selectedEdgeId)
        );
    }

    // 2. If a truck is targeted, find its latest or planned reroute/escalation decision
    if (!dec && targetShipmentCode) {
      dec =
        decisions
          .filter(
            (d) =>
              d.shipmentCode === targetShipmentCode &&
              d.simT <= simT &&
              (d.decision === "REROUTE" || d.decision === "ESCALATE" || Boolean(d.alternateRoute))
          )
          .sort((a, b) => b.simT - a.simT)[0] ||
        decisions.find(
          (d) =>
            d.shipmentCode === targetShipmentCode &&
            (d.decision === "REROUTE" || d.decision === "ESCALATE" || Boolean(d.alternateRoute))
        );
    }

    // 3. Fallback: find any reroute decision for an edge that is currently closed/blocked in active region
    if (!dec && !targetShipmentCode) {
      const closedEdgeEntry = Array.from(edgeAssessments.entries()).find(
        ([id, data]) => data.assessment.isClosed || data.assessment.score >= 85
      );
      const blockedEdgeId = closedEdgeEntry ? closedEdgeEntry[0] : null;

      if (blockedEdgeId) {
        dec = decisions.find(
          (d) =>
            d.edgeId === blockedEdgeId &&
            (d.decision === "REROUTE" || Boolean(d.alternateRoute))
        );
      }
    }

    // 4. Fallback to prominent medicine reroute (TRK-001) or any active REROUTE
    if (!dec && !targetShipmentCode) {
      dec =
        decisions.find(
          (d) =>
            d.decision === "REROUTE" &&
            d.simT <= simT &&
            (d.shipmentCode === "TRK-001" || d.shipmentCode === "TRK-003")
        ) ||
        decisions.find(
          (d) => d.decision === "REROUTE" && d.simT <= simT
        ) ||
        decisions.find(
          (d) =>
            d.decision === "REROUTE" &&
            (d.shipmentCode === "TRK-001" || d.shipmentCode === "TRK-003")
        ) ||
        decisions.find((d) => d.decision === "REROUTE") ||
        null;
    }

    // If decision with alternateRoute found, use it!
    if (
      dec &&
      dec.alternateRoute &&
      dec.alternateRoute.polyline &&
      dec.alternateRoute.polyline.length >= 2
    ) {
      const polyline = dec.alternateRoute.polyline;
      const midIdx = Math.floor(polyline.length / 2);
      const midPoint = polyline[midIdx];
      const blockedEdge =
        EDGES.find((e) => e.id === dec?.edgeId) ||
        (targetTruck?.currentEdgeId ? EDGES.find((e) => e.id === targetTruck.currentEdgeId) : null);
      const blockedMid = blockedEdge ? getEdgeMidpoint(blockedEdge) : null;

      return {
        decision: dec,
        polyline,
        midPoint,
        blockedEdge,
        blockedMid,
        tier: dec.alternateType || "safe",
        risk: dec.alternateRisk || 46,
        extraMinutes: dec.extraMinutes,
        summary: dec.alternateRouteSummary || "Via safe alternate bypass",
        riskScore: dec.riskScore || 85,
      };
    }

    // 5. If target truck is manually relocated, blocked, or in escalation/hold, compute/ensure its alternate bypass route!
    if (
      targetTruck &&
      (!dec?.alternateRoute?.polyline || dec.alternateRoute.polyline.length < 2) &&
      (isTargetManuallyRerouted ||
        targetTruck.isBlocked ||
        targetTruck.status === "escalated" ||
        targetTruck.status === "held" ||
        targetTruck.status === "delayed" ||
        targetTruck.activeRoute !== targetTruck.originalRoute ||
        dec?.decision === "ESCALATE" ||
        dec?.decision === "HOLD")
    ) {
      const currentEdge = targetTruck.currentEdgeId
        ? EDGES.find((e) => e.id === targetTruck.currentEdgeId)
        : null;
      const edgeToAvoid =
        currentEdge || targetTruck.originalRoute?.edges?.[0] || targetTruck.activeRoute?.edges?.[0];

      if (edgeToAvoid) {
        const closureRiskMap = new Map<string, number>();
        closureRiskMap.set(edgeToAvoid.id, 99);
        if (dec?.edgeId) closureRiskMap.set(dec.edgeId, 99);

        // Mark known closed edges from assessments
        edgeAssessments.forEach((data, eid) => {
          if (data.assessment.isClosed || data.assessment.score >= 85) {
            closureRiskMap.set(eid, 99);
          }
        });

        const altRoute = dijkstra(
          targetTruck.shipment.origin,
          targetTruck.shipment.destination,
          closureRiskMap,
          true
        );

        if (altRoute && altRoute.polyline && altRoute.polyline.length >= 2) {
          const midIdx = Math.floor(altRoute.polyline.length / 2);
          const midPoint = altRoute.polyline[midIdx];
          const blockedMid = getEdgeMidpoint(edgeToAvoid);

          return {
            decision: {
              id: `RELOCATE-${targetTruck.code}`,
              simT,
              shipmentCode: targetTruck.code,
              decision: "REROUTE" as const,
              roadName: edgeToAvoid.name,
              edgeId: edgeToAvoid.id,
              riskScore: 85,
              reason: `Dispatcher alternate route relocation for ${targetTruck.code} (${targetTruck.shipment.driverName}) avoiding ${edgeToAvoid.name}`,
              extraMinutes: Math.max(25, altRoute.totalMinutes - edgeToAvoid.baseMinutes),
              estimatedDelayAvoidedMin: 180,
              explanation: `Dispatcher relocated truck ${targetTruck.code} onto safe alternate bypass corridor to avoid flooded or blocked section.`,
              driverMessage: `RELOCATION ADVISORY: Divert immediately to safe alternate bypass corridor.`,
              alternateRouteSummary: altRoute.nodes.join(" → "),
              isAiWritten: false,
              alternateRoute: altRoute,
              alternateType: "safe" as const,
              alternateRisk: altRoute.maxRisk,
            },
            polyline: altRoute.polyline,
            midPoint,
            blockedEdge: edgeToAvoid,
            blockedMid,
            tier: "safe",
            risk: altRoute.maxRisk || 35,
            extraMinutes: Math.max(25, altRoute.totalMinutes - edgeToAvoid.baseMinutes),
            summary: altRoute.nodes.join(" → "),
            riskScore: 85,
          };
        }
      }
    }

    // 6. If selectedEdgeId is closed or high-risk, synthesize an alternate route avoiding it
    if (selectedEdgeId) {
      const edge = EDGES.find((e) => e.id === selectedEdgeId);
      const data = edgeAssessments.get(selectedEdgeId);
      const isBlocked =
        data?.assessment.isClosed ||
        (data?.assessment.score !== undefined && data.assessment.score >= 85);

      if (edge && isBlocked) {
        const closureRiskMap = new Map<string, number>();
        closureRiskMap.set(edge.id, 99); // completely impassable
        const altRoute = dijkstra(edge.from, edge.to, closureRiskMap, true);

        if (altRoute && altRoute.polyline && altRoute.polyline.length >= 2) {
          const midIdx = Math.floor(altRoute.polyline.length / 2);
          const midPoint = altRoute.polyline[midIdx];
          const blockedMid = getEdgeMidpoint(edge);

          return {
            decision: {
              id: `SYNTH-${edge.id}`,
              simT,
              shipmentCode: "ALL",
              decision: "REROUTE" as const,
              roadName: edge.name,
              edgeId: edge.id,
              riskScore: data?.assessment.score || 85,
              reason: `Rerouted via alternate corridor avoiding ${edge.name}`,
              extraMinutes: Math.max(15, altRoute.totalMinutes - edge.baseMinutes),
              estimatedDelayAvoidedMin: 180,
              explanation: `Corridor ${edge.name} is impassable. Autonomous routing identifies safe bypass corridor.`,
              driverMessage: `TAKE ALTERNATE CORRIDOR: Avoid ${edge.name}.`,
              alternateRouteSummary: altRoute.nodes.join(" → "),
              isAiWritten: false,
              alternateRoute: altRoute,
              alternateType: "safe" as const,
              alternateRisk: altRoute.maxRisk,
            },
            polyline: altRoute.polyline,
            midPoint,
            blockedEdge: edge,
            blockedMid,
            tier: "safe",
            risk: altRoute.maxRisk,
            extraMinutes: Math.max(15, altRoute.totalMinutes - edge.baseMinutes),
            summary: altRoute.nodes.join(" → "),
            riskScore: data?.assessment.score || 85,
          };
        }
      }
    }

    return null;
  }, [decisions, selectedShipmentCode, selectedEdgeId, simT, edgeAssessments, manualReroutedTrucks, trucks]);

  // City Node DivIcons (Limited to at most ~8 primary cities per region to keep map free of clutter)
  const nodeIcons = useMemo(() => {
    const icons: Record<string, L.DivIcon> = {};
    const primarySet = REGION_PRIMARY_CITIES[selectedRegion] || REGION_PRIMARY_CITIES.all;

    visibleNodes.forEach((node) => {
      if (!primarySet.has(node.id)) return;
      icons[node.id] = L.divIcon({
        className: "custom-city-marker",
        html: `
          <div class="flex items-center -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
            <div class="w-2.5 h-2.5 rounded-full bg-on-surface border border-surface-container-lowest shadow-xs"></div>
            <div class="ml-1.5 px-1.5 py-0.5 rounded bg-surface-container-lowest/95 border border-outline-variant text-[11px] font-semibold text-on-surface whitespace-nowrap shadow-xs">
              ${node.name}
            </div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [5, 5],
      });
    });
    return icons;
  }, [selectedRegion, visibleNodes]);

  // Filter current hour's probe clusters & sensor readings
  const currentHour = Math.floor(simT);
  const activeProbes = useMemo(() => {
    return probeClusters.filter((c) => c.t === currentHour && c.stalledProbeCount > 0);
  }, [probeClusters, currentHour]);

  const activeSensors = useMemo(() => {
    return sensorReadings.filter((s) => s.t === currentHour);
  }, [sensorReadings, currentHour]);

  // Filter photo & text reports active at simT
  const activeReports = useMemo(() => {
    return allObservations.filter(
      (o) =>
        (o.sourceType === "photo_report" || o.sourceType === "text_report") &&
        o.receivedAtT <= simT &&
        simT - o.receivedAtT <= 24 // visible within 24 hours of reporting
    );
  }, [allObservations, simT]);

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background text-on-surface-variant font-mono text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
          <span>INITIALIZING AURORA SPATIAL TELEMETRY...</span>
        </div>
      </div>
    );
  }

  const currentScenarioDef = SCENARIOS[scenario];
  const pulses = currentScenarioDef?.pulses || [];

  return (
    <div className="relative w-full h-full flex-1">
      <MapContainer
        center={DEFAULT_MAP_VIEW.center}
        zoom={DEFAULT_MAP_VIEW.zoom}
        minZoom={DEFAULT_MAP_VIEW.minZoom}
        maxZoom={DEFAULT_MAP_VIEW.maxZoom}
        className={`w-full h-full z-0 ${
          activeProvider.type === "none" ? "basemap-none" : ""
        }`}
        zoomControl={false}
      >
        <MapResizeWatcher />

        {/* Free, keyless basemap tile layer with automatic fallback */}
        {activeProvider.type !== "none" && activeProvider.url && (
          <TileLayer
            key={activeProvider.id}
            attribution={activeProvider.attribution}
            url={activeProvider.url}
            maxZoom={activeProvider.maxZoom || 19}
            className="basemap-dark"
            eventHandlers={{
              tileerror: handleTileError,
            }}
          />
        )}

        {/* Rain radar soft circles */}
        {showHeatmap &&
          pulses.map((pulse, idx) => {
            const timeDiff = Math.abs(simT - pulse.peakHour);
            const intensityRatio = Math.max(
              0,
              1 - timeDiff / (pulse.durationHours / 1.5)
            );
            if (intensityRatio <= 0.05) return null;

            return (
              <Circle
                key={`pulse-${idx}`}
                center={[pulse.centerLat, pulse.centerLng]}
                radius={pulse.radiusKm * 1000 * (0.8 + 0.2 * intensityRatio)}
                pathOptions={{
                  color: "#14f1d9",
                  fillColor: "#00695e",
                  fillOpacity: 0.18 * intensityRatio,
                  weight: 1,
                  dashArray: "4, 6",
                }}
              />
            );
          })}

        {/* Satellite Flood Polygons (Cyan dashed overlay) */}
        {detectionLayers.satelliteFlood &&
          satellitePolygons.map((poly) => {
            const ring = poly.coordinates[0] || [];
            const latLngs: [number, number][] = ring.map(([lng, lat]) => [
              lat,
              lng,
            ]);
            return (
              <Polygon
                key={poly.id}
                positions={latLngs}
                pathOptions={{
                  color: "#00e5ff",
                  fillColor: "#00e5ff",
                  fillOpacity: 0.22,
                  dashArray: "4, 6",
                  weight: 2,
                }}
              >
                <Popup className="dark-popup">
                  <div className="p-2 font-mono text-xs text-on-surface space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-cyan-400">
                      <Satellite className="w-3.5 h-3.5" />
                      <span>SATELLITE SAR WATER EXTENT</span>
                    </div>
                    <div className="text-[10px] text-on-surface-variant">
                      Pass Time: t={poly.passT}h • Correlated: {poly.edgeIds?.join(", ")}
                    </div>
                    <div className="text-[10px] text-cyan-200">
                      High dielectric backscatter consistent with open surface inundation.
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

        {/* Original baseline route (dashed grey) */}
        {truckOriginalPolyline && truckOriginalPolyline.length > 1 && (
          <Polyline
            positions={truckOriginalPolyline}
            pathOptions={{
              color: "#849490",
              weight: 5,
              dashArray: "6, 8",
              opacity: 0.8,
            }}
          />
        )}

        {/* Active route (solid glowing cyan/teal) */}
        {truckActivePolyline && truckActivePolyline.length > 1 && (
          <Polyline
            positions={truckActivePolyline}
            pathOptions={{
              color: "#14f1d9",
              weight: 6,
              opacity: 0.95,
            }}
          />
        )}

        {/* Dynamic camera pan & zoom controller for regional division */}
        <RegionCameraController region={selectedRegion} />

        {/* Dynamic camera focus controller for "Locate on Map" */}
        <TruckFocusController />

        {/* Live Truck Focus Radar Ping & Circle (Visible in Control Room & Driver Cockpit) */}
        {trackingTarget && (
          <>
            <Circle
              key={`focus-ring-${trackingTarget.code}-${trackingTarget.lat}-${trackingTarget.lng}`}
              center={[trackingTarget.lat, trackingTarget.lng]}
              radius={18000}
              pathOptions={{
                color: "#10b981",
                fillColor: "#059669",
                fillOpacity: 0.22,
                weight: 2.5,
                dashArray: "5, 6",
              }}
            />
            <Marker
              key={`focus-marker-${trackingTarget.code}-${trackingTarget.lat}-${trackingTarget.lng}`}
              position={[trackingTarget.lat, trackingTarget.lng]}
              icon={L.divIcon({
                className: "custom-truck-locator-ping",
                html: `
                  <div style="
                    position: relative;
                    transform: translate(-50%, -100%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    pointer-events: none;
                    filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
                  ">
                    <div style="
                      background: #059669;
                      color: #ffffff;
                      padding: 4px 10px;
                      border-radius: 9999px;
                      font-family: 'JetBrains Mono', monospace;
                      font-size: 11px;
                      font-weight: 800;
                      letter-spacing: 0.5px;
                      white-space: nowrap;
                      border: 2px solid #ffffff;
                      display: flex;
                      align-items: center;
                      gap: 4px;
                    ">
                      <span class="material-symbols-outlined" style="font-size: 14px;">gps_fixed</span>
                      <span>LOC: ${trackingTarget.code}</span>
                    </div>
                    <div style="
                      width: 0;
                      height: 0;
                      border-left: 6px solid transparent;
                      border-right: 6px solid transparent;
                      border-top: 7px solid #059669;
                    "></div>
                  </div>
                `,
                iconSize: [0, 0],
              })}
            />
          </>
        )}

        {/* Road network edges */}
        {visibleEdges.map((edge) => {
          const data = edgeAssessments.get(edge.id);
          const assessment = data?.assessment;
          const forecast = data?.forecast || [];
          if (!assessment) return null;

          const roadStatus = roadStatusMap?.get(edge.id);
          const isSelected = selectedEdgeId === edge.id;
          const isClosed = assessment.isClosed || roadStatus?.state === "confirmed";

          // Inner Forecast Color (Calm Logistics Semantic Spectrum)
          let innerColor = "#10b981"; // Safe: Emerald (<25)
          if (isClosed) {
            innerColor = "#ba1a1a"; // Closed: Deep Red (Physical Blockage)
          } else if (assessment.level === "severe") {
            innerColor = "#ea580c"; // Severe: Burnt Orange (Caution/Extreme Weather, Open)
          } else if (assessment.level === "high") {
            innerColor = "#e0a100"; // High: Amber
          } else if (assessment.level === "moderate") {
            innerColor = "#3b82f6"; // Moderate: Blue
          }

          const baseWeight = isSelected ? 6 : edge.terrain === "ghat" ? 4 : 3;

          // Fused Ring / Halo casing (Outer polyline behind inner line)
          let haloColor: string | null = null;
          let haloWeight = baseWeight + 4;
          let isHaloPulse = false;

          if (detectionLayers.fusedRings && roadStatus) {
            if (roadStatus.state === "confirmed") {
              haloColor = "#ba1a1a";
              haloWeight = baseWeight + 5;
              isHaloPulse = true;
            } else if (roadStatus.state === "probable") {
              haloColor = "#e8590c";
              haloWeight = baseWeight + 4;
            } else if (roadStatus.state === "watch") {
              haloColor = "#e0a100";
              haloWeight = baseWeight + 3;
            }
          }

          return (
            <React.Fragment key={edge.id}>
              {/* Outer Fused Halo / Detection Casing */}
              {haloColor && (
                <Polyline
                  positions={edge.path}
                  pathOptions={{
                    color: haloColor,
                    weight: haloWeight,
                    opacity: 0.5,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
              )}

              {/* Inner Road Polyline (Hydrological Prediction Color) */}
              <Polyline
                positions={edge.path}
                pathOptions={{
                  color: innerColor,
                  weight: baseWeight,
                  opacity: 0.95,
                  dashArray: isClosed ? "6, 4" : undefined,
                  lineCap: "round",
                  lineJoin: "round",
                }}
                eventHandlers={{
                  click: () => onSelectEdge(edge.id),
                }}
              >
                <Popup className="clean-popup">
                  <RoadPopup
                    edge={edge}
                    assessment={assessment}
                    forecast24h={forecast}
                    roadStatus={roadStatus}
                    simT={simT}
                  />
                </Popup>
              </Polyline>
            </React.Fragment>
          );
        })}

        {/* ============================================================== */}
        {/* RECOMMENDED ALTERNATE OVERLAY LAYER (PAINTED ON TOP OF EDGES)  */}
        {/* ============================================================== */}
        {showRecommendedAlternate && recommendedAlternate && (
          <>
            {/* Blocked Original Route Segment (High-Contrast Dashed Deep Red #DC2626) */}
            {recommendedAlternate.blockedEdge && (
              <>
                <Polyline
                  positions={recommendedAlternate.blockedEdge.path}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 6.5,
                    opacity: 0.95,
                    lineCap: "round",
                  }}
                />
                <Polyline
                  positions={recommendedAlternate.blockedEdge.path}
                  pathOptions={{
                    color: "#dc2626",
                    weight: 4.5,
                    dashArray: "7, 5",
                    opacity: 1,
                    lineCap: "round",
                  }}
                />
                {recommendedAlternate.blockedMid && (
                  <Marker
                    position={recommendedAlternate.blockedMid}
                    icon={L.divIcon({
                      className: "custom-div-icon",
                      html: `
                        <div style="
                          display: flex;
                          flex-direction: column;
                          align-items: center;
                          pointer-events: none;
                          transform: translate(-50%, -50%);
                          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35));
                        ">
                          <div style="
                            background: #dc2626;
                            color: #ffffff;
                            border-radius: 5px 5px 0 0;
                            padding: 3px 10px;
                            font-family: 'JetBrains Mono', monospace;
                            font-size: 10px;
                            font-weight: 800;
                            letter-spacing: 0.8px;
                            text-transform: uppercase;
                            display: flex;
                            align-items: center;
                            gap: 4.5px;
                            border-bottom: 1px solid rgba(255,255,255,0.3);
                            white-space: nowrap;
                          ">
                            <span class="material-symbols-outlined" style="font-size: 13px;">block</span>
                            <span>BLOCKED ROUTE</span>
                          </div>
                          <div style="
                            background: #7f1d1d;
                            color: #fef2f2;
                            border-radius: 0 0 5px 5px;
                            padding: 4px 10px;
                            font-family: 'JetBrains Mono', monospace;
                            font-size: 11px;
                            font-weight: 600;
                            white-space: nowrap;
                          ">
                            <span>${recommendedAlternate.blockedEdge.name} (${recommendedAlternate.riskScore}% risk)</span>
                          </div>
                        </div>
                      `,
                      iconSize: [0, 0],
                    })}
                  />
                )}
              </>
            )}

            {/* Recommended Alternate Polyline: 1) High-Contrast White Casing */}
            <Polyline
              positions={recommendedAlternate.polyline}
              pathOptions={{
                color: "#ffffff",
                weight: 8,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            {/* Recommended Alternate Polyline: 2) Vibrant Calm Logistics Sea-Green */}
            <Polyline
              positions={recommendedAlternate.polyline}
              pathOptions={{
                color: "#059669",
                weight: 5.5,
                opacity: 1,
                lineCap: "round",
                lineJoin: "round",
              }}
            />

            {/* HTML Overlaid Badge: In above of alternate route, explicitly mention that THIS IS ALTERNATE ROUTE */}
            {recommendedAlternate.midPoint && (
              <Marker
                position={recommendedAlternate.midPoint}
                icon={L.divIcon({
                  className: "custom-div-icon",
                  html: `
                    <div style="
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      pointer-events: none;
                      transform: translate(-50%, -50%);
                      filter: drop-shadow(0 4px 10px rgba(0,0,0,0.35));
                    ">
                      <!-- Above badge: Explicitly mentions that this is alternate route -->
                      <div style="
                        background: #059669;
                        color: #ffffff;
                        border-radius: 5px 5px 0 0;
                        padding: 3px 10px;
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 10px;
                        font-weight: 800;
                        letter-spacing: 0.8px;
                        text-transform: uppercase;
                        display: flex;
                        align-items: center;
                        gap: 4.5px;
                        border-bottom: 1px solid rgba(255,255,255,0.3);
                        white-space: nowrap;
                      ">
                        <span class="material-symbols-outlined" style="font-size: 13px;">alt_route</span>
                        <span>THIS IS ALTERNATE ROUTE</span>
                      </div>
                      
                      <!-- Route Details & Metrics -->
                      <div style="
                        background: #064e3b;
                        color: #ecfdf5;
                        border-radius: 0 0 5px 5px;
                        padding: 4px 10px;
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 11px;
                        font-weight: 600;
                        white-space: nowrap;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                      ">
                        <span style="color: ${recommendedAlternate.risk < 50 ? '#6ee7b7' : '#fcd34d'}; font-weight: 700;">
                          ${recommendedAlternate.risk < 50 ? 'Safe corridor:' : 'Alternate bypass:'}
                        </span>
                        <span>${recommendedAlternate.summary || "Via Madikeri"} (+${recommendedAlternate.extraMinutes}m • ${recommendedAlternate.risk}% risk)</span>
                      </div>
                    </div>
                  `,
                  iconSize: [0, 0],
                })}
              />
            )}
          </>
        )}

        {/* Stalled Fleet Probes Cluster Markers */}
        {detectionLayers.stalledProbes &&
          activeProbes.map((probe, idx) => {
            const edge = EDGES.find((e) => e.id === probe.edgeId);
            if (!edge || !visibleEdgeIds.has(edge.id)) return null;
            const mid = getEdgeMidpoint(edge);

            const probeIcon = L.divIcon({
              className: "custom-probe-marker",
              html: `
                <div class="flex items-center -translate-x-1/2 -translate-y-1/2 cursor-pointer pointer-events-auto">
                  <div class="relative flex items-center justify-center">
                    <div class="w-7 h-7 rounded-full bg-amber-500/20 animate-ping absolute"></div>
                    <div class="w-6 h-6 rounded-full bg-amber-950 border-2 border-amber-400 shadow-[0_0_12px_#ff8a3d] flex items-center justify-center text-amber-300 font-mono text-[9px] font-bold">
                      ${probe.stalledProbeCount}
                    </div>
                  </div>
                  <div class="ml-1 px-1.5 py-0.5 rounded bg-surface-container-lowest/90 border border-amber-500/30 text-[8px] font-mono text-amber-300 whitespace-nowrap shadow-md">
                    ${probe.avgSpeedKmh.toFixed(0)} km/h
                  </div>
                </div>
              `,
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            });

            return (
              <Marker key={`probe-${idx}`} position={mid} icon={probeIcon}>
                <Popup className="dark-popup">
                  <div className="p-2 font-mono text-xs space-y-1 text-on-surface">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <Truck className="w-3.5 h-3.5" />
                      <span>STALLED PROBE ANOMALY</span>
                    </div>
                    <div>Corridor: {edge.name}</div>
                    <div className="text-[10px] text-on-surface-variant">
                      {probe.stalledProbeCount} commercial trucks stalled (&lt;15% speed)
                    </div>
                    <div className="text-[10px] text-amber-200">
                      Duration: {probe.durationMinutes} min • Avg Speed: {probe.avgSpeedKmh.toFixed(1)} km/h
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* IoT Road Sensors Markers */}
        {detectionLayers.roadSensors &&
          activeSensors.map((reading, idx) => {
            const edge = EDGES.find((e) => e.id === reading.edgeId);
            if (!edge || !visibleEdgeIds.has(edge.id)) return null;
            const mid = getEdgeMidpoint(edge);
            // Offset slightly to not collide with road midpoint
            const latOffset = (idx % 2 === 0 ? 0.02 : -0.02);
            const lngOffset = (idx % 2 === 0 ? 0.02 : -0.02);
            const pos: [number, number] = [mid[0] + latOffset, mid[1] + lngOffset];

            const isAlert = reading.isAnomaly;
            const sensorIcon = L.divIcon({
              className: "custom-sensor-marker",
              html: `
                <div class="flex items-center -translate-x-1/2 -translate-y-1/2 cursor-pointer pointer-events-auto">
                  <div class="w-6 h-6 rounded-lg ${
                    isAlert
                      ? "bg-rose-950 border-2 border-rose-500 shadow-[0_0_12px_#ff0055] animate-pulse"
                      : "bg-surface-container-high border border-emerald-500/50"
                  } flex items-center justify-center text-xs">
                    ${reading.sensorType === "inclinometer" ? "📐" : "🌊"}
                  </div>
                  <div class="ml-1 px-1.5 py-0.5 rounded bg-surface-container-lowest/90 border border-white/10 text-[8px] font-mono ${
                    isAlert ? "text-rose-400 font-bold" : "text-emerald-400"
                  } whitespace-nowrap shadow-md">
                    ${reading.value.toFixed(1)} ${reading.unit}
                  </div>
                </div>
              `,
              iconSize: [26, 26],
              iconAnchor: [13, 13],
            });

            return (
              <Marker key={`sensor-${idx}`} position={pos} icon={sensorIcon}>
                <Popup className="dark-popup">
                  <div className="p-2 font-mono text-xs space-y-1 text-on-surface">
                    <div className="flex items-center gap-1.5 text-primary font-bold">
                      <Radio className="w-3.5 h-3.5" />
                      <span>IOT ROADSIDE ARRAY: {reading.sensorType.toUpperCase()}</span>
                    </div>
                    <div>Corridor: {edge.name}</div>
                    <div className="text-[10px] text-on-surface-variant">
                      Telemetry: {reading.value.toFixed(1)} {reading.unit} (z-score: {reading.zScore.toFixed(1)})
                    </div>
                    <div className="text-[10px] font-bold">
                      Status:{" "}
                      <span className={isAlert ? "text-rose-400" : "text-emerald-400"}>
                        {isAlert ? "CRITICAL ANOMALY BREACH" : "NOMINAL SENSING"}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Fixed CCTV Cameras Markers */}
        {detectionLayers.cameras &&
          FIXED_CAMERA_EDGES.map((camEdgeId) => {
            if (!visibleEdgeIds.has(camEdgeId)) return null;
            const edge = EDGES.find((e) => e.id === camEdgeId);
            if (!edge) return null;
            const mid = getEdgeMidpoint(edge);

            const camIcon = L.divIcon({
              className: "custom-cam-marker",
              html: `
                <div class="w-6 h-6 rounded-full bg-purple-950 border-2 border-purple-400 shadow-[0_0_12px_#7c5cff] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-purple-200 cursor-pointer pointer-events-auto">
                  <span class="text-[10px]">📷</span>
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            });

            return (
              <Marker key={`cam-${camEdgeId}`} position={mid} icon={camIcon}>
                <Popup className="dark-popup">
                  <div className="p-2 font-mono text-xs space-y-1 text-on-surface">
                    <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                      <Camera className="w-3.5 h-3.5" />
                      <span>CCTV OPTICAL VISION AI</span>
                    </div>
                    <div>Corridor: {edge.name}</div>
                    <div className="text-[10px] text-on-surface-variant">
                      Camera: NHAI-OPTICAL-PASS-{camEdgeId}
                    </div>
                    <div className="text-[10px] text-purple-200">
                      Edge-inference classification live stream with debris and ponding analytics.
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Community & Citizen Report Pins */}
        {detectionLayers.reportPins &&
          activeReports.map((obs) => {
            const edge = EDGES.find((e) => e.id === obs.edgeId);
            if (!edge || !visibleEdgeIds.has(edge.id)) return null;
            const mid = getEdgeMidpoint(edge);

            const isPhoto = obs.sourceType === "photo_report";
            const reportIcon = L.divIcon({
              className: "custom-report-marker",
              html: `
                <div class="w-6 h-6 rounded-full ${
                  isPhoto ? "bg-teal-950 border-2 border-teal-400" : "bg-blue-950 border-2 border-blue-400"
                } shadow-lg -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-white cursor-pointer pointer-events-auto">
                  <span class="text-[10px]">${isPhoto ? "📸" : "💬"}</span>
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            });

            return (
              <Marker key={`report-${obs.id}`} position={mid} icon={reportIcon}>
                <Popup className="dark-popup">
                  <div className="p-2 font-mono text-xs space-y-1 text-on-surface">
                    <div className="flex items-center gap-1.5 text-teal-400 font-bold">
                      {isPhoto ? <Eye className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                      <span>{isPhoto ? "FIELD PHOTO REPORT" : "DISPATCH TEXT INTEL"}</span>
                    </div>
                    <div>Corridor: {edge.name}</div>
                    <div className="text-[10px] text-on-surface-variant">
                      Claim: <strong className="uppercase text-amber-300">{obs.claim}</strong> (Confidence: {Math.round(obs.confidence * 100)}%)
                    </div>
                    <div className="text-[10px] text-slate-300">{obs.details}</div>
                    <div className="text-[9px] text-slate-500">
                      Provenance: {obs.provenance} • Received t={obs.receivedAtT}h
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* City Nodes (strictly ~8 primary cities per region to keep map clean) */}
        {visibleNodes
          .filter((node) => REGION_PRIMARY_CITIES[selectedRegion]?.has(node.id) && Boolean(nodeIcons[node.id]))
          .map((node) => (
            <Marker
              key={node.id}
              position={[node.lat, node.lng]}
              icon={nodeIcons[node.id]}
            >
            <Popup className="dark-popup">
              <div className="p-2 text-xs font-mono text-on-surface">
                <div className="font-bold text-sm text-primary">
                  {node.name} [{node.id}]
                </div>
                <div className="text-on-surface-variant mt-1">
                  State: {node.state}
                </div>
                <div className="text-slate-500 text-[10px]">
                  Coord: {node.lat.toFixed(4)}°N, {node.lng.toFixed(4)}°E
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Dynamic Truck markers */}
        <TruckMarkers
          trucks={trucks}
          selectedCode={selectedShipmentCode}
          onSelectTruck={onSelectTruck}
        />

        {/* Reset Camera View Controller */}
        <div className="leaflet-top leaflet-right pointer-events-auto p-4 z-[1000] hidden sm:block">
          <ResetViewControl
            center={DEFAULT_MAP_VIEW.center}
            zoom={DEFAULT_MAP_VIEW.zoom}
          />
        </div>
      </MapContainer>

      {/* Floating Region Division Selector on Map */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 hidden md:flex items-center p-1 rounded-lg bg-surface-container-lowest/90 backdrop-blur-md border border-outline-variant shadow-lg pointer-events-auto">
        {(
          [
            { id: "all", label: "All India" },
            { id: "south", label: "South" },
            { id: "north", label: "North" },
            { id: "west", label: "West" },
            { id: "east", label: "East" },
          ] as const
        ).map((reg) => (
          <button
            key={reg.id}
            onClick={() => setSelectedRegion(reg.id)}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              selectedRegion === reg.id
                ? "bg-primary text-white shadow-xs"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <span>{reg.label}</span>
          </button>
        ))}
      </div>

      {/* Basemap Status Chip & Manual Cycle Button (Top Left) */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
        <button
          onClick={handleManualCycleProvider}
          className="group flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-surface-container-lowest/85 hover:bg-surface-container-high/90 backdrop-blur-md border border-white/10 text-[10px] font-mono text-on-surface-variant hover:text-on-surface transition-colors shadow-lg cursor-pointer"
          title="Click to cycle basemap provider (Debug / Judges)"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              activeProvider.type === "none" ? "bg-amber-400" : "bg-primary-container shadow-[0_0_8px_#14f1d9]"
            }`}
          />
          <span>
            Basemap: <span className="font-semibold text-primary">{activeProvider.name}</span>
          </span>
        </button>

        {activeProvider.type === "none" && (
          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-[9px]">
            Basemap offline, showing network only
          </span>
        )}
      </div>

      {/* Automatic Fallback Toast */}
      {toastMsg && (
        <div className="absolute top-14 left-4 z-30 px-3 py-1.5 rounded-lg bg-surface-container-highest/95 border border-primary-container/40 text-primary font-mono text-xs shadow-2xl backdrop-blur-md flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Floating Tactical Map Controls (Top Right: Single Risk Overlays Menu) */}
      <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-20 pointer-events-auto">
        <button
          onClick={() => setShowLayerMenu(!showLayerMenu)}
          className={`h-9 px-3 rounded bg-surface-container-lowest text-on-surface font-semibold text-xs shadow-sm flex items-center gap-1.5 hover:bg-surface-container-low transition-colors border border-outline-variant cursor-pointer ${
            showLayerMenu ? "bg-surface-container" : ""
          }`}
        >
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">layers</span>
          <span>Risk Overlays</span>
        </button>

        {/* Layer Selector Popover */}
        {showLayerMenu && (
          <div className="w-64 bg-surface-container-lowest p-3 rounded-lg shadow-xl border border-outline-variant space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-outline-variant pb-1.5 text-on-surface font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">layers</span>
                <span>Map Layers</span>
              </span>
              <span className="font-mono text-[10px] text-on-surface-variant">Telemetry</span>
            </div>

            <div className="space-y-1 text-on-surface-variant">
              {/* Fused Status Rings */}
              <button
                onClick={() => toggleDetectionLayer("fusedRings")}
                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-surface-container-low transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-error" />
                  <span>Fused status indicators</span>
                </span>
                {detectionLayers.fusedRings && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>

              {/* Satellite Flood Polygons */}
              <button
                onClick={() => toggleDetectionLayer("satelliteFlood")}
                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-surface-container-low transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Satellite className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Satellite flood SAR</span>
                </span>
                {detectionLayers.satelliteFlood && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>

              {/* Stalled Fleet Probes */}
              <button
                onClick={() => toggleDetectionLayer("stalledProbes")}
                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-surface-container-low transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Stalled probe clusters</span>
                </span>
                {detectionLayers.stalledProbes && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>

              {/* IoT Road Sensors */}
              <button
                onClick={() => toggleDetectionLayer("roadSensors")}
                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-surface-container-low transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-emerald-600" />
                  <span>IoT culvert & rain sensors</span>
                </span>
                {detectionLayers.roadSensors && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>

              {/* Fixed CCTV Cameras */}
              <button
                onClick={() => toggleDetectionLayer("cameras")}
                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-surface-container-low transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 text-purple-600" />
                  <span>Optical pass cameras</span>
                </span>
                {detectionLayers.cameras && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>

              {/* Field & Citizen Reports */}
              <button
                onClick={() => toggleDetectionLayer("reportPins")}
                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-surface-container-low transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>Field & incident reports</span>
                </span>
                {detectionLayers.reportPins && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>

              {/* Recommended Alternate Corridor */}
              <button
                onClick={toggleRecommendedAlternate}
                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-surface-container-low transition cursor-pointer border-t border-outline-variant pt-1.5"
              >
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-tertiary" />
                  <span className="text-tertiary font-semibold">Recommended alternate</span>
                </span>
                {showRecommendedAlternate && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom-Left Map Legend (5-tier risk spectrum) */}
      <div className="absolute bottom-16 left-4 z-10 bg-surface-container-lowest rounded-lg p-3 shadow-md border border-outline-variant space-y-2 text-xs hidden sm:block pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="w-6 h-1 bg-[#10b981] rounded-full"></div>
          <span className="text-on-surface font-medium">Recommended alternate route</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 border-t-2 border-dashed border-[#ba1a1a]"></div>
          <span className="text-on-surface font-medium">Blocked road (flooding / slide)</span>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-outline-variant text-[11px] text-on-surface-variant font-medium flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#10b981]"></span> Low (&lt;25)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span> Moderate (25-49)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#e0a100]"></span> High (50-74)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#ea580c]"></span> Severe (75-84)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#ba1a1a]"></span> Blocked (&ge;85)
          </span>
        </div>
      </div>

      {/* Bottom-Right Zoom Controls */}
      <div className="absolute bottom-16 right-4 z-10 flex flex-col rounded-md shadow-md bg-surface-container-lowest border border-outline-variant overflow-hidden pointer-events-auto">
        <button
          onClick={() => {
            const map = (window as unknown as { __leaflet_map?: L.Map }).__leaflet_map;
            map?.zoomIn();
          }}
          className="w-9 h-9 flex items-center justify-center text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
          title="Zoom in"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
        </button>
        <button
          onClick={() => {
            const map = (window as unknown as { __leaflet_map?: L.Map }).__leaflet_map;
            map?.zoomOut();
          }}
          className="w-9 h-9 flex items-center justify-center text-on-surface hover:bg-surface-container-low transition-colors border-t border-outline-variant cursor-pointer"
          title="Zoom out"
        >
          <span className="material-symbols-outlined text-[18px]">remove</span>
        </button>
      </div>
    </div>
  );
}
