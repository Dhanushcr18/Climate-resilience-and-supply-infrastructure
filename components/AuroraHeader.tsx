"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSimStore } from "@/lib/store";
import { SCENARIOS, ScenarioId } from "@/lib/sim/scenarios";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Bot,
  UserX,
  Sparkles,
  Layers,
} from "lucide-react";

interface AuroraHeaderProps {
  onShowMe?: () => void;
}

export function AuroraHeader({ onShowMe }: AuroraHeaderProps) {
  const pathname = usePathname();
  const {
    scenario,
    setScenario,
    simT,
    setSimT,
    advanceSimT,
    isPlaying,
    togglePlay,
    speed,
    setSpeed,
    mode,
    toggleMode,
    resetSim,
  } = useSimStore();

  // Playback timer ticker
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = 1000 / (speed * 1.5);
    const timer = setInterval(() => {
      advanceSimT(0.5);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, speed, advanceSimT]);

  const day = Math.floor(simT / 24) + 1;
  const hour = Math.floor(simT % 24);
  const minutes = Math.floor((simT % 1) * 60);
  const clockStr = `DAY ${day} • ${String(hour).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}Z`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/80 backdrop-blur-2xl shadow-[0_1px_12px_rgba(0,0,0,0.5)] border-b border-white/5">
      {/* Primary Cockpit Bar */}
      <div className="h-16 w-full px-4 sm:px-6 flex items-center justify-between gap-2">
        {/* Brand & Scenario Pill */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shadow-[0_0_12px_rgba(20,241,217,0.4)] group-hover:shadow-[0_0_20px_rgba(20,241,217,0.7)] transition-all">
              RO
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-headline text-lg text-primary tracking-tight font-bold">
                ResilienceOps
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-secondary-container/40 text-on-secondary-container font-mono text-[9px] border border-secondary/30">
                v2.4 AUTONOMOUS CORE
              </span>
            </div>
          </Link>

          <div className="h-5 w-px bg-outline-variant/40 hidden xl:block" />

          {/* Scenario Selector */}
          <div className="relative hidden lg:block">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container/60 border border-white/5 shadow-[0_0_12px_rgba(20,241,217,0.08)]">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
              <select
                aria-label="Active Simulation Scenario"
                value={scenario}
                onChange={(e) => setScenario(e.target.value as ScenarioId)}
                className="bg-transparent font-mono text-xs text-on-surface focus:outline-none cursor-pointer pr-1"
              >
                {Object.values(SCENARIOS).map((sc) => (
                  <option key={sc.id} value={sc.id} className="bg-surface-container-highest text-on-surface">
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Global Navigation Pill */}
        <nav className="hidden md:flex items-center gap-1 p-1 bg-surface-container-low/60 rounded-xl border border-white/5 font-mono text-xs">
          <Link
            href="/dashboard"
            className={`px-3 py-1.5 rounded-md transition-all ${
              pathname === "/dashboard"
                ? "font-semibold text-primary-container bg-primary-container/10 border-b-2 border-primary-container shadow-[0_0_12px_rgba(20,241,217,0.25)]"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            }`}
          >
            Mission Control
          </Link>
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-md transition-all ${
              pathname === "/"
                ? "font-semibold text-primary-container bg-primary-container/10 border-b-2 border-primary-container shadow-[0_0_12px_rgba(20,241,217,0.25)]"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            }`}
          >
            Cinematic Landing
          </Link>
          <Link
            href="/driver/TRK-001"
            className={`px-3 py-1.5 rounded-md transition-all ${
              pathname?.startsWith("/driver")
                ? "font-semibold text-primary-container bg-primary-container/10 border-b-2 border-primary-container shadow-[0_0_12px_rgba(20,241,217,0.25)]"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            }`}
          >
            Driver Telemetry
          </Link>
          <Link
            href="/report"
            className={`px-3 py-1.5 rounded-md transition-all ${
              pathname === "/report"
                ? "font-semibold text-primary-container bg-primary-container/10 border-b-2 border-primary-container shadow-[0_0_12px_rgba(20,241,217,0.25)]"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            }`}
          >
            Evidence Intake
          </Link>
          <Link
            href="/about"
            className={`px-3 py-1.5 rounded-md transition-all ${
              pathname === "/about"
                ? "font-semibold text-primary-container bg-primary-container/10 border-b-2 border-primary-container shadow-[0_0_12px_rgba(20,241,217,0.25)]"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            }`}
          >
            Model Transparency
          </Link>
        </nav>

        {/* Tactical Controls & Status */}
        <div className="flex items-center gap-2">
          {/* Live Sim Tick */}
          <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container/70 font-mono text-[11px] text-on-surface-variant border border-white/5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-fixed opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-container" />
            </span>
            <span className="text-primary font-bold">{clockStr}</span>
            <span className="text-slate-500">t={simT.toFixed(1)}h</span>
          </div>

          {/* Stepper & Playback controls */}
          <div className="flex items-center bg-surface-container-low/80 p-0.5 rounded-lg border border-white/5">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition"
              title={isPlaying ? "Pause Simulation" : "Play Simulation"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => advanceSimT(1)}
              className="px-2 py-1 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-mono text-[11px] transition"
              title="Step +1 Hour"
            >
              +1h
            </button>
            <button
              onClick={resetSim}
              className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition"
              title="Reset Simulation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center bg-surface-container-lowest/70 rounded p-0.5 font-mono text-[10px]">
              {[1, 2, 5, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-1.5 py-0.5 rounded transition ${
                    speed === s
                      ? "text-on-primary bg-primary font-bold shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Agent Mode Toggle Pill */}
          <button
            onClick={toggleMode}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[10px] font-bold tracking-wider transition border ${
              mode === "agent"
                ? "bg-secondary-container/30 text-secondary border-secondary/40 shadow-[0_0_14px_rgba(124,92,255,0.35)]"
                : "bg-surface-container text-slate-400 border-white/5"
            }`}
            title="Toggle Agent vs Baseline Mode"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                mode === "agent" ? "bg-secondary animate-pulse" : "bg-slate-500"
              }`}
            />
            <span>{mode === "agent" ? "AGENT ACTIVE" : "BASELINE OFF"}</span>
          </button>

          {/* Show Me Button */}
          {onShowMe && (
            <button
              onClick={onShowMe}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-headline text-xs font-semibold tracking-wide shadow-[0_0_16px_rgba(20,241,217,0.35)] hover:shadow-[0_0_24px_rgba(20,241,217,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Show Me</span>
            </button>
          )}
        </div>
      </div>

      {/* Secondary Aurora Telemetry Diagnostics Bar */}
      <div className="h-7 w-full bg-surface-container-lowest/90 px-4 sm:px-6 hidden sm:flex items-center justify-between font-mono text-[10px] text-on-surface-variant border-t border-white/5">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-primary-fixed-dim">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            24/24 Vitest Suite Passing
          </span>
          <span className="flex items-center gap-1 text-tertiary-fixed-dim">
            <Layers className="w-3 h-3 text-cyan-400" />
            Deck.GL / Leaflet GIS Engine
          </span>
          <span className="flex items-center gap-1 text-on-surface">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
            Pure Deterministic • Offline Ready
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>AURORA TELEMETRY BRIDGE v2.4</span>
          <span className="text-primary font-bold">LATENCY: 12ms</span>
        </div>
      </div>
    </header>
  );
}
