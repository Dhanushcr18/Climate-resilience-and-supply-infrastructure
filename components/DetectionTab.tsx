"use client";

import React, { useMemo } from "react";
import { RoadStatus, SourceType, SourceRegistryEntry } from "@/lib/detect/types";
import { DEFAULT_SOURCE_CONFIGS } from "@/lib/detect/config";
import { computeScenarioValidationMetrics } from "@/lib/detect/metrics";
import { ScenarioId } from "@/lib/sim/scenarios";
import { EDGES } from "@/lib/sim/network";
import { useSimStore } from "@/lib/store";
import {
  ShieldAlert,
  Radio,
  Satellite,
  Truck,
  Activity,
  Camera,
  AlertOctagon,
  Image as ImageIcon,
  MessageSquare,
  CloudRain,
  ChevronRight,
  TrendingDown,
  Clock,
  CheckCircle2,
  Sliders,
  Sparkles,
} from "lucide-react";

interface DetectionTabProps {
  scenario: ScenarioId;
  simT: number;
  roadStatusMap?: Map<string, RoadStatus>;
  onSelectEdge: (id: string | null) => void;
  selectedEdgeId: string | null;
}

function getSourceIcon(sourceType: SourceType) {
  switch (sourceType) {
    case "satellite":
      return <Satellite className="w-3.5 h-3.5 text-cyan-400" />;
    case "fleet_gps":
      return <Truck className="w-3.5 h-3.5 text-amber-400" />;
    case "traffic_speed":
      return <Activity className="w-3.5 h-3.5 text-yellow-400" />;
    case "road_sensor":
      return <Radio className="w-3.5 h-3.5 text-emerald-400" />;
    case "camera":
      return <Camera className="w-3.5 h-3.5 text-purple-400" />;
    case "official_alert":
      return <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />;
    case "photo_report":
      return <ImageIcon className="w-3.5 h-3.5 text-teal-400" />;
    case "text_report":
      return <MessageSquare className="w-3.5 h-3.5 text-blue-400" />;
    default:
      return <CloudRain className="w-3.5 h-3.5 text-slate-400" />;
  }
}

export function DetectionTab({
  scenario,
  simT,
  roadStatusMap,
  onSelectEdge,
  selectedEdgeId,
}: DetectionTabProps) {
  const { enabledSources, toggleSourceEnabled } = useSimStore();

  // Compute dynamic validation metrics for this scenario (never hard-coded)
  const validationMetrics = useMemo(() => {
    return computeScenarioValidationMetrics(scenario, EDGES, 72);
  }, [scenario]);

  // Convert status map to sorted array
  const roadStatuses = useMemo(() => {
    if (!roadStatusMap) return [];
    return Array.from(roadStatusMap.values()).sort((a, b) => b.probBlocked - a.probBlocked);
  }, [roadStatusMap]);

  const sourceList = Object.keys(DEFAULT_SOURCE_CONFIGS) as SourceType[];

  return (
    <div className="flex-1 overflow-y-auto space-y-4 pr-1 font-body text-xs">
      {/* 1. Detection vs Prediction Comparison Card */}
      <div className="p-3.5 rounded-xl bg-surface-container-low/85 backdrop-blur-md border border-white/10 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-secondary font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-secondary" />
            <span>Detection vs Prediction Validation</span>
          </span>
          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-secondary/10 border border-secondary/20 text-secondary">
            Modelled estimate
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 font-mono text-center">
          <div className="p-2 rounded-lg bg-surface-container border border-white/5">
            <span className="text-[9px] text-on-surface-variant block uppercase">Precision</span>
            <span className="text-base font-bold text-primary block mt-0.5">
              {Math.round(validationMetrics.fused.precision * 100)}%
            </span>
            <span className="text-[8px] text-slate-500">
              Rain-only: {Math.round(validationMetrics.rainModelOnly.precision * 100)}%
            </span>
          </div>

          <div className="p-2 rounded-lg bg-surface-container border border-white/5">
            <span className="text-[9px] text-on-surface-variant block uppercase">Recall</span>
            <span className="text-base font-bold text-[#22e3a0] block mt-0.5">
              {Math.round(validationMetrics.fused.recall * 100)}%
            </span>
            <span className="text-[8px] text-slate-500">
              Rain-only: {Math.round(validationMetrics.rainModelOnly.recall * 100)}%
            </span>
          </div>

          <div className="p-2 rounded-lg bg-surface-container border border-white/5">
            <span className="text-[9px] text-on-surface-variant block uppercase">False Alarms</span>
            <span className="text-base font-bold text-[#ffd166] block mt-0.5">
              {validationMetrics.fused.falseAlarms}
            </span>
            <span className="text-[8px] text-slate-500">
              Rain-only: {validationMetrics.rainModelOnly.falseAlarms}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container/60 border border-white/5 font-mono text-[10px]">
          <span className="text-on-surface-variant flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Avg Detection Lead Time:</span>
          </span>
          <span className="text-primary font-bold">
            +{validationMetrics.fused.avgLeadTimeHours}h ahead of closure
          </span>
        </div>
      </div>

      {/* 2. Source Health & Live Toggle Controller */}
      <div className="p-3.5 rounded-xl bg-surface-container-low/85 backdrop-blur-md border border-white/10 shadow-lg space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-on-surface font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-primary" />
            <span>Multi-Source Registry (Live Toggles)</span>
          </span>
          <span className="text-[9px] font-mono text-slate-400">
            Click toggle to inspect impact
          </span>
        </div>

        <div className="space-y-1.5">
          {sourceList.map((st) => {
            const conf = DEFAULT_SOURCE_CONFIGS[st];
            const isEnabled = enabledSources[st] ?? true;
            const latencyMin = Math.round(conf.latencyHours * 60);

            return (
              <div
                key={st}
                className="flex items-center justify-between p-2 rounded-lg bg-surface-container border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="shrink-0">{getSourceIcon(st)}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-white text-[11px] truncate">
                        {conf.label}
                      </span>
                      <span className="px-1 rounded text-[8px] font-mono bg-surface-variant/80 text-slate-400 uppercase">
                        {conf.provenance}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-mono text-on-surface-variant">
                      <span>Latency: +{latencyMin}m</span>
                      <span>Weight: {conf.reliabilityWeight}x</span>
                      <span>Half-life: {conf.halfLifeHours}h</span>
                    </div>
                  </div>
                </div>

                {/* Interactive Toggle Switch */}
                <button
                  onClick={() => toggleSourceEnabled(st)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                    isEnabled ? "bg-primary-container" : "bg-surface-variant"
                  }`}
                  title={`Toggle ${conf.label}`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                      isEnabled ? "translate-x-4 bg-[#05070d]" : "translate-x-0 bg-slate-400"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Live Fused Road Status List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between font-mono text-[10px] text-on-surface-variant px-1">
          <span className="uppercase tracking-wider font-bold">
            Fused Network Status (t={simT.toFixed(1)}h)
          </span>
          <span>{roadStatuses.length} Corridors</span>
        </div>

        <div className="space-y-1.5">
          {roadStatuses.map((status) => {
            const edge = EDGES.find((e) => e.id === status.edgeId);
            const isSelected = selectedEdgeId === status.edgeId;
            const probPct = Math.round(status.probBlocked * 100);

            return (
              <div
                key={status.edgeId}
                onClick={() => onSelectEdge(status.edgeId)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-surface-container-high border-primary shadow-[0_0_12px_rgba(20,241,217,0.3)]"
                    : "bg-surface-container-low/80 hover:bg-surface-container border-white/5"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        status.state === "confirmed"
                          ? "bg-[#ff0055] animate-pulse"
                          : status.state === "probable"
                          ? "bg-[#ff8a3d]"
                          : status.state === "watch"
                          ? "bg-[#ffd166]"
                          : "bg-[#22e3a0]"
                      }`}
                    />
                    <span className="font-headline font-bold text-white text-[11px] truncate">
                      {edge?.name || status.edgeId}
                    </span>
                  </div>

                  <span
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${
                      status.state === "confirmed"
                        ? "bg-[#ff0055]/30 text-[#ff0055] border-[#ff0055]/50 animate-pulse"
                        : status.state === "probable"
                        ? "bg-[#ff8a3d]/20 text-[#ff8a3d] border-[#ff8a3d]/40"
                        : status.state === "watch"
                        ? "bg-[#ffd166]/20 text-[#ffd166] border-[#ffd166]/40"
                        : "bg-[#22e3a0]/20 text-[#22e3a0] border-[#22e3a0]/30"
                    }`}
                  >
                    {status.state} ({probPct}%)
                  </span>
                </div>

                <p className="text-[10px] text-on-surface-variant line-clamp-1 mb-1.5">
                  {status.explanation}
                </p>

                {/* Evidence count badge row */}
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 border-t border-white/5 pt-1">
                  <span>{status.independentSources} independent source types</span>
                  <span>{status.evidence.length} observations active</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
