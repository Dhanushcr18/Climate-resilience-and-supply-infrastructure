"use client";

import React, { useEffect } from "react";
import { useSimStore } from "@/lib/store";
import { ScenarioId, SCENARIOS } from "@/lib/sim/scenarios";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Bot,
  UserX,
  Layers,
  Sparkles,
  Sun,
  Moon,
  Info,
} from "lucide-react";
import Link from "next/link";

interface TopBarProps {
  onShowMe?: () => void;
}

export function TopBar({ onShowMe }: TopBarProps) {
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
    showHeatmap,
    setShowHeatmap,
    theme,
    toggleTheme,
  } = useSimStore();

  // Playback timer ticker
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = 1000 / (speed * 1.5); // smooth tick speed
    const timer = setInterval(() => {
      advanceSimT(0.5);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, speed, advanceSimT]);

  // Compute readable clock string (e.g. Day 2, 14:00)
  const day = Math.floor(simT / 24) + 1;
  const hour = Math.floor(simT % 24);
  const minutes = Math.floor((simT % 1) * 60);
  const clockStr = `Day ${day}, ${String(hour).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}`;

  return (
    <header className="bg-slate-900/95 border-b border-slate-800 text-slate-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md z-20">
      {/* Brand & Scenario */}
      <div className="flex items-center space-x-3">
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow shadow-blue-500/20 group-hover:bg-blue-500 transition">
            R
          </div>
          <span className="font-extrabold tracking-tight text-white hidden sm:inline">
            ResilienceOps
          </span>
        </Link>

        {/* Prominent Simulated Badge */}
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
          Simulated
        </span>

        {/* Scenario Selector */}
        <div className="flex items-center space-x-1.5 ml-2">
          <label htmlFor="scenario-select" className="text-xs text-slate-400 font-medium hidden md:inline">
            Scenario:
          </label>
          <select
            id="scenario-select"
            value={scenario}
            onChange={(e) => setScenario(e.target.value as ScenarioId)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            {Object.values(SCENARIOS).map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clock & Playback Controls */}
      <div className="flex items-center space-x-3 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl">
        <div className="text-center font-mono">
          <div className="text-xs font-bold text-blue-400 tracking-wider">
            {clockStr}
          </div>
          <div className="text-[10px] text-slate-500">
            t = {simT.toFixed(1)}h / 72h
          </div>
        </div>

        <div className="h-6 w-px bg-slate-800" />

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition shadow shadow-blue-600/30"
          title={isPlaying ? "Pause simulation" : "Play simulation"}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        {/* Step Forward */}
        <button
          onClick={() => advanceSimT(1)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          title="Step +1 Hour"
        >
          <FastForward className="w-4 h-4" />
        </button>

        {/* Reset */}
        <button
          onClick={resetSim}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          title="Reset Simulation"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Speed multiplier */}
        <select
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 text-[11px] font-mono rounded px-1.5 py-1 text-slate-300 focus:outline-none"
        >
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={5}>5x</option>
          <option value={10}>10x</option>
        </select>
      </div>

      {/* Time Slider */}
      <div className="hidden lg:flex items-center space-x-2 w-48">
        <span className="text-[10px] font-mono text-slate-500">0h</span>
        <input
          type="range"
          min={0}
          max={72}
          step={0.5}
          value={simT}
          onChange={(e) => setSimT(parseFloat(e.target.value))}
          className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />
        <span className="text-[10px] font-mono text-slate-500">72h</span>
      </div>

      {/* Mode & Action Toggles */}
      <div className="flex items-center space-x-2">
        {/* "Show Me" Best Demo Moment Button */}
        {onShowMe && (
          <button
            onClick={onShowMe}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:opacity-90 text-white shadow-md shadow-blue-500/20 flex items-center space-x-1.5 transition animate-pulse"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Show me</span>
          </button>
        )}

        {/* Agent ON / OFF Toggle */}
        <button
          onClick={toggleMode}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition border ${
            mode === "agent"
              ? "bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-sm shadow-blue-500/10"
              : "bg-slate-800/80 border-slate-700 text-slate-400"
          }`}
          title="Toggle between autonomous agent rerouting and baseline blind routing"
        >
          {mode === "agent" ? (
            <>
              <Bot className="w-4 h-4 text-blue-400" />
              <span>Agent ON</span>
            </>
          ) : (
            <>
              <UserX className="w-4 h-4 text-slate-400" />
              <span>Agent OFF (Baseline)</span>
            </>
          )}
        </button>

        {/* Radar Heatmap Toggle */}
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`p-1.5 rounded-lg border transition ${
            showHeatmap
              ? "bg-blue-900/30 border-blue-600 text-blue-300"
              : "bg-slate-800 border-slate-700 text-slate-400"
          }`}
          title="Toggle Rain Radar Overlay"
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          title="Toggle Theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <Link
          href="/about"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          title="About & Assumptions"
        >
          <Info className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}
