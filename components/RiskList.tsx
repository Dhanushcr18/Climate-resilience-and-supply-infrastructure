"use client";

import React from "react";
import { EDGES } from "@/lib/sim/network";
import { calculateRiskScore, RiskAssessment } from "@/lib/sim/risk";
import { getRainHistory, getRainForecast, ScenarioId } from "@/lib/sim/scenarios";

interface RiskListProps {
  scenario: ScenarioId;
  simT: number;
  selectedEdgeId: string | null;
  onSelectEdge: (id: string | null) => void;
}

export function RiskList({
  scenario,
  simT,
  selectedEdgeId,
  onSelectEdge,
}: RiskListProps) {
  const rankedEdges = React.useMemo(() => {
    return EDGES.map((edge) => {
      const history = getRainHistory(scenario, edge.id, simT);
      const forecast = getRainForecast(scenario, edge.id, simT, 24);
      const assessment = calculateRiskScore(edge, history, forecast);
      return { edge, assessment };
    }).sort((a, b) => b.assessment.score - a.assessment.score);
  }, [scenario, simT]);

  return (
    <div className="divide-y divide-white/5 overflow-y-auto h-full text-xs">
      {rankedEdges.map(({ edge, assessment }) => {
        const isSelected = selectedEdgeId === edge.id;
        const isClosed = assessment.isClosed;

        let badgeColor = "bg-[#22e3a0]/20 text-[#22e3a0] border-[#22e3a0]/30";
        if (isClosed) badgeColor = "bg-error-container/40 text-error border-error/40 animate-pulse";
        else if (assessment.level === "severe") badgeColor = "bg-error-container/30 text-error border-error/30";
        else if (assessment.level === "high") badgeColor = "bg-secondary-container/30 text-secondary border-secondary/30";
        else if (assessment.level === "moderate") badgeColor = "bg-[#ffd166]/20 text-[#ffd166] border-[#ffd166]/30";

        return (
          <div
            key={edge.id}
            onClick={() => onSelectEdge(edge.id)}
            className={`p-3 cursor-pointer transition ${
              isSelected
                ? "bg-surface-container-high/90 border-l-2 border-primary"
                : "hover:bg-surface-container/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="font-headline font-bold text-on-surface">
                  {edge.name}
                </span>
                <span className="text-[10px] text-on-surface-variant font-mono ml-2">
                  {edge.id} • {edge.terrain}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-sm">
                  {assessment.score}
                  <span className="text-[10px] font-normal text-on-surface-variant">/100</span>
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${badgeColor}`}
                >
                  {isClosed ? "CLOSED" : assessment.level}
                </span>
              </div>
            </div>

            {/* Component micro-bars */}
            <div className="grid grid-cols-4 gap-1 font-mono text-[8px] text-on-surface-variant mt-1.5 mb-1">
              <div className="bg-surface-container px-1 py-0.5 rounded">
                Accum: {assessment.components.accumulation}/45
              </div>
              <div className="bg-surface-container px-1 py-0.5 rounded">
                Peak: {assessment.components.intensity}/20
              </div>
              <div className="bg-surface-container px-1 py-0.5 rounded">
                Slope: {assessment.components.terrain}/25
              </div>
              <div className="bg-surface-container px-1 py-0.5 rounded">
                Sat: {assessment.components.saturation}/10
              </div>
            </div>

            <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-1">
              {assessment.reason}
            </p>
          </div>
        );
      })}
    </div>
  );
}
