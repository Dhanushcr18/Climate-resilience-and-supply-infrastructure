"use client";

import React from "react";
import { useSimStore } from "@/lib/store";

export function ControlRoomTimeBar() {
  const {
    simT,
    setSimT,
    advanceSimT,
    isPlaying,
    togglePlay,
    speed,
    setSpeed,
    mode,
    toggleMode,
  } = useSimStore();

  // Active Playback Simulation Timer (Moves trucks synchronously)
  React.useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = Math.max(100, Math.round(1000 / (speed * 1.5)));
    const timer = setInterval(() => {
      advanceSimT(0.25);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, speed, advanceSimT]);

  const day = Math.floor(simT / 24) + 1;
  const hour = Math.floor(simT % 24);
  const min = Math.floor((simT % 1) * 60);
  const timeFormatted = `Day ${day}, ${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;

  const progressPercent = Math.min(100, Math.max(0, (simT / 72) * 100));

  return (
    <footer className="absolute bottom-0 left-0 right-0 h-12 bg-surface-container-lowest border-t border-outline-variant flex items-center justify-between px-4 z-30 shadow-md">
      {/* Left Section: Playback controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-7 h-7 rounded bg-surface-container text-on-surface flex items-center justify-center hover:bg-surface-container-high transition-colors cursor-pointer border border-outline-variant/60"
          title={isPlaying ? "Pause simulation" : "Play simulation"}
        >
          <span className="material-symbols-outlined text-[16px]">
            {isPlaying ? "pause" : "play_arrow"}
          </span>
        </button>

        <span className="font-mono text-xs font-semibold text-on-surface whitespace-nowrap">
          {timeFormatted}
        </span>

        {/* Speed Selectors */}
        <div className="flex items-center gap-1 ml-1 bg-surface-container-low p-0.5 rounded border border-outline-variant/40">
          {[1, 2, 5].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold transition-colors cursor-pointer ${
                speed === s
                  ? "bg-surface-container-lowest text-on-surface shadow-xs font-bold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Center Section: Timeline Scrubber Track */}
      <div className="flex-1 max-w-xl mx-4 sm:mx-6 flex items-center gap-3">
        <div
          className="relative w-full h-2 bg-surface-container-high rounded-full flex items-center cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickFraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setSimT(Math.round(clickFraction * 72 * 2) / 2);
          }}
        >
          {/* Progress Fill */}
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Handle */}
          <div
            className="absolute w-3.5 h-3.5 bg-surface-container-lowest rounded-full border border-primary shadow-sm"
            style={{ left: `calc(${progressPercent}% - 7px)` }}
          />

          {/* Incident Markers on Timeline */}
          <div
            className="absolute w-2 h-2 rounded-full bg-on-surface-variant"
            style={{ left: "25%" }}
            title="Heavy rain warning (t=18h)"
          />
          <div
            className="absolute w-2 h-2 rounded-full bg-error"
            style={{ left: "45%" }}
            title="NH75 Shiradi Ghat flooded (t=32h)"
          />
        </div>

        <span className="text-[11px] font-mono text-on-surface-variant hidden md:inline">
          72h Event
        </span>
      </div>

      {/* Right Section: Smart Dispatch Toggle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-on-surface font-medium whitespace-nowrap">
            Smart rerouting:{" "}
            <span className={`font-semibold ${mode === "agent" ? "text-tertiary" : "text-error"}`}>
              {mode === "agent" ? "Active" : "Off"}
            </span>
          </span>

          {/* Toggle control */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={mode === "agent"}
              onChange={toggleMode}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-tertiary"></div>
          </label>
        </div>

        <span className="text-outline text-[11px] hidden xl:inline">
          Turn off to simulate unmitigated disruptions
        </span>
      </div>
    </footer>
  );
}
