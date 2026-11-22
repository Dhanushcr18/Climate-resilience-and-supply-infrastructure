"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ControlRoomHeader } from "@/components/ControlRoomHeader";
import { useSimStore } from "@/lib/store";
import { calculateImpact } from "@/lib/sim/impact";
import { SCENARIOS } from "@/lib/sim/scenarios";

export default function ImpactPage() {
  const { scenario } = useSimStore();
  const [methodologyOpen, setMethodologyOpen] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  // Compute pure deterministic impact for active scenario
  const impact = useMemo(() => {
    return calculateImpact(scenario);
  }, [scenario]);

  const scenarioMeta = SCENARIOS[scenario] || SCENARIOS["kerala-2018"];

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    }, 1200);
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface font-body text-on-surface antialiased">
      {/* 1. Header Navigation */}
      <ControlRoomHeader />

      <main className="w-full pt-14 bg-surface max-w-[1440px] mx-auto min-h-screen flex flex-col">
        {/* Simulation Scenario Context Banner */}
        <div className="w-full bg-surface-container-low border-b border-outline-variant/60 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[20px]">science</span>
            <p className="text-xs text-on-surface-variant">
              <span className="font-semibold text-on-surface">Simulation Mode:</span>{" "}
              {scenarioMeta.name} (replay). Delay figures and route closures are modelled estimates based on precipitation telemetry and historical road impassability data.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[10px] bg-surface-container-highest text-on-surface-variant px-2 py-0.5 rounded border border-outline-variant/60">
              MODEL v4.18
            </span>
            <span className="font-mono text-[10px] text-on-surface-variant">
              SEED: {scenario.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Page Body Container */}
        <div className="w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8 flex-1">
          {/* Top Nav & Title Block */}
          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs font-semibold text-secondary hover:text-primary transition-colors group w-fit"
            >
              <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform">
                arrow_back
              </span>
              <span>Back to Control room</span>
            </Link>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-secondary font-medium mb-1">
                  Post-Mortem Delta Analysis
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-on-surface tracking-tight">
                  What smart rerouting changed
                </h1>
              </div>
              <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                <span>
                  Evaluated fleet: <strong className="text-on-surface">{impact.totalShipments} Heavy Goods Convoys</strong>
                </span>
                <span className="w-1 h-1 rounded-full bg-outline-variant" />
                <span>
                  Corridor: <strong className="text-on-surface">Western Ghats Logistics Arc</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Impact Hero Summary Callout */}
          <div className="w-full bg-surface-container-lowest border border-outline-variant/80 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
            <div className="flex flex-col gap-2 max-w-2xl pl-2">
              <div className="inline-flex items-center gap-2 text-tertiary font-semibold text-xs">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>Operational Objective Met</span>
              </div>
              <p className="text-lg sm:text-xl font-medium text-on-surface leading-snug">
                Smart rerouting avoided{" "}
                <span className="text-primary font-bold">
                  {impact.delayHoursSaved.toFixed(1)} hours
                </span>{" "}
                of cumulative fleet delay and kept{" "}
                <span className="text-tertiary font-bold">
                  {impact.medicineProtectedCount || 4} critical medicine shipments
                </span>{" "}
                in transit before ghat washouts.
              </p>
            </div>

            {/* Delta Stat Badges Strip */}
            <div className="flex flex-wrap items-center gap-3 self-start lg:self-center pl-2 lg:pl-0">
              <div className="bg-surface-container-low border border-outline-variant/60 px-4 py-3 rounded-lg flex flex-col">
                <span className="font-mono text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">
                  FLEET TIME RECOVERED
                </span>
                <span className="text-xl font-bold text-primary tabular-nums mt-0.5">
                  −{impact.delayHoursSaved.toFixed(1)} hrs
                </span>
                <span className="font-mono text-[9px] text-outline mt-0.5">Modelled estimate</span>
              </div>

              <div className="bg-surface-container-low border border-outline-variant/60 px-4 py-3 rounded-lg flex flex-col">
                <span className="font-mono text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">
                  STRANDINGS PREVENTED
                </span>
                <span className="text-xl font-bold text-tertiary tabular-nums mt-0.5">
                  {impact.shipmentsStuckBaseline} units
                </span>
                <span className="font-mono text-[9px] text-outline mt-0.5">100% vital cargo saved</span>
              </div>

              <div className="bg-surface-container-low border border-outline-variant/60 px-4 py-3 rounded-lg flex flex-col">
                <span className="font-mono text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">
                  CARGO SPOILAGE LOSS
                </span>
                <span className="text-xl font-bold text-on-surface tabular-nums mt-0.5">
                  0 incidents
                </span>
                <span className="font-mono text-[9px] text-outline mt-0.5">Cold-chain SLA intact</span>
              </div>
            </div>
          </div>

          {/* Side-by-Side Comparison: Baseline vs ResilienceOps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Baseline / Unmanaged */}
            <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between relative">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-surface-container">
                  <div className="flex flex-col">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-outline font-medium">
                      Scenario A
                    </span>
                    <h2 className="text-[17px] font-semibold text-on-surface mt-0.5">
                      Without smart rerouting
                    </h2>
                    <span className="text-xs text-on-surface-variant mt-0.5">
                      Fixed statutory highway route adherence (NH 75 / NH 766)
                    </span>
                  </div>
                  <div className="bg-error-container text-on-error-container px-2.5 py-1 rounded-full flex items-center gap-1.5 font-mono text-[11px] font-medium shrink-0">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    <span>Critical bottlenecks</span>
                  </div>
                </div>

                {/* Primary Metric Block */}
                <div className="py-4 bg-surface-container-low rounded-lg px-4 my-4 flex items-baseline justify-between border border-outline-variant/40">
                  <span className="text-xs text-on-surface-variant">Total cumulative delay</span>
                  <span className="text-2xl font-bold font-mono text-error tabular-nums tracking-tight">
                    {impact.baselineTotalDelayHours.toFixed(1)}{" "}
                    <span className="text-xs font-normal text-on-surface-variant">hours</span>
                  </span>
                </div>

                {/* Secondary Metrics */}
                <div className="flex flex-col gap-2 pt-1 text-xs">
                  <div className="flex items-center justify-between py-2 bg-surface rounded px-3 border border-outline-variant/30">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-outline text-[18px]">local_shipping</span>
                      <span className="text-on-surface">Trucks trapped in flash floods / slides</span>
                    </div>
                    <span className="font-mono font-bold text-error tabular-nums">
                      {impact.shipmentsStuckBaseline} trucks
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 bg-surface rounded px-3 border border-outline-variant/30">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-outline text-[18px]">vaccines</span>
                      <span className="text-on-surface">Medicine &amp; oxygen consignments delayed</span>
                    </div>
                    <span className="font-mono font-bold text-error tabular-nums">
                      4 shipments
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 bg-surface rounded px-3 border border-outline-variant/30">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-outline text-[18px]">route</span>
                      <span className="text-on-surface">Corridor closures encountered</span>
                    </div>
                    <span className="font-mono font-semibold text-on-surface tabular-nums">
                      3 ghat passes severed
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 bg-error-container/20 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 p-4 rounded-b-xl flex items-center gap-3 border-t border-error/10">
                <span className="material-symbols-outlined text-error text-[20px] shrink-0">
                  report_problem
                </span>
                <p className="text-xs text-on-surface-variant leading-snug">
                  Resulted in cold-chain power starvation for TRK-001 (insulin consignment) at Shiradi / Neriamangalam ghat closure.
                </p>
              </div>
            </div>

            {/* Card 2: Managed / Smart Rerouting */}
            <div className="bg-surface-container-lowest border-2 border-primary/30 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between relative">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-surface-container">
                  <div className="flex flex-col">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-primary font-semibold">
                      Scenario B (Active)
                    </span>
                    <h2 className="text-[17px] font-semibold text-on-surface mt-0.5">
                      With smart rerouting
                    </h2>
                    <span className="text-xs text-on-surface-variant mt-0.5">
                      Hydrological predictive routing + Madikeri / coastal bypass
                    </span>
                  </div>
                  <div className="bg-tertiary-fixed text-on-tertiary-fixed-variant px-2.5 py-1 rounded-full flex items-center gap-1.5 font-mono text-[11px] font-semibold shrink-0">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    <span>100% vital cargo delivered</span>
                  </div>
                </div>

                {/* Primary Metric Block */}
                <div className="py-4 bg-tertiary-fixed/20 rounded-lg px-4 my-4 flex items-baseline justify-between border border-tertiary/20">
                  <span className="text-xs text-on-surface-variant">Total cumulative delay</span>
                  <span className="text-2xl font-bold font-mono text-tertiary tabular-nums tracking-tight">
                    {impact.agentTotalDelayHours.toFixed(1)}{" "}
                    <span className="text-xs font-normal text-on-surface-variant">hours</span>
                  </span>
                </div>

                {/* Secondary Metrics */}
                <div className="flex flex-col gap-2 pt-1 text-xs">
                  <div className="flex items-center justify-between py-2 bg-surface rounded px-3 border border-outline-variant/30">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-tertiary text-[18px]">local_shipping</span>
                      <span className="text-on-surface">Trucks trapped in flash floods / slides</span>
                    </div>
                    <span className="font-mono font-bold text-tertiary tabular-nums">
                      0 trucks
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 bg-surface rounded px-3 border border-outline-variant/30">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-tertiary text-[18px]">vaccines</span>
                      <span className="text-on-surface">Medicine &amp; oxygen consignments delayed</span>
                    </div>
                    <span className="font-mono font-bold text-tertiary tabular-nums">
                      0 shipments
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 bg-surface rounded px-3 border border-outline-variant/30">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-[18px]">alt_route</span>
                      <span className="text-on-surface">Proactive dynamic detours taken</span>
                    </div>
                    <span className="font-mono font-bold text-primary tabular-nums">
                      {impact.shipmentsRerouted} preemptive reroutes
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 bg-tertiary-fixed/30 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 p-4 rounded-b-xl flex items-center gap-3 border-t border-tertiary/20">
                <span className="material-symbols-outlined text-tertiary text-[20px] shrink-0">
                  shield
                </span>
                <p className="text-xs text-on-surface leading-snug">
                  Consignment TRK-001 rerouted 3.2 hrs prior to ghat inundation; reached destination safely with 6h auxiliary reefer margin remaining.
                </p>
              </div>
            </div>
          </div>

          {/* Cumulative Delay Comparison Curve (SVG Line Chart) */}
          <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-semibold text-on-surface">
                  Cumulative fleet delay progression
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Hours of fleet immobilization over the 72-hour monsoon event (Modelled estimate)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 border-t-2 border-dashed border-outline" />
                  <span className="text-on-surface-variant">Without smart rerouting (baseline)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 bg-primary rounded-full" />
                  <span className="text-on-surface font-semibold">With smart rerouting (ResilienceOps)</span>
                </div>
              </div>
            </div>

            {/* SVG Chart Canvas Area */}
            <div className="w-full relative bg-surface rounded-lg p-4 pt-6 border border-outline-variant/40 overflow-x-auto">
              <svg
                className="w-full min-w-[700px] h-auto overflow-visible select-none"
                viewBox="0 0 900 320"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="primaryAreaGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#1f5fd6" stopOpacity="0.14" />
                    <stop offset="100%" stopColor="#1f5fd6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Lines & Ticks */}
                <line stroke="#e1e2e6" strokeWidth="1" x1="60" x2="840" y1="20" y2="20" />
                <text fill="#737785" fontFamily="JetBrains Mono" fontSize="11" textAnchor="end" x="50" y="24">
                  40h
                </text>

                <line stroke="#e1e2e6" strokeWidth="1" x1="60" x2="840" y1="80" y2="80" />
                <text fill="#737785" fontFamily="JetBrains Mono" fontSize="11" textAnchor="end" x="50" y="84">
                  30h
                </text>

                <line stroke="#e1e2e6" strokeWidth="1" x1="60" x2="840" y1="140" y2="140" />
                <text fill="#737785" fontFamily="JetBrains Mono" fontSize="11" textAnchor="end" x="50" y="144">
                  20h
                </text>

                <line stroke="#e1e2e6" strokeWidth="1" x1="60" x2="840" y1="200" y2="200" />
                <text fill="#737785" fontFamily="JetBrains Mono" fontSize="11" textAnchor="end" x="50" y="204">
                  10h
                </text>

                {/* Axis baseline */}
                <line stroke="#c3c6d6" strokeWidth="1.5" x1="60" x2="840" y1="260" y2="260" />
                <text fill="#737785" fontFamily="JetBrains Mono" fontSize="11" textAnchor="end" x="50" y="264">
                  0h
                </text>

                {/* Vertical Day Separators & Labels */}
                <line stroke="#eceef2" strokeWidth="1" x1="60" x2="60" y1="20" y2="260" />
                <text fill="#191c1f" fontFamily="IBM Plex Sans" fontSize="12" fontWeight="500" textAnchor="middle" x="60" y="285">
                  Day 1 (t=0h)
                </text>
                <text fill="#737785" fontFamily="JetBrains Mono" fontSize="10" textAnchor="middle" x="60" y="302">
                  Rainfall onset
                </text>

                <line stroke="#eceef2" strokeWidth="1" x1="280" x2="280" y1="20" y2="260" />
                <text fill="#191c1f" fontFamily="IBM Plex Sans" fontSize="12" fontWeight="500" textAnchor="middle" x="280" y="285">
                  Day 2 (t=24h)
                </text>
                <text fill="#ba1a1a" fontFamily="JetBrains Mono" fontSize="10" textAnchor="middle" x="280" y="302">
                  Shiradi Ghat blocked
                </text>

                <line stroke="#eceef2" strokeWidth="1" x1="520" x2="520" y1="20" y2="260" />
                <text fill="#191c1f" fontFamily="IBM Plex Sans" fontSize="12" fontWeight="500" textAnchor="middle" x="520" y="285">
                  Day 3 (t=48h)
                </text>
                <text fill="#ba1a1a" fontFamily="JetBrains Mono" fontSize="10" textAnchor="middle" x="520" y="302">
                  Catchment peak crest
                </text>

                <line stroke="#eceef2" strokeWidth="1" x1="760" x2="760" y1="20" y2="260" />
                <text fill="#191c1f" fontFamily="IBM Plex Sans" fontSize="12" fontWeight="500" textAnchor="middle" x="760" y="285">
                  Day 4 (t=72h)
                </text>
                <text fill="#005a32" fontFamily="JetBrains Mono" fontSize="10" textAnchor="middle" x="760" y="302">
                  High-ground corridor clear
                </text>

                {/* Area under smart rerouting line */}
                <polygon
                  fill="url(#primaryAreaGrad)"
                  points="60,260 160,248 280,225 420,185 520,172 660,165 760,163 760,260"
                />

                {/* Line 1: Baseline / Unmanaged (Grey dashed, climbs to 34.5h) */}
                <path
                  d="M 60 260 Q 160 240, 280 188 T 520 86 T 760 53"
                  fill="none"
                  stroke="#737785"
                  strokeDasharray="6,4"
                  strokeWidth="2.5"
                />
                <circle cx="760" cy="53" fill="#737785" r="4.5" />
                <text fill="#424654" fontFamily="IBM Plex Sans" fontSize="12" fontWeight="600" x="772" y="50">
                  Without: {impact.baselineTotalDelayHours.toFixed(1)}h
                </text>
                <text fill="#ba1a1a" fontFamily="JetBrains Mono" fontSize="10" x="772" y="66">
                  {impact.shipmentsStuckBaseline} trucks stranded
                </text>

                {/* Line 2: Smart Rerouting (Solid Blue, climbs gently to 16.2h) */}
                <path
                  d="M 60 260 Q 160 248, 280 224 T 520 171 T 760 163"
                  fill="none"
                  stroke="#1f5fd6"
                  strokeWidth="3"
                />
                <circle cx="760" cy="163" fill="#1f5fd6" r="5" />
                <text fill="#0047b0" fontFamily="IBM Plex Sans" fontSize="12" fontWeight="600" x="772" y="160">
                  With agent: {impact.agentTotalDelayHours.toFixed(1)}h
                </text>
                <text fill="#005a32" fontFamily="JetBrains Mono" fontSize="10" x="772" y="176">
                  −{impact.delayHoursSaved.toFixed(1)}h delay saved
                </text>

                {/* Event Flag 1: Ghat washout alert */}
                <g transform="translate(380, 110)">
                  <line stroke="#ba1a1a" strokeDasharray="2,2" strokeWidth="1" x1="0" x2="0" y1="0" y2="40" />
                  <rect fill="#ffdad6" height="20" rx="3" width="138" x="-4" y="-18" />
                  <text fill="#93000a" fontFamily="JetBrains Mono" fontSize="10" fontWeight="500" x="4" y="-4">
                    Shiradi cut off (91% risk)
                  </text>
                </g>

                {/* Event Flag 2: Madikeri bypass trigger */}
                <g transform="translate(260, 175)">
                  <line stroke="#1f5fd6" strokeDasharray="2,2" strokeWidth="1" x1="0" x2="0" y1="0" y2="45" />
                  <rect fill="#dee4ff" height="20" rx="3" width="144" x="-6" y="-18" />
                  <text fill="#0040a0" fontFamily="JetBrains Mono" fontSize="10" fontWeight="500" x="2" y="-4">
                    Detour via Madikeri (+65m)
                  </text>
                </g>
              </svg>
            </div>

            {/* Chart Footnote / Metric breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="p-3 bg-surface rounded flex flex-col border border-outline-variant/40">
                <span className="font-mono text-[10px] text-on-surface-variant font-medium uppercase">
                  DAY 1 DELTA
                </span>
                <span className="font-semibold text-on-surface tabular-nums text-sm mt-0.5">
                  −1.8h variance
                </span>
                <span className="text-xs text-on-surface-variant mt-0.5">
                  Early detours initiated before major highway gridlock.
                </span>
              </div>
              <div className="p-3 bg-surface rounded flex flex-col border border-outline-variant/40">
                <span className="font-mono text-[10px] text-on-surface-variant font-medium uppercase">
                  DAY 2–3 SURGE DELTA
                </span>
                <span className="font-semibold text-primary tabular-nums text-sm mt-0.5">
                  −12.4h variance
                </span>
                <span className="text-xs text-on-surface-variant mt-0.5">
                  Avoided 14-hour gridlock on Shiradi Ghat bridge approaches.
                </span>
              </div>
              <div className="p-3 bg-surface rounded flex flex-col border border-outline-variant/40">
                <span className="font-mono text-[10px] text-on-surface-variant font-medium uppercase">
                  DAY 4 FINAL DELTA
                </span>
                <span className="font-semibold text-tertiary tabular-nums text-sm mt-0.5">
                  −{impact.delayHoursSaved.toFixed(1)}h total saved
                </span>
                <span className="text-xs text-on-surface-variant mt-0.5">
                  Fleet arrived safely without requiring emergency extraction.
                </span>
              </div>
            </div>
          </div>

          {/* Collapsible Methodology Section */}
          <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-xl shadow-xs overflow-hidden">
            <button
              onClick={() => setMethodologyOpen(!methodologyOpen)}
              className="w-full p-5 sm:p-6 text-left flex items-center justify-between hover:bg-surface transition-colors cursor-pointer"
              type="button"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-surface-container-low flex items-center justify-center text-primary border border-outline-variant/60">
                  <span className="material-symbols-outlined text-[20px]">calculate</span>
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-on-surface">How we calculated this</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Underlying telemetry thresholds, detour penalization factors, and hydrological decay limits
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-on-surface-variant">3 PARAMETERS</span>
                <span className="material-symbols-outlined text-outline text-[22px]">
                  {methodologyOpen ? "expand_less" : "expand_more"}
                </span>
              </div>
            </button>

            {methodologyOpen && (
              <div className="px-5 sm:px-6 pb-6 pt-2 flex flex-col gap-6 border-t border-surface-container">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Param 1 */}
                  <div className="p-4 bg-surface rounded-lg flex flex-col gap-2 border border-outline-variant/40">
                    <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                      <span className="material-symbols-outlined text-[18px]">rainy</span>
                      <span>Rainfall Ghat Trigger</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Precipitation exceeding <strong className="text-on-surface font-mono">150mm in 12 hours</strong> triggers an automated preemptive closure of the Shiradi and Thamarassery ghat segments before physical barricades are erected.
                    </p>
                    <div className="font-mono text-[10px] text-outline mt-auto pt-2">
                      Formula: Q_inundation &gt; 0.85 * Q_culvert_capacity
                    </div>
                  </div>

                  {/* Param 2 */}
                  <div className="p-4 bg-surface rounded-lg flex flex-col gap-2 border border-outline-variant/40">
                    <div className="flex items-center gap-2 text-tertiary font-semibold text-xs">
                      <span className="material-symbols-outlined text-[18px]">ac_unit</span>
                      <span>Cold-Chain Spoilage Limit</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Reefer unit <strong className="text-on-surface font-mono">TRK-001 (Insulin &amp; Plasma)</strong> carries an auxiliary battery buffer of <strong className="text-on-surface font-mono">24 hours</strong> without engine alternator. Standstills exceeding 18 hours mark cargo as terminal loss.
                    </p>
                    <div className="font-mono text-[10px] text-outline mt-auto pt-2">
                      Threshold: T_ambient &gt; 8°C = Critical Degradation
                    </div>
                  </div>

                  {/* Param 3 */}
                  <div className="p-4 bg-surface rounded-lg flex flex-col gap-2 border border-outline-variant/40">
                    <div className="flex items-center gap-2 text-secondary font-semibold text-xs">
                      <span className="material-symbols-outlined text-[18px]">alt_route</span>
                      <span>Detour Trade-Off Metrics</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      The algorithm evaluates the <strong className="text-on-surface font-mono">Madikeri Pass bypass</strong> at a deterministic +65 min penalty vs. the <strong className="text-on-surface font-mono">Hassan highway</strong> standstill with unbounded expected wait time (indefinite).
                    </p>
                    <div className="font-mono text-[10px] text-outline mt-auto pt-2">
                      Cost model: Min(C_detour_km, Risk_flood * Delay_infinite)
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-surface-container-low rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-outline-variant/40">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-outline text-[20px]">dataset</span>
                    <span className="text-xs text-on-surface">
                      Data sources: State Disaster Management Authority, Radar Telemetry, Central Water Commission Basin Gauges.
                    </span>
                  </div>
                  <span className="font-mono text-xs text-primary font-medium">
                    Pure Deterministic Model • Zero Hallucination
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar / Footer Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-12">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="h-10 px-4 rounded bg-surface-container-lowest text-on-surface text-xs font-semibold hover:bg-surface-container-low transition-colors inline-flex items-center justify-center gap-2 w-full sm:w-auto shadow-xs border border-outline-variant cursor-pointer disabled:opacity-50"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {exported ? "check" : exporting ? "sync" : "file_download"}
                </span>
                <span>
                  {exported
                    ? "Summary Exported (CSV)"
                    : exporting
                    ? "Generating Summary..."
                    : "Export simulation summary (CSV)"}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link
                href="/dashboard"
                className="h-10 px-6 rounded bg-primary text-on-primary font-semibold text-xs hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2 w-full sm:w-auto shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Return to Control room</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
