"use client";

import React, { useState, useMemo } from "react";
import { ShipmentSimState, AgentDecision } from "@/lib/sim/engine";
import { NODES, EDGES, REGION_NAMES } from "@/lib/sim/network";
import { useSimStore } from "@/lib/store";
import { TRANSLATIONS } from "@/lib/i18n";

interface ControlRoomSidebarProps {
  trucks: ShipmentSimState[];
  decisions: AgentDecision[];
  selectedShipmentCode: string | null;
  onSelectShipment: (code: string) => void;
  simT: number;
}

export function ControlRoomSidebar({
  trucks,
  decisions,
  selectedShipmentCode,
  onSelectShipment,
  simT,
}: ControlRoomSidebarProps) {
  const selectedRegion = useSimStore((s) => s.selectedRegion);
  const activeSidebarTab = useSimStore((s) => s.activeSidebarTab);
  const setActiveSidebarTab = useSimStore((s) => s.setActiveSidebarTab);
  const manualReroutedTrucks = useSimStore((s) => s.manualReroutedTrucks);
  const toggleTruckManualReroute = useSimStore((s) => s.toggleTruckManualReroute);
  const setTruckFocusTarget = useSimStore((s) => s.setTruckFocusTarget);
  const language = useSimStore((s) => s.language);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const [showHint, setShowHint] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "attention" | "rerouted" | "ontrack">("all");

  // Determine status & notes for each truck
  const truckSummaries = useMemo(() => {
    return trucks.map((truck) => {
      const isManualRelocated = manualReroutedTrucks.includes(truck.code);
      const dec =
        decisions
          .filter((d) => d.shipmentCode === truck.code && d.simT <= simT)
          .sort((a, b) => b.simT - a.simT)[0] ||
        decisions.find(
          (d) => d.shipmentCode === truck.code && d.decision === "REROUTE"
        );

      let statusCategory: "rerouted" | "held" | "decision" | "ontrack" = "ontrack";
      let statusLabel = "On track";
      let statusIcon = "check_circle";
      let statusStyle = "bg-tertiary-fixed text-on-tertiary-fixed-variant";
      let note = "Corridor clear on assigned schedule.";

      if (isManualRelocated || dec?.decision === "REROUTE") {
        statusCategory = "rerouted";
        statusLabel = isManualRelocated ? "Relocated (Detour)" : "Rerouted";
        statusIcon = "alt_route";
        statusStyle = "bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold";
        note = isManualRelocated
          ? `Dispatcher manual relocation active. Diverted via safe bypass corridor.`
          : dec?.reason || `${dec?.roadName || "Hazard"} bypass. Rerouted via alternate corridor (+${dec?.extraMinutes || 35}m).`;
      } else if (dec?.decision === "HOLD" || truck.status === "held") {
        statusCategory = "held";
        statusLabel = "Held";
        statusIcon = "pause_circle";
        statusStyle = "bg-surface-container-high text-on-surface-variant";
        note = dec?.reason || "Held at safe interchange hub awaiting corridor clearance.";
      } else if (dec?.decision === "ESCALATE" || truck.status === "escalated" || truck.isBlocked) {
        statusCategory = "decision";
        statusLabel = "Decision";
        statusIcon = "warning";
        statusStyle = "bg-error-container text-on-error-container font-semibold";
        note = dec?.reason || "Corridor impassable or exceeds priority tolerance limit. Dispatcher action needed.";
      }

      const fromName = NODES[truck.shipment?.origin]?.name || truck.shipment?.origin || "Origin";
      const toName = NODES[truck.shipment?.destination]?.name || truck.shipment?.destination || "Destination";

      // Compute progress percentage along current route
      const totalEdges = truck.activeRoute?.edges?.length || 1;
      const progressPercent = Math.min(
        100,
        Math.max(
          5,
          Math.round(((truck.currentEdgeIndex + truck.fractionOnEdge) / totalEdges) * 100)
        )
      );

      // Current corridor name
      const currentEdgeObj = truck.currentEdgeId
        ? EDGES.find((e) => e.id === truck.currentEdgeId)
        : null;
      const currentLegName = currentEdgeObj
        ? currentEdgeObj.name
        : truck.status === "delivered"
        ? "Arrived at Destination"
        : `${fromName} Interchange`;

      return {
        truck,
        decision: dec,
        isManualRelocated,
        statusCategory,
        statusLabel,
        statusIcon,
        statusStyle,
        note,
        fromName,
        toName,
        progressPercent,
        currentLegName,
      };
    });
  }, [trucks, decisions, simT, manualReroutedTrucks]);

  // Counts
  const counts = useMemo(() => {
    let attention = 0;
    let rerouted = 0;
    let ontrack = 0;

    truckSummaries.forEach((s) => {
      if (s.statusCategory === "decision" || s.statusCategory === "held") attention++;
      if (s.statusCategory === "rerouted") rerouted++;
      if (s.statusCategory === "ontrack") ontrack++;
    });

    return { attention, rerouted, ontrack, total: truckSummaries.length };
  }, [truckSummaries]);

  // Filtered list
  const filteredSummaries = useMemo(() => {
    return truckSummaries.filter((s) => {
      if (activeFilter === "attention" && s.statusCategory !== "decision" && s.statusCategory !== "held") {
        return false;
      }
      if (activeFilter === "rerouted" && s.statusCategory !== "rerouted") {
        return false;
      }
      if (activeFilter === "ontrack" && s.statusCategory !== "ontrack") {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.truck.code.toLowerCase().includes(q) ||
        (s.truck.shipment?.cargo || "").toLowerCase().includes(q) ||
        (s.truck.shipment?.driverName || "").toLowerCase().includes(q) ||
        (s.truck.shipment?.truckPlate || "").toLowerCase().includes(q) ||
        s.fromName.toLowerCase().includes(q) ||
        s.toName.toLowerCase().includes(q)
      );
    });
  }, [truckSummaries, activeFilter, searchQuery]);

  return (
    <aside className="w-full lg:w-[380px] shrink-0 h-full bg-surface-container-lowest flex flex-col z-20 border-r border-outline-variant shadow-sm">
      {/* Top Tab Switcher: Fleet Controller vs Corridors Overview */}
      <div className="grid grid-cols-2 border-b border-outline-variant bg-surface-container-low p-1.5 gap-1.5 shrink-0">
        <button
          onClick={() => setActiveSidebarTab("fleet")}
          className={`py-2 px-2.5 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSidebarTab === "fleet"
              ? "bg-primary text-white shadow-xs"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">local_shipping</span>
          <span>Fleet Controller ({counts.total})</span>
        </button>
        <button
          onClick={() => setActiveSidebarTab("corridors")}
          className={`py-2 px-2.5 rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSidebarTab === "corridors"
              ? "bg-primary text-white shadow-xs"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">alt_route</span>
          <span>Corridors Overview</span>
        </button>
      </div>

      {/* Top Dismissible Hint Pill */}
      {showHint && (
        <div className="mx-3 mt-2.5 px-3 py-2 rounded bg-primary-fixed text-primary flex items-center justify-between text-body-sm font-medium">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="material-symbols-outlined text-[15px]">gps_fixed</span>
            <span>
              {activeSidebarTab === "fleet"
                ? "Click 'Locate on Map' to zoom to truck live GPS coordinates"
                : "Select a shipment to inspect its corridor telemetry"}
            </span>
          </div>
          <button
            onClick={() => setShowHint(false)}
            className="text-primary hover:opacity-70 p-0.5 rounded flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">close</span>
          </button>
        </div>
      )}

      {/* Section Header Area */}
      <div className="p-3 space-y-2 border-b border-outline-variant/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
              {REGION_NAMES[selectedRegion]} • {activeSidebarTab === "fleet" ? "Fleet Control Section" : "Corridor Operations"}
            </span>
          </div>
          <span className="font-mono text-xs bg-surface-container px-2 py-0.5 rounded text-on-surface font-bold">
            {counts.total} Trucks Assigned
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold text-[14px] text-on-surface">
            {activeSidebarTab === "fleet"
              ? `Live Truck Tracking & Dynamic Relocation`
              : counts.attention > 0
              ? `${counts.attention} shipments need attention`
              : "All shipments operational"}
          </h2>
        </div>

        {/* Search Input */}
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-2.5 text-[17px] text-on-surface-variant pointer-events-none">
            search
          </span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search truck, driver, plate, cargo..."
            type="text"
            className="w-full h-8 pl-8 pr-3 rounded bg-surface-container-low text-on-surface text-xs placeholder:text-outline border border-outline-variant/60 focus:outline-none focus:border-primary focus:bg-surface-container-lowest transition-colors"
          />
        </div>

        {/* Filter Pills Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-2.5 py-0.5 rounded-full font-medium shrink-0 transition-colors cursor-pointer ${
              activeFilter === "all"
                ? "bg-on-surface text-surface"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            All {counts.total}
          </button>
          <button
            onClick={() => setActiveFilter("rerouted")}
            className={`px-2.5 py-0.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
              activeFilter === "rerouted"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            Relocated {counts.rerouted}
          </button>
          <button
            onClick={() => setActiveFilter("ontrack")}
            className={`px-2.5 py-0.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
              activeFilter === "ontrack"
                ? "bg-tertiary text-on-tertiary"
                : "bg-tertiary-fixed text-on-tertiary-fixed-variant"
            }`}
          >
            On track {counts.ontrack}
          </button>
          {counts.attention > 0 && (
            <button
              onClick={() => setActiveFilter("attention")}
              className={`px-2.5 py-0.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
                activeFilter === "attention"
                  ? "bg-error text-on-error"
                  : "bg-error-container text-on-error-container"
              }`}
            >
              Alerts {counts.attention}
            </button>
          )}
        </div>
      </div>

      {/* Main Truck List Content */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        {activeSidebarTab === "fleet" ? (
          // =================================================================
          // DEDICATED FLEET CONTROLLER VIEW (10 TRUCKS SECTION)
          // =================================================================
          filteredSummaries.map(
            ({
              truck,
              isManualRelocated,
              statusLabel,
              statusIcon,
              statusStyle,
              fromName,
              toName,
              progressPercent,
              currentLegName,
            }) => {
              const isSelected = selectedShipmentCode === truck.code;
              const isMedicine = truck.shipment?.cargo === "medicine";
              const isCritical = truck.shipment?.priority === "critical";

              return (
                <div
                  key={truck.code}
                  onClick={() => {
                    onSelectShipment(truck.code);
                    setTruckFocusTarget({
                      lat: truck.lat,
                      lng: truck.lng,
                      zoom: 11,
                      code: truck.code,
                      timestamp: Date.now(),
                    });
                  }}
                  className={`rounded-lg p-3 transition-all border cursor-pointer ${
                    isSelected
                      ? "bg-surface-container-low border-primary shadow-md ring-2 ring-primary/40"
                      : "bg-surface-container-lowest border-outline-variant/70 hover:border-primary/50 hover:bg-surface-container-low"
                  }`}
                >
                  {/* Row 1: Truck Code + License Plate + Driver Name */}
                  <div className="flex items-center justify-between gap-1 pb-1 border-b border-outline-variant/40">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-primary text-white px-2 py-0.5 rounded shadow-xs">
                        {truck.code}
                      </span>
                      <div>
                        <div className="font-bold text-[13px] text-on-surface leading-tight">
                          {truck.shipment?.driverName || "Fleet Driver"}
                        </div>
                        <div className="font-mono text-[10px] text-on-surface-variant">
                          {t.plate}: {truck.shipment?.truckPlate || "IN-COMMERCIAL"}
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded font-bold shrink-0 ${statusStyle}`}
                    >
                      <span className="material-symbols-outlined text-[13px]">{statusIcon}</span>
                      <span>{statusLabel}</span>
                    </span>
                  </div>

                  {/* Row 2: Cargo + Priority + Cold-chain */}
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        {isMedicine ? "medical_services" : truck.shipment?.cargo === "fuel" ? "local_gas_station" : truck.shipment?.cargo === "water" ? "water_drop" : "inventory_2"}
                      </span>
                      <span className="font-semibold text-on-surface text-[12px] truncate max-w-[190px]">
                        {truck.shipment?.cargoDescription || truck.shipment?.cargo}
                      </span>
                    </div>

                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        isCritical
                          ? "bg-error text-white font-extrabold"
                          : truck.shipment?.priority === "high"
                          ? "bg-amber-500 text-white font-bold"
                          : "bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      {truck.shipment?.priority}
                    </span>
                  </div>

                  {/* Row 3: Live GPS Coordinates & Corridor Telemetry */}
                  <div className="mt-2 p-2 rounded bg-surface-container text-xs space-y-1 font-mono">
                    <div className="flex items-center justify-between text-on-surface">
                      <span className="text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-emerald-600">my_location</span>
                        <span>Live Location:</span>
                      </span>
                      <span className="font-bold text-primary">
                        {truck.lat.toFixed(4)}°N, {truck.lng.toFixed(4)}°E
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-on-surface">
                      <span className="text-on-surface-variant">Active Corridor:</span>
                      <span className="text-on-surface truncate max-w-[170px]" title={currentLegName}>
                        {currentLegName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-on-surface">
                      <span className="text-on-surface-variant">Route:</span>
                      <span>
                        {fromName} → {toName}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-1 space-y-0.5">
                      <div className="flex justify-between text-[10px] text-on-surface-variant font-medium">
                        <span>Speed: {truck.isBlocked ? "0 km/h (Impassable)" : "55 km/h"}</span>
                        <span>{progressPercent}% transit</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isManualRelocated
                              ? "bg-emerald-500"
                              : isCritical
                              ? "bg-primary"
                              : "bg-tertiary"
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Two Dedicated Control Actions */}
                  <div className="mt-2.5 grid grid-cols-2 gap-1.5 pt-1">
                    {/* Action 1: Locate on Map */}
                    <button
                      onClick={() => {
                        setTruckFocusTarget({
                          lat: truck.lat,
                          lng: truck.lng,
                          zoom: 11,
                          code: truck.code,
                          timestamp: Date.now(),
                        });
                        onSelectShipment(truck.code);
                      }}
                      className="py-1.5 px-2 rounded bg-surface-container hover:bg-primary hover:text-white border border-outline-variant text-on-surface font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title="Fly to truck live GPS location on map"
                    >
                      <span className="material-symbols-outlined text-[15px] text-primary">location_on</span>
                      <span>Locate on Map</span>
                    </button>

                    {/* Action 2: Relocate / Alternate Route */}
                    <button
                      onClick={() => {
                        toggleTruckManualReroute(truck.code);
                        setTruckFocusTarget({
                          lat: truck.lat,
                          lng: truck.lng,
                          zoom: 10,
                          code: truck.code,
                          timestamp: Date.now(),
                        });
                        onSelectShipment(truck.code);
                      }}
                      className={`py-1.5 px-2 rounded font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs ${
                        isManualRelocated
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-emerald-700 hover:bg-emerald-800 text-white"
                      }`}
                      title={
                        isManualRelocated
                          ? "Resume standard corridor route"
                          : "Relocate truck to alternate bypass corridor"
                      }
                    >
                      <span className="material-symbols-outlined text-[15px]">alt_route</span>
                      <span>{isManualRelocated ? "Relocated (Active)" : "Relocate Route"}</span>
                    </button>
                  </div>
                </div>
              );
            }
          )
        ) : (
          // =================================================================
          // CORRIDORS OVERVIEW VIEW (STANDARD LIST)
          // =================================================================
          filteredSummaries.map(
            ({ truck, statusLabel, statusIcon, statusStyle, note, fromName, toName }) => {
              const isSelected = selectedShipmentCode === truck.code;

              return (
                <div
                  key={truck.code}
                  onClick={() => onSelectShipment(truck.code)}
                  className={`rounded-lg p-3 cursor-pointer transition-all border ${
                    isSelected
                      ? "bg-surface-container-low border-primary shadow-sm ring-1 ring-primary"
                      : "bg-surface-container-lowest border-outline-variant/60 hover:bg-surface-container-low"
                  }`}
                >
                  {/* Line 1: Code + Cargo + Status Chip */}
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold bg-surface-container-highest text-on-surface px-1.5 py-0.5 rounded">
                        {truck.code}
                      </span>
                      <span className="font-semibold text-[14px] text-on-surface truncate max-w-[150px]">
                        {truck.shipment?.cargo || "Relief Cargo"}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded font-medium ${statusStyle}`}
                    >
                      <span className="material-symbols-outlined text-[13px]">{statusIcon}</span>
                      <span>{statusLabel}</span>
                    </span>
                  </div>

                  {/* Line 2: Origin -> Destination + Priority */}
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant flex items-center gap-1 truncate max-w-[200px]">
                      <span className="material-symbols-outlined text-[14px]">near_me</span>
                      <span>
                        {fromName} → {toName}
                      </span>
                    </span>
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                        truck.shipment?.priority === "critical"
                          ? "bg-error-container text-error"
                          : truck.shipment?.priority === "high"
                          ? "bg-[#fcf6e8] text-[#946c00] border border-[#f5da99]"
                          : "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                      }`}
                    >
                      {truck.shipment?.priority || "normal"}
                    </span>
                  </div>

                  {/* Line 3: Operational Note */}
                  <div className="mt-2 p-2 rounded bg-surface-container text-on-surface text-xs leading-snug">
                    {note}
                  </div>
                </div>
              );
            }
          )
        )}

        {filteredSummaries.length === 0 && (
          <div className="p-6 text-center text-on-surface-variant text-xs">
            No shipments match the selected filter.
          </div>
        )}
      </div>
    </aside>
  );
}
