"use client";

import React from "react";
import { AgentDecision } from "@/lib/sim/engine";
import { ChevronRight, Cpu } from "lucide-react";

interface DecisionFeedProps {
  decisions: AgentDecision[];
  currentSimT: number;
  selectedDecisionId: string | null;
  onSelectDecision: (id: string | null) => void;
}

export function DecisionFeed({
  decisions,
  currentSimT,
  selectedDecisionId,
  onSelectDecision,
}: DecisionFeedProps) {
  // Only show decisions that have occurred up to current simT
  const activeDecisions = decisions
    .filter((d) => d.simT <= currentSimT)
    .sort((a, b) => b.simT - a.simT);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Stream List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {activeDecisions.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center p-6 text-center text-on-surface-variant">
            <Cpu className="w-8 h-8 mb-2 text-secondary animate-pulse" />
            <p className="font-headline text-xs font-semibold text-on-surface">
              Monitoring Hydrological Telemetry...
            </p>
            <p className="font-mono text-[10px] text-on-surface-variant mt-1 max-w-xs">
              Agent continuously evaluates 24h predictive rain forecasts. Decisions trigger when road risk breaches 50%.
            </p>
          </div>
        ) : (
          activeDecisions.map((dec) => {
            const isSelected = selectedDecisionId === dec.id;
            const isReroute = dec.decision === "REROUTE";
            const isHold = dec.decision === "HOLD";
            const isEscalate = dec.decision === "ESCALATE";

            const sideBarColor = isReroute
              ? "bg-secondary"
              : isHold
              ? "bg-secondary-fixed"
              : isEscalate
              ? "bg-error animate-pulse"
              : "bg-primary";

            const badgeColor = isReroute
              ? "bg-secondary-container text-on-secondary font-bold"
              : isHold
              ? "bg-surface-variant text-on-surface-variant font-bold"
              : isEscalate
              ? "bg-error-container text-on-error-container font-bold"
              : "bg-primary-container text-on-primary-container font-bold";

            const delayAvoidedHr = (dec.estimatedDelayAvoidedMin / 60).toFixed(1);

            return (
              <div
                key={dec.id}
                onClick={() => onSelectDecision(dec.id)}
                className={`bg-surface-container/60 hover:bg-surface-container-high/80 transition-all rounded-xl p-3 shadow-md relative overflow-hidden group cursor-pointer border ${
                  isSelected ? "border-primary shadow-[0_0_12px_rgba(20,241,217,0.25)]" : "border-white/5"
                }`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${sideBarColor}`} />

                <div className="flex items-center justify-between pl-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] uppercase ${badgeColor}`}>
                      {dec.decision}
                    </span>
                    <span className="font-mono text-xs text-on-surface font-bold">
                      #{dec.shipmentCode}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-on-surface-variant">
                    sim t={dec.simT}h
                  </span>
                </div>

                <p className="font-body text-xs text-on-surface mt-1.5 pl-1 leading-snug">
                  {dec.explanation}
                </p>

                <div className="mt-2 pl-1 text-[9px] font-mono text-on-surface-variant">
                  Planned by: {dec.solver === "cuopt" ? "NVIDIA cuOpt" : "Built-in planner"}
                  {typeof dec.solveMs === "number" ? ` · ${dec.solveMs} ms` : ""}
                </div>

                <div className="mt-2 pl-1 flex items-center justify-between text-[11px] font-mono border-t border-white/5 pt-1.5">
                  <span className="text-primary font-medium flex items-center gap-1">
                    ✓ {delayAvoidedHr}h delay avoided
                  </span>
                  <span className="text-on-surface-variant">+{dec.extraMinutes}m detour</span>
                </div>

                <div className="mt-2 pl-1 pt-1.5 flex items-center justify-between border-t border-white/5">
                  <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-secondary font-mono text-[8px] tracking-wider">
                    {dec.isAiWritten ? "AI-SYNTHESIZED" : "RULE-VALIDATED"}
                  </span>
                  <button className="text-primary hover:text-primary-fixed font-mono text-[10px] flex items-center gap-0.5">
                    <span>INSPECT AUDIT</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Shiradi Disruption Factors Decomposition Cardlet */}
        <div className="bg-surface-container-lowest/80 rounded-xl p-3 shadow-lg border border-white/5 mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] text-on-surface-variant uppercase">
              SHIRADI DISRUPTION FACTORS
            </span>
            <span className="text-[10px] font-mono text-error font-bold">
              PEAK RISK: 91%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            {/* Soil Saturation */}
            <div className="bg-surface-container/80 p-2 rounded border border-white/5">
              <div className="flex justify-between text-on-surface-variant mb-1">
                <span>Soil Saturation</span>
                <span className="text-error font-bold">94%</span>
              </div>
              <div className="w-full bg-surface-container-highest rounded-full h-1">
                <div className="bg-error h-1 rounded-full" style={{ width: "94%" }} />
              </div>
            </div>
            {/* Rain Intensity */}
            <div className="bg-surface-container/80 p-2 rounded border border-white/5">
              <div className="flex justify-between text-on-surface-variant mb-1">
                <span>Rain Intensity</span>
                <span className="text-error font-bold">88%</span>
              </div>
              <div className="w-full bg-surface-container-highest rounded-full h-1">
                <div className="bg-error h-1 rounded-full" style={{ width: "88%" }} />
              </div>
            </div>
            {/* Incline Stress */}
            <div className="bg-surface-container/80 p-2 rounded border border-white/5">
              <div className="flex justify-between text-on-surface-variant mb-1">
                <span>Incline Stress</span>
                <span className="text-secondary font-bold">82%</span>
              </div>
              <div className="w-full bg-surface-container-highest rounded-full h-1">
                <div className="bg-secondary h-1 rounded-full" style={{ width: "82%" }} />
              </div>
            </div>
            {/* Drainage Capacity */}
            <div className="bg-surface-container/80 p-2 rounded border border-white/5">
              <div className="flex justify-between text-on-surface-variant mb-1">
                <span>Drain Cap</span>
                <span className="text-primary font-bold">21%</span>
              </div>
              <div className="w-full bg-surface-container-highest rounded-full h-1">
                <div className="bg-primary h-1 rounded-full" style={{ width: "21%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
