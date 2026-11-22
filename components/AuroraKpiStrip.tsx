"use client";

import React from "react";
import { TrendingUp, AlertTriangle, Cpu, Mountain, ShieldCheck } from "lucide-react";

interface AuroraKpiStripProps {
  delaySavedHours: number;
  atRiskCount: number;
  criticalAtRiskCount: number;
  totalShipments: number;
  decisionCount: number;
  rerouteCount: number;
  holdCount: number;
  escalateCount: number;
  highestRiskCorridorName: string;
  highestRiskScore: number;
  isClosed: boolean;
  secondaryRiskCorridorName?: string;
  secondaryRiskScore?: number;
}

export function AuroraKpiStrip({
  delaySavedHours,
  atRiskCount,
  criticalAtRiskCount,
  totalShipments,
  decisionCount,
  rerouteCount,
  holdCount,
  escalateCount,
  highestRiskCorridorName,
  highestRiskScore,
  isClosed,
  secondaryRiskCorridorName = "Charmadi Bypass",
  secondaryRiskScore = 64,
}: AuroraKpiStripProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {/* KPI 1: Delay Hours Saved */}
      <div className="relative bg-surface-container-low/70 backdrop-blur-xl p-3.5 rounded-xl shadow-lg border border-white/5 flex flex-col justify-between overflow-hidden group">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
            Delay Hours Saved
          </span>
          <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary font-mono text-[9px] tracking-tight border border-secondary/20">
            Modelled estimate
          </span>
        </div>
        <div className="flex items-baseline gap-2 my-1">
          <span className="font-mono text-2xl font-bold text-secondary tracking-tight drop-shadow-[0_0_12px_rgba(202,190,255,0.4)]">
            {delaySavedHours.toFixed(1)}
            <span className="text-xs font-normal text-on-surface-variant ml-0.5">hrs</span>
          </span>
          <span className="font-mono text-[11px] text-primary font-semibold flex items-center">
            <TrendingUp className="w-3 h-3 mr-0.5 text-primary-container" />
            +38.4%
          </span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <span className="text-[11px] text-on-surface-variant truncate">
            vs Baseline Static Pathing
          </span>
          <div
            className="w-16 h-4 shrink-0 overflow-hidden flex items-center justify-end"
            style={{ width: "64px", height: "16px", minWidth: "64px", maxWidth: "64px", minHeight: "16px", maxHeight: "16px" }}
          >
            <svg
              className="text-secondary block"
              width="64"
              height="16"
              fill="none"
              viewBox="0 0 64 16"
              style={{
                width: "64px",
                height: "16px",
                minWidth: "64px",
                maxWidth: "64px",
                minHeight: "16px",
                maxHeight: "16px",
                display: "block",
              }}
            >
              <path
                d="M0 13L12 11L24 14L36 7L48 5L64 1"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.75"
              />
              <path
                d="M0 13L12 11L24 14L36 7L48 5L64 1V16H0Z"
                fill="currentColor"
                fillOpacity="0.12"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* KPI 2: At-Risk Shipments */}
      <div className="bg-surface-container-low/70 backdrop-blur-xl p-3.5 rounded-xl shadow-lg border border-white/5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
            At-Risk Shipments
          </span>
          <span className="px-1.5 py-0.5 rounded bg-error-container/40 text-error font-mono text-[10px] animate-pulse font-semibold border border-error/30">
            {criticalAtRiskCount > 0 ? `${criticalAtRiskCount} CRITICAL` : "NOMINAL"}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5 my-1">
          <span className="font-mono text-2xl text-on-surface font-bold">
            {String(atRiskCount).padStart(2, "0")}
            <span className="text-sm font-normal text-on-surface-variant">
              {" "}
              / {totalShipments}
            </span>
          </span>
          <span className="font-mono text-[10px] text-error bg-error/10 px-1.5 py-0.5 rounded border border-error/20">
            High Hazard
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/5">
          <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-surface-container-high px-2 py-0.5 rounded text-error border border-error/20">
            <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />
            TRK-001 (Insulin)
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-surface-container-high px-2 py-0.5 rounded text-secondary border border-secondary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            TRK-003 (Plasma)
          </span>
        </div>
      </div>

      {/* KPI 3: Autonomous Decisions */}
      <div className="bg-surface-container-low/70 backdrop-blur-xl p-3.5 rounded-xl shadow-lg border border-white/5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
            Autonomous Decisions
          </span>
          <Cpu className="w-4 h-4 text-secondary" />
        </div>
        <div className="flex items-baseline gap-2 my-1">
          <span className="font-mono text-2xl text-primary font-bold">
            {decisionCount}
          </span>
          <span className="font-mono text-[10px] text-on-surface-variant">Active Corridor</span>
        </div>
        <div className="grid grid-cols-3 gap-1 pt-1 text-center font-mono text-[10px] border-t border-white/5">
          <div className="bg-surface-container-high/60 rounded py-0.5 text-primary">
            {rerouteCount} Reroute
          </div>
          <div className="bg-surface-container-high/60 rounded py-0.5 text-secondary">
            {holdCount} Held
          </div>
          <div className="bg-surface-container-high/60 rounded py-0.5 text-error">
            {escalateCount} Escalate
          </div>
        </div>
      </div>

      {/* KPI 4: Critical Corridor Risk */}
      <div className="bg-surface-container-low/70 backdrop-blur-xl p-3.5 rounded-xl shadow-lg border border-white/5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
            Corridor Vulnerability
          </span>
          <Mountain className="w-4 h-4 text-error" />
        </div>
        <div className="space-y-1.5 my-1">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-error font-medium truncate">
              {highestRiskCorridorName}
            </span>
            <span className="text-error font-bold">
              {highestRiskScore}% • {isClosed ? "CLOSED" : "ALERT"}
            </span>
          </div>
          <div className="w-full bg-surface-container-highest rounded-full h-1 overflow-hidden">
            <div
              className="bg-error h-full rounded-full transition-all duration-500"
              style={{ width: `${highestRiskScore}%` }}
            />
          </div>
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className="text-on-surface-variant truncate">
              {secondaryRiskCorridorName}
            </span>
            <span className="text-secondary font-medium">
              {secondaryRiskScore}% WATCH
            </span>
          </div>
        </div>
        <div className="w-full bg-surface-container-highest rounded-full h-1 overflow-hidden">
          <div
            className="bg-secondary h-full rounded-full"
            style={{ width: `${secondaryRiskScore}%` }}
          />
        </div>
      </div>

      {/* KPI 5: Network Integrity */}
      <div className="bg-surface-container-low/70 backdrop-blur-xl p-3.5 rounded-xl shadow-lg border border-white/5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
            Network Integrity
          </span>
          <span className="flex items-center gap-1 font-mono text-[9px] text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            LOCKED
          </span>
        </div>
        <div className="flex items-baseline gap-2 my-1">
          <span className="font-mono text-2xl text-on-surface font-bold">
            98.4<span className="text-sm font-normal text-on-surface-variant">%</span>
          </span>
          <span className="text-[11px] text-primary-fixed-dim">Nodes Synchronized</span>
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] text-on-surface-variant pt-1 border-t border-white/5">
          <span>Clock Jitter: 0.04ms</span>
          <span className="text-primary font-bold">STABLE</span>
        </div>
      </div>
    </div>
  );
}
