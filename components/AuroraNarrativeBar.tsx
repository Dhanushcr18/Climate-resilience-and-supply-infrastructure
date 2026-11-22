"use client";

import React, { useState } from "react";
import { Play, Pause, Volume2, VolumeX, GitCompare, Brain } from "lucide-react";
import { useSimStore } from "@/lib/store";

interface AuroraNarrativeBarProps {
  onInspectDecision?: () => void;
}

export function AuroraNarrativeBar({ onInspectDecision }: AuroraNarrativeBarProps) {
  const { isPlaying, togglePlay, mode, toggleMode, simT } = useSimStore();
  const [muted, setMuted] = useState(false);

  // Dynamic contextual narrative step based on current sim time
  let stepText = "MONSOON DEPRESSION SENSING";
  let stepNum = 1;
  let narrativeSubtitle =
    "Precipitation radar streams initialized across Western Ghats corridors. Ingesting 24h past gauge data and 24h predictive hourly forecast.";

  if (simT >= 15 && simT < 28) {
    stepNum = 2;
    stepText = "PREDICTIVE HAZARD SURGE DETECTED";
    narrativeSubtitle =
      'Autonomous Agent: "91% landslide and flood probability detected on NH-75 Shiradi Ghat. Initiating proactive reroute via Mysuru-Coimbatore for Life-Saving Insulin batch TRK-001 before road closure..."';
  } else if (simT >= 28 && simT < 45) {
    stepNum = 3;
    stepText = "CORRIDOR CLOSURE & DETOUR IN PROGRESS";
    narrativeSubtitle =
      'Autonomous Agent: "Shiradi Ghat sustained closure (≥85% risk). Rerouted medical payload TRK-001 safely navigating alternative corridor. Blind baseline truck would now be immobilized for 12+ hours."';
  } else if (simT >= 45) {
    stepNum = 4;
    stepText = "POST-EVENT RESILIENCE IMPACT";
    narrativeSubtitle =
      'Autonomous Agent: "Emergency cargo successfully delivered to Mangaluru. Comparative analysis records 18.4 hours of critical supply chain delay prevented (Modelled estimate)."';
  }

  return (
    <div className="relative bg-surface-container-low/85 backdrop-blur-2xl rounded-xl p-3 shadow-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-container" />

      {/* Narrative Play State & Live Subtitle */}
      <div className="flex items-center gap-3 w-full md:w-auto min-w-0">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(20,241,217,0.35)] hover:scale-105 transition-transform cursor-pointer"
          title={isPlaying ? "Pause Scenario Walkthrough" : "Play Scenario Walkthrough"}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.2 rounded bg-secondary-container/50 text-secondary font-mono text-[9px] border border-secondary/30">
              SCENARIO WALKTHROUGH • STEP {stepNum} OF 4 ({stepText})
            </span>
            <span className="font-mono text-[10px] text-primary">
              sim t={simT.toFixed(1)}h
            </span>
          </div>
          <p className="font-body text-xs text-on-surface truncate md:text-wrap leading-tight mt-1">
            <strong className="text-primary font-semibold">Autonomous Core:</strong>{" "}
            {narrativeSubtitle}
          </p>
        </div>
      </div>

      {/* Quick Context Actions */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
        {onInspectDecision && (
          <button
            onClick={onInspectDecision}
            className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-body text-xs font-medium transition-colors flex items-center gap-1.5 border border-white/5"
          >
            <Brain className="w-3.5 h-3.5 text-secondary" />
            <span>Inspect Decision</span>
          </button>
        )}

        <button
          onClick={toggleMode}
          className={`px-3 py-1.5 rounded-lg font-body text-xs font-medium transition-colors flex items-center gap-1.5 border ${
            mode === "agent"
              ? "bg-surface-container-high hover:bg-surface-container-highest text-on-surface border-white/5"
              : "bg-error-container/40 text-error border-error/30"
          }`}
          title="Toggle Baseline Comparison"
        >
          <GitCompare className="w-3.5 h-3.5 text-primary" />
          <span>{mode === "agent" ? "Toggle Baseline" : "Return to Agent"}</span>
        </button>

        <button
          onClick={() => setMuted(!muted)}
          className="p-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors border border-white/5"
          title={muted ? "Unmute Audio" : "Mute Audio"}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
