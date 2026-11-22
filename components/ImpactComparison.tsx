"use client";

import React, { useMemo } from "react";
import { ScenarioId } from "@/lib/sim/scenarios";
import { calculateImpact } from "@/lib/sim/impact";
import { TrendingDown, ShieldCheck, Clock, Info } from "lucide-react";

interface ImpactComparisonProps {
  scenario: ScenarioId;
}

export function ImpactComparison({ scenario }: ImpactComparisonProps) {
  const impact = useMemo(() => calculateImpact(scenario), [scenario]);

  const maxDelay = Math.max(
    impact.baselineTotalDelayHours,
    impact.agentTotalDelayHours,
    1
  );
  const baseBarPercent = Math.round((impact.baselineTotalDelayHours / maxDelay) * 100);
  const agentBarPercent = Math.round((impact.agentTotalDelayHours / maxDelay) * 100);

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full text-xs font-body">
      {/* Disclaimer Banner */}
      <div className="p-2.5 rounded-lg bg-surface-container-low/90 border border-white/5 flex items-start space-x-2 text-[11px] text-on-surface">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-primary">Modelled Simulation Estimate</span>
          <p className="text-on-surface-variant mt-0.5 leading-snug">
            Quantifies counterfactual replay comparing blind baseline routing vs autonomous predictive dispatch.
          </p>
        </div>
      </div>

      {/* KPI Highlights Grid */}
      <div className="grid grid-cols-2 gap-2 font-mono">
        <div className="p-3 rounded-xl bg-surface-container/70 border border-white/5">
          <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block">
            Hours Saved
          </span>
          <span className="text-2xl font-black text-secondary block mt-1 drop-shadow-[0_0_12px_rgba(202,190,255,0.3)]">
            {impact.delayHoursSaved} hrs
          </span>
          <span className="text-[10px] text-primary font-semibold mt-1 inline-flex items-center">
            <TrendingDown className="w-3 h-3 mr-0.5 text-primary-container" />
            {impact.percentageDelayReduced}% reduction
          </span>
        </div>

        <div className="p-3 rounded-xl bg-surface-container/70 border border-white/5">
          <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block">
            Critical Cargo Protected
          </span>
          <span className="text-2xl font-black text-primary-container block mt-1 drop-shadow-[0_0_12px_rgba(20,241,217,0.3)]">
            {impact.medicineProtectedCount}
          </span>
          <span className="text-[10px] text-on-surface-variant block mt-1">
            medicine shipments
          </span>
        </div>
      </div>

      {/* Comparative Delay Bar Visual */}
      <div className="p-3.5 rounded-xl bg-surface-container/70 border border-white/5 space-y-3">
        <div className="text-[11px] font-bold text-on-surface flex items-center justify-between">
          <span>Corridor Delay Replay Comparison</span>
          <span className="font-mono text-[10px] text-on-surface-variant">
            Modelled Hours
          </span>
        </div>

        {/* Baseline Bar */}
        <div>
          <div className="flex justify-between text-[11px] font-mono mb-1">
            <span className="text-on-surface-variant">Blind Baseline (No Agent)</span>
            <span className="text-error font-bold">
              {impact.baselineTotalDelayHours} hrs
            </span>
          </div>
          <div className="w-full bg-surface-container-highest rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-error h-full rounded-full transition-all duration-700"
              style={{ width: `${baseBarPercent}%` }}
            />
          </div>
        </div>

        {/* Agent Bar */}
        <div>
          <div className="flex justify-between text-[11px] font-mono mb-1">
            <span className="text-primary font-semibold">ResilienceOps Agent</span>
            <span className="text-secondary font-bold">
              {impact.agentTotalDelayHours} hrs
            </span>
          </div>
          <div className="w-full bg-surface-container-highest rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-primary-container h-full rounded-full transition-all duration-700 shadow-[0_0_8px_#14f1d9]"
              style={{ width: `${agentBarPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Operational Actions Breakdown */}
      <div className="p-3.5 rounded-xl bg-surface-container/70 border border-white/5 space-y-2">
        <span className="text-[11px] font-bold text-on-surface block mb-1">
          Autonomous Interventions Dispatched
        </span>
        <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
          <div className="p-2 rounded bg-surface-container-high/60 border border-white/5 text-center">
            <span className="text-primary font-bold text-sm block">
              {impact.shipmentsRerouted}
            </span>
            <span className="text-[10px] text-on-surface-variant">Rerouted</span>
          </div>
          <div className="p-2 rounded bg-surface-container-high/60 border border-white/5 text-center">
            <span className="text-secondary font-bold text-sm block">
              {impact.shipmentsHeld}
            </span>
            <span className="text-[10px] text-on-surface-variant">Held</span>
          </div>
          <div className="p-2 rounded bg-surface-container-high/60 border border-white/5 text-center">
            <span className="text-error font-bold text-sm block">
              {impact.shipmentsEscalated}
            </span>
            <span className="text-[10px] text-on-surface-variant">Escalated</span>
          </div>
        </div>
      </div>

      {/* Shipment by Shipment Detail Table */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[11px] font-bold text-on-surface block">
          Individual Shipment Replay Delta
        </span>
        <div className="overflow-x-auto rounded-lg border border-white/5 bg-surface-container-lowest">
          <table className="w-full text-left font-mono text-[10px]">
            <thead className="bg-surface-container text-on-surface-variant border-b border-white/5">
              <tr>
                <th className="p-2">Unit</th>
                <th className="p-2">Cargo</th>
                <th className="p-2">Baseline</th>
                <th className="p-2">Agent</th>
                <th className="p-2">Saved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-on-surface">
              {impact.shipmentComparisons.map((c) => (
                <tr key={c.code} className="hover:bg-surface-container-high/40">
                  <td className="p-2 font-bold text-primary">{c.code}</td>
                  <td className="p-2 capitalize text-on-surface-variant">{c.cargo}</td>
                  <td className="p-2 text-error font-medium">
                    {c.baselineDelayHours > 0 ? `+${c.baselineDelayHours}h` : "0h"}
                  </td>
                  <td className="p-2 text-primary font-medium">
                    {c.agentDelayHours > 0 ? `+${c.agentDelayHours}h` : "0h"}
                  </td>
                  <td className="p-2 font-bold text-secondary">
                    {c.delaySavedHours > 0 ? `${c.delaySavedHours}h` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
