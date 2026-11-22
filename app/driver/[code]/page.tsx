"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { simulate } from "@/lib/sim/engine";
import { ScenarioId, SCENARIOS } from "@/lib/sim/scenarios";
import { SEEDED_SHIPMENTS } from "@/lib/sim/shipments";
import { NODES, EDGES, RegionId, REGION_NAMES } from "@/lib/sim/network";
import { Map } from "@/components/Map";
import { useSimStore } from "@/lib/store";
import { getAllSimulatedObservations } from "@/lib/detect";
import {
  getLanguagesForZone,
  getDefaultLanguageForTruck,
  getLocalizedHeadline,
  getLocalizedAudibleAlert,
  TRANSLATIONS,
  SupportedLanguage,
} from "@/lib/i18n";

export default function DriverTerminalPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const code = (params?.code as string) || "TRK-001";
  const scenario = (searchParams.get("scenario") as ScenarioId) || "kerala-2018";
  const queryT = searchParams.get("t");

  const {
    simT,
    setSimT,
    advanceSimT,
    isPlaying,
    togglePlay,
    enabledSources,
    userObservations,
    selectedEdgeId,
    setSelectedEdge,
    setSelectedRegion,
    setTruckFocusTarget,
    language,
    setLanguage,
  } = useSimStore();

  // If initial URL has query `t`, synchronize with store
  useEffect(() => {
    if (queryT) {
      const parsed = parseFloat(queryT);
      if (!isNaN(parsed) && Math.abs(parsed - simT) > 0.05) {
        setSimT(parsed);
      }
    }
  }, [queryT]);

  // Active Playback Simulation Timer (Moves trucks synchronously across portal and control room)
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      advanceSimT(0.25);
    }, 333);
    return () => clearInterval(timer);
  }, [isPlaying, advanceSimT]);

  const currentHour = Math.min(72, Math.max(0, Math.floor(simT)));

  const [acknowledged, setAcknowledged] = useState(false);
  const [ackTime, setAckTime] = useState<string>("14:14");

  // Run full simulation with multi-source evidence
  const simResult = useMemo(() => {
    return simulate({
      scenario,
      mode: "agent",
      useDetection: true,
      enabledSources,
      observations: userObservations,
    });
  }, [scenario, enabledSources, userObservations]);

  const shipment = useMemo(() => {
    return SEEDED_SHIPMENTS.find((s) => s.code === code) || SEEDED_SHIPMENTS[0];
  }, [code]);

  const originNode = NODES[shipment.origin];
  const originRegion: RegionId = originNode?.region || shipment.region || "south";
  const availableLanguages = useMemo(() => getLanguagesForZone(originRegion), [originRegion]);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Auto-adapt driver language based on vehicle state/division on truck change
  useEffect(() => {
    if (shipment) {
      const defaultLang = getDefaultLanguageForTruck(originNode?.state, originRegion);
      const isCurrentLangInZone = availableLanguages.some((l) => l.id === language);
      if (!isCurrentLangInZone || language === "en") {
        setLanguage(defaultLang);
      }
    }
  }, [code, originRegion]);

  const trucks = useMemo(() => {
    return simResult.timeline.get(currentHour) || [];
  }, [simResult, currentHour]);

  const truckSnapshot = useMemo(() => {
    return trucks.find((tr) => tr.code === code);
  }, [trucks, code]);

  const decision = useMemo(() => {
    return (
      simResult.decisions
        .filter((d) => d.shipmentCode === code && d.simT <= simT)
        .sort((a, b) => b.simT - a.simT)[0] ||
      simResult.decisions.find(
        (d) => d.shipmentCode === code && d.decision === "REROUTE"
      )
    );
  }, [simResult.decisions, code, simT]);

  // Simulated detection telemetry at current hour
  const detectionSnapshot = useMemo(() => {
    return getAllSimulatedObservations(scenario, EDGES, simT, enabledSources);
  }, [scenario, simT, enabledSources]);

  const currentRoadStatusMap = useMemo(() => {
    return simResult.roadStatusByHour?.get(currentHour);
  }, [simResult, currentHour]);

  const allObservations = useMemo(() => {
    return [...detectionSnapshot.observations, ...userObservations];
  }, [detectionSnapshot.observations, userObservations]);

  // Center on truck when page loads or code changes
  useEffect(() => {
    if (truckSnapshot) {
      setTruckFocusTarget({
        lat: truckSnapshot.lat,
        lng: truckSnapshot.lng,
        zoom: 11,
        code: truckSnapshot.code,
        timestamp: Date.now(),
      });
      const originReg = NODES[truckSnapshot.shipment.origin]?.region;
      if (originReg) {
        setSelectedRegion(originReg);
      }
    }
  }, [code, truckSnapshot?.lat, truckSnapshot?.lng]);

  const handleAcknowledge = () => {
    setAcknowledged(true);
    const now = new Date();
    setAckTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  };

  const handleCenterOnTruck = () => {
    if (truckSnapshot) {
      setTruckFocusTarget({
        lat: truckSnapshot.lat,
        lng: truckSnapshot.lng,
        zoom: 11,
        code: truckSnapshot.code,
        timestamp: Date.now(),
      });
    }
  };

  const activeRoutePoly = useMemo(() => {
    return (
      decision?.alternateRoute?.polyline ||
      truckSnapshot?.activeRoute?.polyline ||
      undefined
    );
  }, [decision, truckSnapshot]);

  const originalRoutePoly = useMemo(() => {
    return truckSnapshot?.originalRoute?.polyline || undefined;
  }, [truckSnapshot]);

  const isRerouted = decision?.decision === "REROUTE";
  const isEscalated = decision?.decision === "ESCALATE" || truckSnapshot?.status === "escalated";
  const isHeld = decision?.decision === "HOLD" || truckSnapshot?.status === "held";

  const nextWaypointNode = truckSnapshot
    ? truckSnapshot.activeRoute.nodes[truckSnapshot.currentEdgeIndex + 1] ||
      truckSnapshot.shipment.destination
    : shipment.destination;

  const nextWaypointName = NODES[nextWaypointNode]?.name || nextWaypointNode;
  const originName = NODES[shipment.origin]?.name || shipment.origin;
  const destName = NODES[shipment.destination]?.name || shipment.destination;

  // Transit progress
  const totalEdges = truckSnapshot?.activeRoute?.edges?.length || 1;
  const progressPercent = truckSnapshot
    ? Math.min(
        100,
        Math.max(
          5,
          Math.round(
            ((truckSnapshot.currentEdgeIndex + truckSnapshot.fractionOnEdge) / totalEdges) * 100
          )
        )
      )
    : 15;

  const currentEdgeObj = truckSnapshot?.currentEdgeId
    ? EDGES.find((e) => e.id === truckSnapshot.currentEdgeId)
    : null;
  const currentLegName = currentEdgeObj
    ? currentEdgeObj.name
    : truckSnapshot?.status === "delivered"
    ? "Arrived at Destination"
    : `${originName} Terminal Interchange`;

  const rawHeadline = isRerouted
    ? decision?.alternateRouteSummary?.includes("Madikeri")
      ? "Take the Mysuru / Madikeri Route (SH88)"
      : `Divert via ${decision?.alternateRouteSummary || "Safe Alternate Pass"}`
    : isEscalated
    ? "Corridor Impassable Ahead: Standby for Dispatch Clearance"
    : isHeld
    ? "Hazard Precaution: Hold at Safe Interchange Node"
    : "Proceed along Primary Assigned Corridor";

  const instructionHeadline = getLocalizedHeadline(
    rawHeadline,
    language,
    isRerouted,
    decision?.alternateRouteSummary,
    isEscalated
  );

  const instructionExplanation =
    decision?.explanation ||
    (isRerouted
      ? `${decision?.roadName || "Current Corridor"} is projected impassable from flash flood runoff. Autonomous routing diverted convoy via safe alternate pass (+${decision?.extraMinutes || 65} min).`
      : isEscalated
      ? `All candidate corridors to ${destName} are impassable due to monsoon flooding. Pull over safely and await dispatcher clearance.`
      : isHeld
      ? `Severe hazard ahead on ${decision?.roadName || "corridor"}. Unit staged safely.`
      : "Corridor conditions clear. Standard transit schedule active.");

  const driverMessage = getLocalizedAudibleAlert(
    decision?.driverMessage || "",
    language,
    isRerouted,
    isEscalated
  );

  const etaHours = Math.floor(simT + (isRerouted ? 3 : 2));
  const etaMinutes = isRerouted ? 45 : 15;
  const etaFormatted = `${String(etaHours % 24).padStart(2, "0")}:${String(etaMinutes).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col p-2 sm:p-4 md:p-6 font-sans select-none antialiased">
      {/* Top Cockpit Header Bar */}
      <header className="w-full max-w-7xl mx-auto mb-3 flex flex-wrap items-center justify-between gap-3 bg-slate-800/90 border border-slate-700/80 rounded-xl px-4 py-2.5 shadow-md backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="h-8 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-600"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>{t.backToControlRoom}</span>
          </Link>

          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400">
              {t.liveInCabTerminal}
            </span>
          </div>
        </div>

        {/* Center: Zone-Specific Language Selector Strip */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700">
          <span className="material-symbols-outlined text-primary text-[15px] px-1">translate</span>
          {availableLanguages.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLanguage(l.id)}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                language === l.id
                  ? "bg-primary text-white shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
              title={`${l.name} (${l.nativeName})`}
            >
              {l.nativeName}
            </button>
          ))}
        </div>

        {/* Quick Truck Selector Dropdown across All 4 Divisions */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 hidden md:inline">{t.selectTruck}:</span>
          <select
            value={code}
            onChange={(e) => {
              const newCode = e.target.value;
              router.push(`/driver/${newCode}?scenario=${scenario}&t=${simT}`);
            }}
            className="h-8 px-2.5 bg-slate-900 text-white font-mono text-xs font-bold rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <optgroup label="📍 SOUTH INDIA FLEET (10 TRUCKS)">
              {SEEDED_SHIPMENTS.filter((s) => s.region === "south").map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.driverName} ({s.cargo}, {s.origin}→{s.destination})
                </option>
              ))}
            </optgroup>
            <optgroup label="📍 NORTH INDIA FLEET (10 TRUCKS)">
              {SEEDED_SHIPMENTS.filter((s) => s.region === "north").map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.driverName} ({s.cargo}, {s.origin}→{s.destination})
                </option>
              ))}
            </optgroup>
            <optgroup label="📍 WEST INDIA FLEET (10 TRUCKS)">
              {SEEDED_SHIPMENTS.filter((s) => s.region === "west").map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.driverName} ({s.cargo}, {s.origin}→{s.destination})
                </option>
              ))}
            </optgroup>
            <optgroup label="📍 EAST INDIA FLEET (10 TRUCKS)">
              {SEEDED_SHIPMENTS.filter((s) => s.region === "east").map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.driverName} ({s.cargo}, {s.origin}→{s.destination})
                </option>
              ))}
            </optgroup>
          </select>

          <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-bold">
            4G LTE • GPS ACTIVE
          </span>
        </div>
      </header>

      {/* Main Cockpit Canvas (Responsive 2-Column Split: Real GIS Map + Driver HUD) */}
      <main className="w-full max-w-7xl mx-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* =================================================================== */}
        {/* LEFT COLUMN: REAL GIS MAP (AS SHOWN IN CONTROL ROOM) (7 COLS)       */}
        {/* =================================================================== */}
        <section className="lg:col-span-7 flex flex-col gap-2 relative min-h-[420px] lg:min-h-[640px] bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-xl">
          {/* Map Floating HUD Banner */}
          <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            <div className="pointer-events-auto bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-lg backdrop-blur-md flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <div className="font-mono text-xs">
                <span className="text-slate-400">GPS: </span>
                <span className="font-bold text-emerald-400">
                  {truckSnapshot?.lat.toFixed(4) || "12.8942"}°N, {truckSnapshot?.lng.toFixed(4) || "75.7831"}°E
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCenterOnTruck}
              className="pointer-events-auto h-8 px-3 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl shadow-lg border border-blue-400 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">my_location</span>
              <span>{t.reCenterTruck}</span>
            </button>
          </div>

          {/* REAL LEAFLET MAP (Exact GIS Map from Control Room) */}
          <div className="w-full h-full flex-1 relative rounded-2xl overflow-hidden">
            <Map
              className="w-full h-full min-h-[420px] lg:min-h-[640px]"
              scenario={scenario}
              simT={simT}
              selectedEdgeId={selectedEdgeId}
              onSelectEdge={setSelectedEdge}
              trucks={trucks}
              selectedShipmentCode={code}
              onSelectTruck={() => {}}
              activeRoutePolyline={activeRoutePoly}
              originalRoutePolyline={originalRoutePoly}
              roadStatusMap={currentRoadStatusMap}
              satellitePolygons={detectionSnapshot.satellitePolygons}
              probeClusters={detectionSnapshot.probeClusters}
              sensorReadings={detectionSnapshot.sensorReadings}
              allObservations={allObservations}
              decisions={simResult.decisions}
            />
          </div>

          {/* Bottom Map Status Strip */}
          <div className="p-2.5 bg-slate-950/95 border-t border-slate-700/80 flex flex-wrap items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="material-symbols-outlined text-primary text-[16px]">navigation</span>
              <span>{t.activeCorridor}: <strong className="text-white">{currentLegName}</strong></span>
            </div>
            <div className="text-slate-400 flex items-center gap-2">
              <span>{t.speed}: <strong className="text-emerald-400">{truckSnapshot?.isBlocked ? "0 km/h" : "55 km/h"}</strong></span>
              <span>•</span>
              <span>{t.heading}: <strong className="text-white">{destName}</strong></span>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* RIGHT COLUMN: DRIVER HUD & IN-CAB INSTRUMENT CLUSTER (5 COLS)       */}
        {/* =================================================================== */}
        <section className="lg:col-span-5 flex flex-col justify-between gap-3 bg-slate-800 rounded-2xl border border-slate-700 p-4 shadow-xl">
          <div className="flex flex-col gap-3">
            {/* Truck Identification Card */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/80 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-extrabold bg-primary text-white px-2.5 py-0.5 rounded-lg shadow-sm">
                    {code}
                  </span>
                  <span className="font-bold text-white text-[15px]">
                    {shipment.driverName}
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-400 mt-1">
                  {t.plate}: {shipment.truckPlate} • {t.division}: {REGION_NAMES[originRegion]}
                </div>
              </div>

              <span
                className={`px-2.5 py-1 text-xs font-extrabold uppercase rounded-lg border ${
                  isRerouted
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                    : isEscalated
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                    : isHeld
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/50"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                }`}
              >
                {isRerouted ? t.detourActive : isEscalated ? "ESCALATED" : isHeld ? t.held : t.onSchedule}
              </span>
            </div>

            {/* Directive Alert Banner */}
            <div
              className={`p-3.5 rounded-xl border-2 flex flex-col gap-1.5 ${
                isEscalated
                  ? "bg-rose-950/40 border-rose-500/80 text-rose-200"
                  : isRerouted
                  ? "bg-amber-950/40 border-amber-500/80 text-amber-200"
                  : "bg-emerald-950/30 border-emerald-500/60 text-emerald-200"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-400">
                <span className="material-symbols-outlined text-[18px]">
                  {isEscalated ? "warning" : isRerouted ? "alt_route" : "check_circle"}
                </span>
                <span>
                  {isEscalated
                    ? "DISPATCH ESCALATION DIRECTIVE"
                    : isRerouted
                    ? t.routeModificationDirective
                    : t.corridorOperational}
                </span>
              </div>

              <h2 className="text-xl font-black text-white leading-tight">
                {instructionHeadline}
              </h2>

              <p className="text-xs font-medium text-slate-300 leading-snug">
                {instructionExplanation}
              </p>

              <div className="mt-1.5 p-2 bg-slate-900/90 rounded-lg border border-slate-700 font-mono text-xs text-amber-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-amber-400">volume_up</span>
                <span>{driverMessage}</span>
              </div>
            </div>

            {/* Turn-by-Turn Waypoint Strip */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 uppercase font-bold">{t.nextInterchange}:</span>
                <span className="font-bold text-primary text-sm">{nextWaypointName} ({language === "en" ? "Ahead" : ""} 42 km)</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="text-[10px] uppercase font-bold text-slate-400">{t.remainingTime}</div>
                  <div className="font-mono text-lg font-black text-white">
                    {isRerouted ? "2h 45m" : "1h 40m"}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">
                    {isRerouted ? t.safeDetour : t.standardSpeed}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-800 rounded-lg border border-slate-700 flex flex-col justify-between">
                  <div className="text-[10px] uppercase font-bold text-slate-400">{t.expectedEta}</div>
                  <div className="font-mono text-lg font-black text-white">{etaFormatted}</div>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-mono">Sim: t={simT.toFixed(1)}h</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center text-[10px] transition-colors cursor-pointer"
                        title={isPlaying ? "Pause simulation" : "Play live simulation"}
                      >
                        <span className="material-symbols-outlined text-[12px]">{isPlaying ? "pause" : "play_arrow"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => advanceSimT(1)}
                        className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center text-[10px] transition-colors cursor-pointer"
                        title="Advance 1 hour"
                      >
                        <span className="material-symbols-outlined text-[12px]">fast_forward</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transit Progress Bar */}
              <div className="pt-1.5 space-y-1 font-mono">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{originName}</span>
                  <span className="text-white font-bold">{progressPercent}% {t.completed}</span>
                  <span>{destName}</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isRerouted ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Cargo Cold-Chain & Battery Reserve Card */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-bold text-base shrink-0">
                  {shipment.cargo === "medicine" ? "💊" : shipment.cargo === "fuel" ? "⛽" : shipment.cargo === "water" ? "💧" : "🌾"}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    {shipment.cargoDescription || shipment.cargo}
                  </div>
                  <div className="text-[11px] text-cyan-300 font-mono">
                    {shipment.cargo === "medicine"
                      ? `❄️ 4.2°C ${t.coldChainTelemetry} • 14h ${t.batteryReserve}`
                      : `Priority: ${shipment.priority.toUpperCase()} • Bulk Payload`}
                  </div>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-mono text-[10px] font-bold">
                {t.safe}
              </span>
            </div>
          </div>

          {/* Action Area & Driver Confirmation */}
          <footer className="pt-2 flex flex-col gap-2.5">
            {/* Primary Driver Confirmation Button */}
            <button
              type="button"
              onClick={handleAcknowledge}
              className={`w-full min-h-[54px] text-white text-[17px] font-extrabold rounded-xl shadow-lg border flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] ${
                acknowledged
                  ? "bg-emerald-700 border-emerald-500 hover:bg-emerald-600"
                  : "bg-primary hover:bg-blue-600 border-blue-400"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {acknowledged ? "check_circle" : "touch_app"}
              </span>
              <span>
                {acknowledged
                  ? `${t.routeConfirmed} (${ackTime})`
                  : t.confirmAlternateRoute}
              </span>
            </button>

            {/* Secondary Utility Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/report"
                className="h-10 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-amber-400 text-[16px]">warning</span>
                <span>{t.reportRoadHazard}</span>
              </Link>

              <a
                href="tel:18005550199"
                className="h-10 bg-rose-700 hover:bg-rose-600 border border-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 rounded-xl transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">call</span>
                <span>{t.callDispatchDesk}</span>
              </a>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
