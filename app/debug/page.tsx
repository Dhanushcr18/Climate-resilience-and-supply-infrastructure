import { EDGES } from "@/lib/sim/network";
import { getRainHistory, getRainForecast } from "@/lib/sim/scenarios";
import { calculateRiskScore } from "@/lib/sim/risk";
import Link from "next/link";

export default function DebugPage() {
  const scenario = "kerala-2018";
  const t = 36; // Peak time for Kerala-2018

  const edgeRisks = EDGES.map((edge) => {
    const history = getRainHistory(scenario, edge.id, t);
    const forecast = getRainForecast(scenario, edge.id, t, 24);
    const assessment = calculateRiskScore(edge, history, forecast);
    return {
      edge,
      assessment,
    };
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-mono text-sm">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-blue-400">
              ResilienceOps M1 Debug: Edge Risk Matrix
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Scenario: <span className="text-amber-400">{scenario}</span> | Sim Time:{" "}
              <span className="text-emerald-400">t = {t}h</span> (Peak Surge)
            </p>
          </div>
          <Link
            href="/"
            className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60 shadow">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3">Edge ID</th>
                <th className="p-3">Corridor Name</th>
                <th className="p-3">Terrain</th>
                <th className="p-3">Vuln</th>
                <th className="p-3">48h Rain</th>
                <th className="p-3">Peak mm/h</th>
                <th className="p-3">Score (0-100)</th>
                <th className="p-3">Level</th>
                <th className="p-3">Closed?</th>
                <th className="p-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {edgeRisks.map(({ edge, assessment }) => {
                const badgeColor =
                  assessment.level === "severe"
                    ? "bg-red-950/80 text-red-300 border-red-700"
                    : assessment.level === "high"
                    ? "bg-orange-950/80 text-orange-300 border-orange-700"
                    : assessment.level === "moderate"
                    ? "bg-amber-950/80 text-amber-300 border-amber-700"
                    : "bg-emerald-950/80 text-emerald-300 border-emerald-700";

                return (
                  <tr
                    key={edge.id}
                    className="hover:bg-slate-800/40 transition"
                  >
                    <td className="p-3 font-semibold text-slate-200">{edge.id}</td>
                    <td className="p-3">{edge.name}</td>
                    <td className="p-3 capitalize">{edge.terrain}</td>
                    <td className="p-3">{edge.vulnerability.toFixed(2)}</td>
                    <td className="p-3">{assessment.rain48hMm} mm</td>
                    <td className="p-3">{assessment.peakIntensityMmPerHour} mm/h</td>
                    <td className="p-3 font-bold">
                      <span className="text-base">{assessment.score}</span>/100
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${badgeColor}`}
                      >
                        {assessment.level}
                      </span>
                    </td>
                    <td className="p-3">
                      {assessment.isClosed ? (
                        <span className="text-red-400 font-bold bg-red-950/60 px-1.5 py-0.5 rounded">
                          CLOSED
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium">OPEN</span>
                      )}
                    </td>
                    <td className="p-3 text-[11px] text-slate-400 max-w-xs truncate">
                      {assessment.reason}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
