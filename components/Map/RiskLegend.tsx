"use client";

import React from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export function RiskLegend() {
  return (
    <div className="absolute bottom-6 left-6 z-[1000] bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-3 shadow-xl text-xs text-slate-200">
      <div className="font-semibold text-slate-300 mb-2 flex items-center justify-between">
        <span className="flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Road Flood / Slide Risk</span>
        </span>
        <span className="text-[10px] text-slate-500 font-mono ml-3">0-100 index</span>
      </div>

      <div className="space-y-1.5 font-mono text-[11px]">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300">Low Risk</span>
          </div>
          <span className="text-slate-500">&lt; 25</span>
        </div>

        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-1.5 rounded-full bg-amber-500" />
            <span className="text-slate-300">Moderate</span>
          </div>
          <span className="text-slate-500">25 - 49</span>
        </div>

        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-1.5 rounded-full bg-orange-500" />
            <span className="text-slate-300">High Risk</span>
          </div>
          <span className="text-slate-500">50 - 74</span>
        </div>

        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-1.5 rounded-full bg-red-500" />
            <span className="text-slate-300">Severe</span>
          </div>
          <span className="text-slate-500">75 - 84</span>
        </div>

        <div className="flex items-center justify-between space-x-4 pt-1 border-t border-slate-800/80">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-1.5 rounded-full bg-red-700 animate-pulse" />
            <span className="text-red-400 font-bold">Closed Road</span>
          </div>
          <span className="text-red-400 font-bold">≥ 85</span>
        </div>
      </div>
    </div>
  );
}
