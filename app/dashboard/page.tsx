"use client";

import React, { useMemo, useEffect } from "react";
import { ControlRoomHeader } from "@/components/ControlRoomHeader";
import { ControlRoomSidebar } from "@/components/ControlRoomSidebar";
import { ControlRoomDrawer } from "@/components/ControlRoomDrawer";
import { ControlRoomTimeBar } from "@/components/ControlRoomTimeBar";
import { Map } from "@/components/Map";
import { useSimStore } from "@/lib/store";
import { simulate } from "@/lib/sim/engine";
import { EDGES, NODES, RegionId, REGION_NAMES } from "@/lib/sim/network";
import { getAllSimulatedObservations } from "@/lib/detect";
import { OptimizerCompare } from "@/components/OptimizerCompare";

export default function DashboardPage() {
  const {
    scenario,
    simT,
    setSimT,
    mode,
    selectedRegion,
    setSelectedRegion,
    selectedShipmentCode,
    setSelectedShipment,
    selectedEdgeId,
    setSelectedEdge,
    selectedDecisionId,
    setSelectedDecision,
    enabledSources,
    userObservations,
    setTruckFocusTarget,
  } = useSimStore();

  // Pure deterministic simulation with multi-source detection & user observations
  const simResult = useMemo(() => {
    return simulate({
      scenario,
      mode,
      useDetection: true,
      enabledSources,
      observations: userObservations,
    });
  }, [scenario, mode, enabledSources, userObservations]);

  const currentHour = Math.min(72, Math.max(0, Math.floor(simT)));
  const trucks = useMemo(() => {
    return simResult.timeline.get(currentHour) || [];
  }, [simResult, currentHour]);

  // Multi-source simulated layer telemetry snapshot
  const detectionSnapshot = useMemo(() => {
    return getAllSimulatedObservations(scenario, EDGES, simT, enabledSources);
  }, [scenario, simT, enabledSources]);

  // Road status map at current hour
  const currentRoadStatusMap = useMemo(() => {
    return simResult.roadStatusByHour?.get(currentHour);
  }, [simResult, currentHour]);

  // Combined observations including user-submitted field reports
  const allCurrentObservations = useMemo(() => {
    return [...detectionSnapshot.observations, ...userObservations];
  }, [detectionSnapshot.observations, userObservations]);

  // Filter trucks by selectedRegion
  const visibleTrucks = useMemo(() => {
    if (selectedRegion === "all") return trucks;
    return trucks.filter((t) => {
      const originRegion = NODES[t.shipment.origin]?.region;
      const destRegion = NODES[t.shipment.destination]?.region;
      return originRegion === selectedRegion || destRegion === selectedRegion;
    });
  }, [trucks, selectedRegion]);

  // Filter decisions by selectedRegion
  const visibleDecisions = useMemo(() => {
    if (selectedRegion === "all") return simResult.decisions;
    const truckCodes = new Set(visibleTrucks.map((t) => t.code));
    return simResult.decisions.filter((d) => truckCodes.has(d.shipmentCode));
  }, [simResult.decisions, visibleTrucks, selectedRegion]);

  // Counts of trucks per regional division
  const regionCounts = useMemo(() => {
    const counts: Record<RegionId, number> = { all: trucks.length, south: 0, north: 0, west: 0, east: 0 };
    trucks.forEach((t) => {
      const r = NODES[t.shipment.origin]?.region || "south";
      if (counts[r] !== undefined) counts[r]++;
    });
    return counts;
  }, [trucks]);

  // Active decision for the drawer
  const activeDecision = useMemo(() => {
    if (selectedDecisionId) {
      const found = simResult.decisions.find((d) => d.id === selectedDecisionId);
      if (found) return found;
    }
    if (selectedShipmentCode) {
      return (
        simResult.decisions.find(
          (d) => d.shipmentCode === selectedShipmentCode && d.simT <= simT
        ) ||
        simResult.decisions.find((d) => d.shipmentCode === selectedShipmentCode) ||
        null
      );
    }
    return null;
  }, [selectedDecisionId, selectedShipmentCode, simResult.decisions, simT]);

  // Select first truck of the region if current selection not in visible trucks
  useEffect(() => {
    if (visibleTrucks.length > 0) {
      const isSelectedInRegion = visibleTrucks.some((t) => t.code === selectedShipmentCode);
      if (!isSelectedInRegion) {
        const first = visibleTrucks[0];
        setSelectedShipment(first.code);
        const truckDec = simResult.decisions.find((d) => d.shipmentCode === first.code);
        setSelectedDecision(truckDec ? truckDec.id : null);
        setTruckFocusTarget({
          lat: first.lat,
          lng: first.lng,
          zoom: 11,
          code: first.code,
          timestamp: Date.now(),
        });
      }
    } else {
      setSelectedShipment(null);
      setSelectedDecision(null);
      setTruckFocusTarget(null);
    }
  }, [selectedRegion]);

  // Synchronize live truck tracking beacon on the map
  useEffect(() => {
    if (selectedShipmentCode && trucks.length > 0) {
      const trk = trucks.find((t) => t.code === selectedShipmentCode);
      if (trk) {
        setTruckFocusTarget({
          lat: trk.lat,
          lng: trk.lng,
          zoom: 11,
          code: trk.code,
          timestamp: Date.now(),
        });
      }
    }
  }, [selectedShipmentCode, currentHour, trucks]);

  return (
    <div className="flex flex-col min-h-screen bg-surface font-body text-on-surface antialiased overflow-x-hidden">
      {/* 1. Header Navigation */}
      <ControlRoomHeader />

      {/* 2. Main Content Container */}
      <main className="w-full pt-14 bg-surface max-w-[1440px] mx-auto min-h-screen flex flex-col">
        {/* Regional Division Selector Bar */}
        <div className="w-full bg-surface-container-lowest border-b border-outline-variant px-4 py-2 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5 mr-1 whitespace-nowrap">
              <span className="material-symbols-outlined text-[16px] text-primary">public</span>
              Regional Division:
            </span>
            <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-lg border border-outline-variant">
              {(
                [
                  { id: "all", label: "All India", badge: regionCounts.all },
                  { id: "south", label: "South India", badge: regionCounts.south },
                  { id: "north", label: "North India", badge: regionCounts.north },
                  { id: "west", label: "West India", badge: regionCounts.west },
                  { id: "east", label: "East India", badge: regionCounts.east },
                ] as const
              ).map((reg) => (
                <button
                  key={reg.id}
                  onClick={() => setSelectedRegion(reg.id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    selectedRegion === reg.id
                      ? "bg-primary text-white font-semibold shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <span>{reg.label}</span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                      selectedRegion === reg.id
                        ? "bg-white/25 text-white"
                        : "bg-surface-container-highest text-on-surface-variant"
                    }`}
                  >
                    {reg.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-on-surface-variant font-mono">
            <OptimizerCompare scenario={scenario} simT={simT} />
            <span>
              Showing: <strong className="text-primary uppercase font-bold">{REGION_NAMES[selectedRegion]}</strong>
            </span>
          </div>
        </div>

        {/* Layout Wrapper: Inner canvas */}
        <div className="flex w-full h-[calc(100vh-104px)] overflow-hidden bg-surface relative">
          {/* Left Panel: 360px Sidebar */}
          <ControlRoomSidebar
            trucks={visibleTrucks}
            decisions={visibleDecisions}
            selectedShipmentCode={selectedShipmentCode}
            onSelectShipment={(code) => {
              setSelectedShipment(code);
              const truckDec = simResult.decisions.find((d) => d.shipmentCode === code);
              if (truckDec) {
                setSelectedDecision(truckDec.id);
              } else {
                setSelectedDecision(null);
              }
            }}
            simT={simT}
          />

          {/* Central GIS Map Canvas */}
          <main className="flex-1 relative h-full bg-[#E5ECF2] overflow-hidden">
            <Map
              scenario={scenario}
              simT={simT}
              selectedEdgeId={selectedEdgeId}
              onSelectEdge={setSelectedEdge}
              trucks={visibleTrucks}
              selectedShipmentCode={selectedShipmentCode}
              onSelectTruck={(code) => {
                setSelectedShipment(code);
                if (code) {
                  const trk = visibleTrucks.find((t) => t.code === code);
                  if (trk) {
                    setTruckFocusTarget({
                      lat: trk.lat,
                      lng: trk.lng,
                      zoom: 11,
                      code: trk.code,
                      timestamp: Date.now(),
                    });
                  }
                  const truckDec = simResult.decisions.find((d) => d.shipmentCode === code);
                  if (truckDec) {
                    setSelectedDecision(truckDec.id);
                  }
                }
              }}
              roadStatusMap={currentRoadStatusMap}
              satellitePolygons={detectionSnapshot.satellitePolygons}
              probeClusters={detectionSnapshot.probeClusters}
              sensorReadings={detectionSnapshot.sensorReadings}
              allObservations={allCurrentObservations}
              decisions={visibleDecisions}
            />

            {/* Right Slide-over Detail Panel */}
            {selectedShipmentCode && (
              <ControlRoomDrawer
                shipmentCode={selectedShipmentCode}
                truckSnapshot={visibleTrucks.find((t) => t.code === selectedShipmentCode)}
                decision={activeDecision}
                onClose={() => {
                  setSelectedShipment(null);
                  setSelectedDecision(null);
                }}
                scenario={scenario}
                simT={simT}
              />
            )}

            {/* Bottom Fixed 48px Time Bar */}
            <ControlRoomTimeBar />
          </main>
        </div>
      </main>
    </div>
  );
}
