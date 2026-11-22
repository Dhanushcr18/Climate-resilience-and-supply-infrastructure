"use client";

import React from "react";
import { NetworkEdge } from "@/lib/sim/network";
import { RiskAssessment } from "@/lib/sim/risk";
import { RoadStatus, Observation } from "@/lib/detect/types";
import {
  AlertOctagon,
  Droplets,
  Mountain,
  Gauge,
  Radio,
  Satellite,
  Truck,
  Activity,
  Camera,
  Image as ImageIcon,
  MessageSquare,
  CloudRain,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface RoadPopupProps {
  edge: NetworkEdge;
  assessment: RiskAssessment;
  forecast24h: number[];
  roadStatus?: RoadStatus;
  simT?: number;
}

function getSourceIcon(sourceType: string) {
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

export function RoadPopup({ edge, assessment, forecast24h, roadStatus, simT = 0 }: RoadPopupProps) {
  const maxRain = Math.max(...forecast24h, 5);

  const probPercent = roadStatus ? Math.round(roadStatus.probBlocked * 100) : assessment.score;
  const recentEvidence = roadStatus ? roadStatus.evidence.slice(0, 4) : [];

  return (
    <div className="road-detail-popup p-3 font-body text-xs" style={{ color: "#191c1f", background: "#ffffff", opacity: 1 }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-2 mb-2">
        <div>
          <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block font-medium">
            Corridor Segment
          </span>
          <h4 className="font-semibold text-sm text-on-surface leading-tight">
            {edge.name}
          </h4>
          <span className="text-[10px] text-on-surface-variant font-mono">
            {edge.from} ↔ {edge.to} ({edge.lengthKm} km • {edge.terrain})
          </span>
        </div>

        <div className="text-right">
          <span className="text-lg font-mono font-bold block leading-none text-on-surface">
            {assessment.score}
            <span className="text-[10px] font-normal text-on-surface-variant">/100</span>
          </span>
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase mt-1 border ${
              assessment.isClosed
                ? "bg-error-container text-on-error-container border-error"
                : assessment.level === "severe"
                ? "bg-error-container text-on-error-container border-error"
                : assessment.level === "high"
                ? "bg-[#fdf1eb] text-[#e8590c] border-[#e8590c]/30"
                : assessment.level === "moderate"
                ? "bg-[#fcf6e8] text-[#946c00] border-[#f5da99]"
                : "bg-tertiary-fixed text-on-tertiary-fixed-variant border-tertiary/20"
            }`}
          >
            {assessment.isClosed ? "CLOSED" : assessment.level}
          </span>
        </div>
      </div>

      {/* Multi-source Fused Incident Detection Section */}
      {roadStatus && (
        <div className="mb-2.5 p-2 rounded-xl border border-slate-200 shadow-inner" style={{ background: "#f8fafc", opacity: 1 }}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] text-secondary font-bold uppercase flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
              <span>Fused Incident Detection</span>
            </span>
            <span
              className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold uppercase border ${
                roadStatus.state === "confirmed"
                  ? "bg-[#ff0055]/30 text-[#ff0055] border-[#ff0055]/50 animate-pulse"
                  : roadStatus.state === "probable"
                  ? "bg-[#ff8a3d]/20 text-[#ff8a3d] border-[#ff8a3d]/40"
                  : roadStatus.state === "watch"
                  ? "bg-[#ffd166]/20 text-[#ffd166] border-[#ffd166]/40"
                  : "bg-surface text-on-surface-variant border-white/5"
              }`}
            >
              {roadStatus.state} ({roadStatus.independentSources} sources)
            </span>
          </div>

          <div className="flex items-center justify-between font-mono text-[11px] mb-1.5">
            <span className="text-on-surface-variant">Blockage Confidence:</span>
            <span
              className={`font-bold ${
                probPercent >= 85
                  ? "text-[#ff0055]"
                  : probPercent >= 60
                  ? "text-[#ff8a3d]"
                  : probPercent >= 35
                  ? "text-[#ffd166]"
                  : "text-[#22e3a0]"
              }`}
            >
              {probPercent}% Blocked
            </span>
          </div>

          {/* Mini progress bar */}
          <div className="w-full bg-surface-container-lowest h-1.5 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                probPercent >= 85
                  ? "bg-[#ff0055] shadow-[0_0_8px_#ff0055]"
                  : probPercent >= 60
                  ? "bg-[#ff8a3d]"
                  : probPercent >= 35
                  ? "bg-[#ffd166]"
                  : "bg-[#22e3a0]"
              }`}
              style={{ width: `${probPercent}%` }}
            />
          </div>

          {/* Active Observations List */}
          {recentEvidence.length > 0 ? (
            <div className="space-y-1.5 mt-2 pt-1.5 border-t border-white/5">
              <div className="text-[9px] font-mono text-on-surface-variant uppercase tracking-wider">
                Multi-Source Evidence ({roadStatus.evidence.length} total)
              </div>
              {recentEvidence.map((obs) => {
                const lagMins = Math.round((obs.receivedAtT - obs.observedAtT) * 60);
                return (
                  <div
                    key={obs.id}
                    className="p-1.5 rounded-lg border border-slate-200 flex items-start gap-1.5 text-[10px]"
                    style={{ background: "#ffffff", opacity: 1 }}
                  >
                    <div className="mt-0.5 shrink-0">{getSourceIcon(obs.sourceType)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono font-bold capitalize text-slate-900 truncate">
                          {obs.sourceType.replace("_", " ")}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={`px-1 rounded text-[8px] font-mono font-semibold uppercase ${
                              obs.provenance === "human_verified"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : obs.provenance === "live"
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                : "bg-surface-variant/60 text-slate-400"
                            }`}
                          >
                            {obs.provenance === "human_verified"
                              ? "Verified"
                              : obs.provenance === "live"
                              ? "Live"
                              : "Simulated"}
                          </span>
                          <span
                            className={`px-1 rounded text-[8px] font-mono font-bold uppercase ${
                              obs.claim === "blocked"
                                ? "bg-rose-500/20 text-rose-300"
                                : obs.claim === "degraded"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-emerald-500/20 text-emerald-300"
                            }`}
                          >
                            {obs.claim}
                          </span>
                        </div>
                      </div>
                      <p className="text-[9px] text-on-surface-variant mt-0.5 line-clamp-2">
                        {obs.details}
                      </p>
                      <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 mt-1">
                        <span>Obs: t={obs.observedAtT.toFixed(1)}h</span>
                        <span>Latency: +{lagMins}m</span>
                        <span>Conf: {Math.round(obs.confidence * 100)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-[9px] font-mono text-slate-500 italic mt-1">
              No anomaly signals detected. Corridor nominal.
            </div>
          )}
        </div>
      )}

      {/* Hydrological Components */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px] my-2 font-mono">
        <div className="p-1 rounded border border-slate-200 bg-slate-50 flex items-center space-x-1.5">
          <Droplets className="w-3 h-3 text-primary shrink-0" />
          <div>
            <div className="text-[8px] text-on-surface-variant">Accumulation</div>
            <div className="font-semibold">{assessment.components.accumulation} / 45</div>
          </div>
        </div>

        <div className="p-1 rounded border border-slate-200 bg-slate-50 flex items-center space-x-1.5">
          <Gauge className="w-3 h-3 text-[#ffd166] shrink-0" />
          <div>
            <div className="text-[8px] text-on-surface-variant">Peak Intensity</div>
            <div className="font-semibold">{assessment.components.intensity} / 20</div>
          </div>
        </div>
      </div>

      {/* Recommended Alternate section if road is high-risk / closed */}
      {(assessment.score >= 50 || assessment.isClosed) && (
        <div className="mt-2 p-2 rounded-lg border border-[#22e3a0]/30 space-y-1" style={{ background: "#f0fdfa" }}>
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#22e3a0] font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22e3a0] animate-pulse" />
              THIS IS ALTERNATE ROUTE
            </span>
            <span className="text-on-surface-variant text-[9px]">Autonomous Dispatch</span>
          </div>
          <div className="text-[11px] text-slate-900 font-medium">
            {edge.id === "HAS-MNG"
              ? "Blocked. Recommended alternate for this corridor: via Madikeri (+65 min, risk 46% - Safe corridor)"
              : edge.id === "CLT-WYD"
              ? "Blocked. Recommended alternate for this corridor: via Hassan / Mysore detour (+60 min)"
              : "Blocked. Recommended alternate calculated: rerouting traffic to low-risk parallel corridor"}
          </div>
        </div>
      )}

      {/* 24h Rain forecast mini sparkline bar chart */}
      <div className="mt-2 pt-1.5 border-t border-white/10">
        <div className="flex items-center justify-between text-[9px] font-mono text-on-surface-variant mb-1">
          <span>Forecast 24h Rain (mm/h)</span>
          <span className="text-primary font-bold">{assessment.forecast24hMm} mm</span>
        </div>
        <div className="h-7 flex items-end gap-[2px] bg-surface-container-lowest p-0.5 rounded border border-white/5">
          {forecast24h.map((mm, idx) => {
            const heightPercent = Math.max(8, Math.min(100, (mm / maxRain) * 100));
            return (
              <div
                key={idx}
                className={`flex-1 rounded-t transition-all ${
                  mm > 15
                    ? "bg-[#ff3b5c]"
                    : mm > 5
                    ? "bg-[#ff8a3d]"
                    : mm > 1
                    ? "bg-primary"
                    : "bg-surface-variant"
                }`}
                style={{ height: `${heightPercent}%` }}
                title={`+${idx + 1}h: ${mm} mm/h`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
