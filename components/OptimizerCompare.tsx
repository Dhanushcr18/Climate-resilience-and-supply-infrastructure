"use client";

import React, { useState } from "react";
import { buildScenarioOptimizationRequest } from "@/lib/optimizer/request";
import { ScenarioId } from "@/lib/sim/scenarios";

interface CompareResult {
  cuoptConfigured: boolean;
  builtin: any;
  cuopt?: any | null;
  fallback?: any | null;
  error?: string;
}

export function OptimizerCompare({ scenario, simT }: { scenario: ScenarioId; simT: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);

  async function compare() {
    setLoading(true);
    setOpen(true);
    try {
      const optimizerRequest = buildScenarioOptimizationRequest({ scenario, nowT: simT });
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: optimizerRequest, compare: true }),
      });
      setResult(await response.json());
    } catch {
      setResult({ cuoptConfigured: false, builtin: null, error: "Comparison request failed" });
    } finally {
      setLoading(false);
    }
  }

  function metrics(plan: any) {
    const assignments = plan?.assignments ?? [];
    const stopArrivals = assignments.flatMap((assignment: any) =>
      (assignment.sequence ?? []).map((stop: any) => stop.arrivalT)
    );
    const deliveryArrivals = assignments.flatMap((assignment: any) =>
      (assignment.sequence ?? []).filter((stop: any) => stop.kind === "delivery").map((stop: any) => stop.arrivalT)
    );
    const maxArrival = deliveryArrivals.length ? Math.max(...deliveryArrivals) : 0;
    const totalDelay = deliveryArrivals.reduce((sum: number, arrival: number) => sum + Math.max(0, arrival - simT), 0);
    return {
      deliveryTime: maxArrival ? `${maxArrival.toFixed(1)}h` : "—",
      totalDelay: `${totalDelay.toFixed(1)}h`,
      unserved: plan?.unassignedOrders?.length ?? 0,
    };
  }

  const builtinMetrics = metrics(result?.builtin);
  const cuoptMetrics = metrics(result?.cuopt);

  return (
    <>
      <button
        onClick={compare}
        className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-semibold text-on-surface hover:bg-surface-container"
      >
        Compare optimizers
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl rounded-2xl bg-surface-container-lowest border border-outline-variant p-5" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-bold text-on-surface">Compare optimizers</h2>
              <button onClick={() => setOpen(false)} className="text-on-surface-variant">Close</button>
            </div>
            {loading ? (
              <p className="mt-4 text-xs text-on-surface-variant">Running both planners on the same scenario...</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                {result?.error ? (
                  <p className="text-xs text-error">{result.error}</p>
                ) : (
                  <table className="w-full text-xs text-on-surface">
                    <thead className="text-on-surface-variant">
                      <tr><th className="text-left py-2">Metric</th><th>Built-in</th><th>NVIDIA cuOpt</th></tr>
                    </thead>
                    <tbody>
                      {[
                        ["Latest delivery", builtinMetrics.deliveryTime, cuoptMetrics.deliveryTime],
                        ["Total delay", builtinMetrics.totalDelay, cuoptMetrics.totalDelay],
                        ["Unserved orders", builtinMetrics.unserved, cuoptMetrics.unserved],
                      ].map((row) => (
                        <tr key={String(row[0])} className="border-t border-outline-variant/50">
                          <td className="py-3 text-on-surface-variant">{row[0]}</td>
                          <td className="py-3 text-center font-mono">{row[1]}</td>
                          <td className="py-3 text-center font-mono">{result?.cuoptConfigured ? row[2] : "Not configured"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
