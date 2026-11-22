"use client";

import React, { useState } from "react";
import { AgentDecision } from "@/lib/sim/engine";
import { X, Sparkles, ExternalLink, AlertTriangle, ShieldCheck, Cpu } from "lucide-react";
import Link from "next/link";

interface DecisionDrawerProps {
  decision: AgentDecision;
  scenario: string;
  simT: number;
  onClose: () => void;
}

export function DecisionDrawer({
  decision,
  scenario,
  simT,
  onClose,
}: DecisionDrawerProps) {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  const handleFetchAiExplanation = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipmentCode: decision.shipmentCode,
          decision: decision.decision,
          roadName: decision.roadName,
          riskScore: decision.riskScore,
          reason: decision.reason,
          extraMinutes: decision.extraMinutes,
          delayAvoidedMin: decision.estimatedDelayAvoidedMin,
          alternateRoute: decision.alternateRouteSummary,
        }),
      });
      const data = await res.json();
      if (data?.text) {
        setAiExplanation(data.text);
      }
    } catch (e) {
      // Fallback silently
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="absolute inset-y-0 right-0 w-96 max-w-full bg-surface-container-lowest/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl z-30 flex flex-col font-body">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-surface-container-low/80">
        <div>
          <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
            Agent Operational Directive
          </span>
          <h3 className="font-headline font-bold text-base text-on-surface">
            Directive: {decision.decision}
          </h3>
          <span className="text-xs text-primary font-mono">
            #{decision.shipmentCode} at sim t = {decision.simT}h
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
        {/* Core Directive summary card */}
        <div className="p-3.5 rounded-xl bg-surface-container/70 border border-white/5 text-on-surface">
          <div className="text-[10px] font-mono text-primary uppercase font-bold mb-1.5 flex items-center justify-between">
            <span>Verified Agent Directive</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-secondary-container/40 text-secondary border border-secondary/30">
              Autonomous
            </span>
          </div>
          <p className="leading-relaxed text-[12px]">
            {aiExplanation || decision.explanation}
          </p>
          <div className="mt-2 text-[9px] font-mono text-on-surface-variant">
            Planned by: {decision.solver === "cuopt" ? "NVIDIA cuOpt" : "Built-in planner"}
            {typeof decision.solveMs === "number" ? ` · ${decision.solveMs} ms` : ""}
          </div>

          {!aiExplanation && (
            <button
              onClick={handleFetchAiExplanation}
              disabled={isAiLoading}
              className="mt-3 px-3 py-1.5 rounded-lg bg-primary-container/20 hover:bg-primary-container/30 border border-primary-container/40 text-[11px] font-semibold text-primary flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary-container" />
              <span>{isAiLoading ? "Consulting Gemini..." : "Synthesize AI Explanation"}</span>
            </button>
          )}
        </div>

        {/* Impact Metrics Strip */}
        <div className="grid grid-cols-2 gap-2 font-mono">
          <div className="p-2.5 rounded-lg bg-surface-container border border-white/5">
            <span className="text-[10px] text-on-surface-variant block">Detour Added</span>
            <span className="text-sm font-bold text-secondary">
              +{decision.extraMinutes} min
            </span>
            <span className="text-[9px] text-on-surface-variant block mt-0.5">verified safe route</span>
          </div>

          <div className="p-2.5 rounded-lg bg-surface-container border border-white/5">
            <span className="text-[10px] text-on-surface-variant block">Delay Avoided</span>
            <span className="text-sm font-bold text-primary">
              {(decision.estimatedDelayAvoidedMin / 60).toFixed(1)} hrs
            </span>
            <span className="text-[9px] text-on-surface-variant block mt-0.5">Modelled estimate</span>
          </div>
        </div>

        {/* Driver Dispatch Message */}
        <div className="p-3 rounded-lg bg-surface-container border border-white/5">
          <span className="text-[10px] font-mono text-on-surface-variant uppercase font-bold block mb-1">
            Driver Cab Telemetry Alert
          </span>
          <div className="p-2.5 rounded bg-surface-container-lowest border border-white/5 font-mono text-[11px] text-primary-fixed leading-snug">
            &ldquo;{decision.driverMessage}&rdquo;
          </div>
        </div>

        {/* Alternate Route Corridor */}
        <div className="p-3 rounded-lg bg-surface-container border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-on-surface-variant uppercase font-bold block">
              Active Navigation Corridor
            </span>
            {decision.alternateType && (
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                  decision.alternateType === "safe"
                    ? "bg-[#22e3a0]/20 text-[#22e3a0] border-[#22e3a0]/40"
                    : "bg-[#ffd166]/20 text-[#ffd166] border-[#ffd166]/40"
                }`}
              >
                {decision.alternateType === "safe" ? "Tier 1: Safe Alternate" : "Tier 2: Reduced Risk"}
              </span>
            )}
          </div>
          <p className="font-mono text-[11px] text-[#22e3a0] font-semibold">
            {decision.alternateRouteSummary}
          </p>
          {decision.alternateRisk !== undefined && (
            <div className="text-[10px] font-mono text-on-surface-variant">
              Estimated Max Traversal Risk: <span className="text-white font-bold">{decision.alternateRisk}%</span>
            </div>
          )}
        </div>

        {/* Candidate Corridor Evaluation Audit (if rejections present) */}
        {decision.candidateRejections && decision.candidateRejections.length > 0 && (
          <div className="p-3 rounded-lg bg-surface-container border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase font-bold block">
                Candidate Corridor Audit Log
              </span>
              <span className="text-[9px] font-mono text-on-surface-variant">
                Live Status
              </span>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
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

                let badgeClass = "bg-rose-500/15 text-rose-400 border-rose-500/40";
                let labelText = "Impassable";

                if (isActive) {
                  badgeClass = "bg-cyan-500/15 text-cyan-400 border-cyan-500/40";
                  labelText = rej.statusLabel || "Active Alternate";
                } else if (isTimeExceeded) {
                  badgeClass = "bg-amber-500/15 text-amber-400 border-amber-500/40";
                  labelText = rej.statusLabel || "Possible (Delayed)";
                } else if (isPassable) {
                  badgeClass = "bg-emerald-500/15 text-emerald-400 border-emerald-500/40";
                  labelText = rej.statusLabel || "Possible (Passable)";
                } else if (rej.status === "high_risk") {
                  badgeClass = "bg-orange-500/15 text-orange-400 border-orange-500/40";
                  labelText = rej.statusLabel || "High Risk";
                }

                return (
                  <div
                    key={i}
                    className="p-1.5 rounded bg-surface-container-lowest/80 border border-white/5 text-[10px] font-mono"
                  >
                    <div className="text-on-surface font-semibold truncate flex items-center justify-between gap-1.5">
                      <span className="truncate">{rej.path}</span>
                      <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase shrink-0 border ${badgeClass}`}>
                        {labelText}
                      </span>
                    </div>
                    <div className="text-on-surface-variant text-[9px] mt-0.5">{rej.reason}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Road Hazard Telemetry */}
        <div className="p-3 rounded-lg bg-surface-container border border-white/5">
          <span className="text-[10px] font-mono text-on-surface-variant uppercase font-bold block mb-1">
            Road Hazard Diagnostics
          </span>
          <div className="text-on-surface text-[11px] space-y-1">
            <div>
              <span className="text-on-surface-variant">Corridor:</span> {decision.roadName}
            </div>
            <div>
              <span className="text-on-surface-variant">Modelled Risk:</span>{" "}
              <span className="text-error font-bold">{decision.riskScore}%</span>
            </div>
            <div className="text-[10px] text-on-surface-variant italic mt-1 pt-1 border-t border-white/5">
              {decision.reason}
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA: Open Driver View */}
      <div className="p-4 border-t border-white/5 bg-surface-container-low/80">
        <Link
          href={`/driver/${decision.shipmentCode}?scenario=${scenario}&t=${simT}`}
          target="_blank"
          className="w-full py-2.5 px-4 rounded-lg bg-primary-container text-on-primary-container font-headline font-bold text-xs flex items-center justify-center space-x-2 transition shadow-[0_0_16px_rgba(20,241,217,0.35)] hover:shadow-[0_0_24px_rgba(20,241,217,0.5)]"
        >
          <span>Open Mobile Driver Telemetry</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
