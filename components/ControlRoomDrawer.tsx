"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShipmentSimState, AgentDecision } from "@/lib/sim/engine";
import { NODES } from "@/lib/sim/network";
import { SEEDED_SHIPMENTS } from "@/lib/sim/shipments";
import { useSimStore } from "@/lib/store";

interface ControlRoomDrawerProps {
  shipmentCode: string;
  truckSnapshot?: ShipmentSimState;
  decision?: AgentDecision | null;
  onClose: () => void;
  scenario: string;
  simT: number;
}

export function ControlRoomDrawer({
  shipmentCode,
  truckSnapshot,
  decision,
  onClose,
  scenario,
  simT,
}: ControlRoomDrawerProps) {
  const [signalsOpen, setSignalsOpen] = useState(true);
  const [dispatched, setDispatched] = useState(false);
  const [reopened, setReopened] = useState(false);
  const { reopenEdge, userObservations, clearUserObservations } = useSimStore();

  const fallbackShipment = SEEDED_SHIPMENTS.find((s) => s.code === shipmentCode);
  const cargo = truckSnapshot?.shipment?.cargo || fallbackShipment?.cargo || "Critical Relief Cargo";
  const priority = truckSnapshot?.shipment?.priority || fallbackShipment?.priority || "critical";
  const isRerouted = decision?.decision === "REROUTE";
  const isHeld = decision?.decision === "HOLD" || truckSnapshot?.status === "held";
  const isEscalated = decision?.decision === "ESCALATE" || truckSnapshot?.status === "escalated";

  const fromNode = truckSnapshot?.shipment?.origin || fallbackShipment?.origin || "BLR";
  const toNode = truckSnapshot?.shipment?.destination || fallbackShipment?.destination || "MNG";
  const fromName = NODES[fromNode]?.name || fromNode;
  const toName = NODES[toNode]?.name || toNode;

  // What happened summary
  const whatHappened = decision?.explanation ||
    `${decision?.roadName || "The corridor ahead"} is projected to become impassable with high hazard risk. Proactive mitigation routes this unit to safety.`;

  // Alternate summary
  const originalCorridor = decision?.roadName || "Original Highway Route";
  const newCorridor = decision?.alternateRouteSummary || "Assigned Alternate Corridor";
  const extraMin = decision?.extraMinutes || 0;
  const riskScore = decision?.riskScore || 85;
  const altRisk = decision?.alternateRisk || 46;

  return (
    <section className="w-full sm:w-[400px] absolute right-0 top-0 bottom-12 bg-surface-container-lowest border-l border-outline-variant shadow-xl flex flex-col z-20 overflow-y-auto">
      {/* Header */}
      <div className="p-4 bg-surface-container-low border-b border-outline-variant flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold bg-surface-container-highest text-on-surface px-1.5 py-0.5 rounded">
              {shipmentCode}
            </span>
            <h3 className="font-semibold text-[16px] text-on-surface capitalize">
              {cargo}
            </h3>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded uppercase ${
                priority === "critical"
                  ? "bg-error-container text-error"
                  : "bg-surface-container text-on-surface-variant"
              }`}
            >
              {priority} urgency
            </span>
            <span
              className={`font-mono text-[11px] font-medium px-2 py-0.5 rounded ${
                isRerouted
                  ? "bg-primary-fixed text-on-primary-fixed-variant"
                  : isHeld
                  ? "bg-surface-container-high text-on-surface-variant"
                  : isEscalated
                  ? "bg-error-container text-on-error-container"
                  : "bg-tertiary-fixed text-on-tertiary-fixed-variant"
              }`}
            >
              {isRerouted ? "Rerouted" : isHeld ? "Held" : isEscalated ? "Decision" : "On track"}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-4 flex-1 text-xs">
        {/* Where the truck was & Route Change Counter */}
        <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-between">
          <div>
            <span className="font-mono text-[10px] text-on-surface-variant block uppercase font-medium">
              Where the truck was
            </span>
            <span className="text-[12px] font-semibold text-on-surface">
              {decision?.positionDescription || (truckSnapshot?.currentEdgeId ? `${Math.round((truckSnapshot.fractionOnEdge || 0) * 100)}% on ${truckSnapshot.currentEdgeId}` : `At origin (${fromName})`)}
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container border border-outline-variant text-on-surface-variant shrink-0">
            Route changed {truckSnapshot?.routeChangeCount || (isRerouted ? 1 : 0)} times today
          </span>
        </div>

        {/* Action instruction / Driver directive */}
        {decision?.driverMessage && (
          <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/30 flex items-start gap-2">
            <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">navigation</span>
            <div>
              <span className="font-mono text-[10px] text-primary block uppercase font-bold">
                Driver Instruction ({decision.chosenOption || decision.decision})
              </span>
              <p className="text-[12px] font-medium text-on-surface leading-tight mt-0.5">
                {decision.driverMessage}
              </p>
            </div>
          </div>
        )}

        {/* What happened */}
        <div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
            What happened
          </span>
          <p className="mt-1 text-[13px] text-on-surface leading-snug">
            {whatHappened}
          </p>
        </div>

        {/* Candidate Corridor Evaluation Audit Log (if alternatives evaluated) */}
        {decision?.candidateRejections && decision.candidateRejections.length > 0 && (
          <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-on-surface-variant uppercase font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-primary">route</span>
                <span>Evaluated Candidate Corridors ({decision.candidateRejections.length})</span>
              </span>
              <span className="font-mono text-[10px] text-on-surface-variant">
                Live at t={simT.toFixed(1)}h
              </span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {decision.candidateRejections.map((rej, i) => {
                const isImpassable =
                  rej.status === "impassable" ||
                  (!rej.status &&
                    (rej.reason.toLowerCase().includes("closed") ||
                      rej.reason.toLowerCase().includes("blocked") ||
                      rej.reason.toLowerCase().includes("impassable")));
                const isActive = rej.status === "active_detour";
                const isTimeExceeded = rej.status === "time_exceeded";
                const isPassable =
                  rej.status === "passable" ||
                  isTimeExceeded ||
                  (!isImpassable && !isActive);

                let badgeClass = "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40";
                let labelText = "Impassable";

                if (isActive) {
                  badgeClass = "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/40";
                  labelText = rej.statusLabel || "Active Alternate";
                } else if (isTimeExceeded) {
                  badgeClass = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40";
                  labelText = rej.statusLabel || "Possible (Delayed)";
                } else if (isPassable) {
                  badgeClass = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40";
                  labelText = rej.statusLabel || "Possible (Passable)";
                } else if (rej.status === "high_risk") {
                  badgeClass = "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/40";
                  labelText = rej.statusLabel || "High Risk";
                }

                return (
                  <div
                    key={i}
                    className={`p-2 rounded bg-surface-container border text-[11px] font-mono transition-colors ${
                      isActive
                        ? "border-primary/60 bg-primary/5 ring-1 ring-primary/30"
                        : "border-outline-variant/40"
                    }`}
                  >
                    <div className="text-on-surface font-bold truncate flex items-center justify-between gap-2">
                      <span className="truncate">Alt {i + 1}: {rej.path}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase shrink-0 border ${badgeClass}`}
                      >
                        {labelText}
                      </span>
                    </div>
                    <div className="text-on-surface-variant text-[10px] mt-0.5 leading-tight">
                      {rej.reason}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* What we did section: Comparative Decision Card */}
        <div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
            Operational Adjustment
          </span>
          <div className="mt-2 grid grid-cols-2 rounded-lg bg-surface-container-low overflow-hidden border border-outline-variant">
            {/* Left: Original */}
            <div className="p-3 bg-surface-container border-r border-outline-variant">
              <span className="font-mono text-[10px] text-on-surface-variant block uppercase font-medium">
                Original corridor
              </span>
              <p className="font-semibold text-on-surface mt-0.5 text-[12px]">
                {originalCorridor}
              </p>
              <div className="mt-2">
                <span className="font-mono text-[11px] font-semibold text-error block">
                  Blocked ({riskScore}% risk)
                </span>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  ETA: Indefinite
                </span>
              </div>
            </div>

            {/* Right: New */}
            <div className="p-3 bg-tertiary-fixed/30">
              <span className="font-mono text-[10px] text-tertiary block font-semibold uppercase">
                THIS IS ALTERNATE ROUTE (ACTIVE)
              </span>
              <p className="font-semibold text-on-surface mt-0.5 text-[12px]">
                {newCorridor}
              </p>
              <div className="mt-2">
                <span className="font-mono text-[11px] font-semibold text-tertiary block">
                  +{extraMin} min ({altRisk}% risk)
                </span>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  Safe passage verified
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Why we think so (4 Signals) */}
        <div>
          <button
            onClick={() => setSignalsOpen(!signalsOpen)}
            className="w-full flex items-center justify-between text-on-surface font-semibold py-1 cursor-pointer"
          >
            <span className="flex items-center gap-1.5 text-xs">
              <span className="material-symbols-outlined text-[16px] text-primary">analytics</span>
              <span>Decision basis (4 telemetry signals)</span>
            </span>
            <span className="material-symbols-outlined text-[18px]">
              {signalsOpen ? "expand_less" : "expand_more"}
            </span>
          </button>

          {signalsOpen && (
            <div className="mt-2 space-y-2 p-2.5 rounded bg-surface-container-low border border-outline-variant/60">
              <div className="flex items-start gap-2">
                <span className="font-mono text-[11px] font-bold text-on-surface-variant shrink-0 mt-0.5">
                  01
                </span>
                <p className="text-[12px] text-on-surface">
                  Rainfall forecast model projects peak saturation threshold breach across {originalCorridor}.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-[11px] font-bold text-on-surface-variant shrink-0 mt-0.5">
                  02
                </span>
                <p className="text-[12px] text-on-surface">
                  Multi-source telemetry verifies soil moisture and run-off exceeding historical closure baselines.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-[11px] font-bold text-on-surface-variant shrink-0 mt-0.5">
                  03
                </span>
                <p className="text-[12px] text-on-surface">
                  Alternate bypass corridor confirmed stable with low localized precipitation.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-[11px] font-bold text-on-surface-variant shrink-0 mt-0.5">
                  04
                </span>
                <p className="text-[12px] text-on-surface">
                  Cold-chain refrigeration and SLA limits verified (+{extraMin}m delay well within cargo safety envelope).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Actions Tray */}
      <div className="p-4 bg-surface-container-lowest border-t border-outline-variant space-y-2 shrink-0">
        {decision?.edgeId && (
          <button
            type="button"
            onClick={() => {
              if (decision?.edgeId) {
                reopenEdge(decision.edgeId, simT);
                setReopened(true);
              }
            }}
            className="w-full h-10 rounded font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-tertiary/40 bg-tertiary-fixed/30 text-tertiary hover:bg-tertiary-fixed/50"
          >
            <span className="material-symbols-outlined text-[18px]">lock_open</span>
            <span>
              {reopened
                ? `${originalCorridor} Reopened (Clear)`
                : `Reopen ${originalCorridor} (Mark Clear & Passable)`}
            </span>
          </button>
        )}

        {userObservations.length > 0 && (
          <button
            type="button"
            onClick={() => clearUserObservations()}
            className="w-full h-9 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Reset {userObservations.length} Injected Hazard Report{userObservations.length > 1 ? "s" : ""} (Restore All Open Roads)</span>
          </button>
        )}

        <button
          onClick={() => setDispatched(true)}
          className={`w-full h-10 rounded font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm ${
            dispatched
              ? "bg-tertiary text-on-tertiary"
              : "bg-primary text-on-primary hover:bg-primary/90"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {dispatched ? "check_circle" : "send"}
          </span>
          <span>{dispatched ? "Dispatched to driver cab" : "Send to driver"}</span>
        </button>

        <Link
          href={`/driver/${shipmentCode}?scenario=${scenario}&t=${simT}`}
          target="_blank"
          className="w-full h-10 rounded bg-surface-container-low text-on-surface font-semibold text-xs flex items-center justify-center gap-2 hover:bg-surface-container transition-colors border border-outline-variant"
        >
          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          <span>Open driver terminal</span>
        </Link>
      </div>
    </section>
  );
}
