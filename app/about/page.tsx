import Link from "next/link";
import { ArrowLeft, Database, Cpu, Compass, ShieldCheck, Sparkles, Layers, Activity } from "lucide-react";
import { DEFAULT_SOURCE_CONFIGS } from "@/lib/detect/config";
import { SourceType } from "@/lib/detect/types";

export default function AboutPage() {
  const sourceKeys = Object.keys(DEFAULT_SOURCE_CONFIGS) as SourceType[];

  return (
    <div className="min-h-screen bg-background text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container pb-20">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/80 backdrop-blur-2xl shadow-[0_1px_12px_rgba(0,0,0,0.5)] border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-2 text-xs font-mono text-on-surface-variant hover:text-on-surface transition"
          >
            <ArrowLeft className="w-4 h-4 text-primary" />
            <span>Cinematic Landing</span>
          </Link>

          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 rounded-lg bg-primary-container text-on-primary-container font-headline text-xs font-bold shadow-[0_0_12px_rgba(20,241,217,0.35)] hover:shadow-[0_0_20px_rgba(20,241,217,0.5)] transition"
          >
            Mission Control →
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 pt-24 space-y-10">
        <div>
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider bg-secondary-container/40 text-secondary border border-secondary/30">
            TRANSPARENCY &amp; METHODOLOGY
          </span>
          <h1 className="font-headline text-3xl sm:text-5xl font-black text-white mt-3">
            Model Transparency &amp; Assumptions
          </h1>
          <p className="mt-2 text-base text-on-surface-variant leading-relaxed font-body">
            ResilienceOps is built for the hackathon track:{" "}
            <span className="text-primary font-medium">
              Climate, Resource Infrastructure &amp; Global Supply Resilience
            </span>
            . This documentation provides complete mathematical and architectural transparency into our pure deterministic simulation engine and multi-source evidence fusion pipeline.
          </p>
          <div className="mt-4 inline-flex items-center rounded-lg border border-primary/30 bg-primary-container/10 px-3 py-2 text-xs font-mono text-primary">
            Planned by: Built-in planner
          </div>
        </div>

        {/* Section 1: Real vs Simulated */}
        <section className="p-6 rounded-2xl bg-surface-container-low/70 backdrop-blur-xl border border-white/5 space-y-4 shadow-xl">
          <h2 className="font-headline text-xl font-bold text-white flex items-center space-x-2">
            <Database className="w-5 h-5 text-primary" />
            <span>1. What is Real vs. What is Modelled / Simulated</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-body">
            <div className="p-4 rounded-xl bg-surface-container border border-white/5 space-y-2">
              <span className="font-mono font-bold text-[#22e3a0] uppercase tracking-wider">
                Real / Physical Geometry
              </span>
              <ul className="text-on-surface-variant space-y-1.5 list-disc list-inside leading-relaxed">
                <li>Real-world coordinates for 16 major South India logistical nodes (Bengaluru, Kochi, Mangaluru, Kozhikode, Chennai, etc.).</li>
                <li>Actual highway alignments (NH-75 Shiradi Ghat, NH-766 Thamarassery Ghat, NH-544, NH-48).</li>
                <li>Live Open-Meteo weather API proxy with 10-minute caching for 72-hour precipitation forecast fetching.</li>
                <li>Geophysical terrain classifications (ghat, lowland flood basin, coastal corridor, plain).</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-surface-container border border-white/5 space-y-2">
              <span className="font-mono font-bold text-secondary uppercase tracking-wider">
                Simulated / Modelled
              </span>
              <ul className="text-on-surface-variant space-y-1.5 list-disc list-inside leading-relaxed">
                <li>Truck positions, drivers, and cargo payloads are simulated vehicles.</li>
                <li>Kerala 2018 &amp; Chennai 2015 rainfall profiles are Gaussian pulse approximations modelled after historical peaks.</li>
                <li>Delay hours saved are counterfactual modelled estimates comparing the deterministic baseline run against the agent run.</li>
                <li>Physical detection telemetry (satellite SAR passes, probe anomalies, IoT culvert sensors) is derived deterministically from ground truth with seeded latency and noise.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2: Mathematical Risk Formula */}
        <section className="p-6 rounded-2xl bg-surface-container-low/70 backdrop-blur-xl border border-white/5 space-y-4 shadow-xl">
          <h2 className="font-headline text-xl font-bold text-white flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-secondary" />
            <span>2. Hydrological Risk Scoring Formula (0 to 100 Prior)</span>
          </h2>

          <p className="text-xs text-on-surface-variant leading-relaxed">
            Every highway segment receives an auditable, deterministic hazard score calculated hourly from 4 weighted hydrological and terrain factors:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="p-3 rounded-lg bg-surface-container border border-white/5">
              <div className="text-primary font-bold">Accumulation (45%)</div>
              <div className="text-[11px] text-on-surface-variant mt-1 leading-snug">
                48h rolling rainfall (24h past + 24h forecast). Scaled 0 to 45 pts from 20mm to 200mm.
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-container border border-white/5">
              <div className="text-[#ffd166] font-bold">Intensity (20%)</div>
              <div className="text-[11px] text-on-surface-variant mt-1 leading-snug">
                Peak hourly rain rate (mm/h). Scaled 0 to 20 pts from 5mm/h to 40mm/h.
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-container border border-white/5">
              <div className="text-[#22e3a0] font-bold">Slope Stress (25%)</div>
              <div className="text-[11px] text-on-surface-variant mt-1 leading-snug">
                Base terrain vulnerability multiplied by 1.0–1.3x amplifier for ghats and lowlands under high rain.
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-container border border-white/5">
              <div className="text-secondary font-bold">Saturation (10%)</div>
              <div className="text-[11px] text-on-surface-variant mt-1 leading-snug">
                Antecedent moisture bonus if prior 24h rainfall exceeded 30mm.
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Multi-Source Detection & Evidence Fusion */}
        <section className="p-6 rounded-2xl bg-surface-container-low/70 backdrop-blur-xl border border-white/5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-xl font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>3. Multi-Source Road Incident Detection &amp; Evidence Fusion</span>
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-primary-container/20 text-primary border border-primary/30">
              Bayesian Log-Odds Core
            </span>
          </div>

          <p className="text-xs text-on-surface-variant leading-relaxed">
            While precipitation models PREDICT future risk, physical sensors DETECT actual blockages on the ground. ResilienceOps fuses 9 independent physical and crowdsourced evidence sources into a calibrated posterior probability of blockage:
          </p>

          {/* 9-Source Registry Table */}
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-surface-container">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="bg-surface-container-high text-on-surface-variant border-b border-white/5">
                <tr>
                  <th className="p-2.5">Source Type</th>
                  <th className="p-2.5">Sensing Modality</th>
                  <th className="p-2.5">Latency</th>
                  <th className="p-2.5">Weight</th>
                  <th className="p-2.5">Half-Life</th>
                  <th className="p-2.5">Provenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-on-surface">
                {sourceKeys.map((st) => {
                  const c = DEFAULT_SOURCE_CONFIGS[st];
                  return (
                    <tr key={st} className="hover:bg-surface-container-high/50">
                      <td className="p-2.5 font-bold text-white">{c.label}</td>
                      <td className="p-2.5 text-slate-300">
                        {st === "rain_model"
                          ? "Hydrological accumulation & slope model"
                          : st === "satellite"
                          ? "Sentinel-1 SAR C-Band radar surface water extent"
                          : st === "fleet_gps"
                          ? "OBD-II truck telemetry & stationary probe clusters"
                          : st === "traffic_speed"
                          ? "Aggregated road link speed ratios (TomTom/Google)"
                          : st === "road_sensor"
                          ? "IoT culvert ultrasonic depth & slope inclinometers"
                          : st === "camera"
                          ? "Toll plaza CCTV optical vision edge AI"
                          : st === "official_alert"
                          ? "IMD / NDMA emergency disaster bulletins"
                          : st === "photo_report"
                          ? "Field driver photos classified by Vision AI"
                          : "Dispatcher and radio transcript NLP extraction"}
                      </td>
                      <td className="p-2.5 text-primary">+{Math.round(c.latencyHours * 60)}m</td>
                      <td className="p-2.5 text-secondary">{c.reliabilityWeight}x</td>
                      <td className="p-2.5 text-slate-400">{c.halfLifeHours}h</td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[8px] uppercase bg-surface-variant/80 text-slate-300">
                          {c.provenance}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Fusion Math & Rules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-surface-container border border-white/5 space-y-2">
              <span className="font-bold text-primary block uppercase">
                Bayesian Log-Odds Updating
              </span>
              <p className="text-on-surface-variant text-[11px] leading-relaxed">
                Prior log-odds derived from rain risk score: L_0 = ln(P_0 / (1 - P_0)).
                Each observation contributes delta = ln(conf / (1 - conf)) * weight * decay(deltaT).
                Fresh &quot;clear&quot; signals subtract from log-odds to resolve cleared roads.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container border border-white/5 space-y-2">
              <span className="font-bold text-secondary block uppercase">
                Correlation Cap &amp; Human Ground Truth
              </span>
              <p className="text-on-surface-variant text-[11px] leading-relaxed">
                Repeated observations from the same source are capped at 1.5x weight to prevent single-sensor echo chambers. Human-verified dispatcher intel carries a 3.5x multiplier to definitively confirm or override model predictions.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Agent Decision Rules */}
        <section className="p-6 rounded-2xl bg-surface-container-low/70 backdrop-blur-xl border border-white/5 space-y-3 shadow-xl">
          <h2 className="font-headline text-xl font-bold text-white flex items-center space-x-2">
            <Compass className="w-5 h-5 text-primary" />
            <span>4. Autonomous Agent Decision Matrix</span>
          </h2>

          <div className="text-xs text-on-surface-variant space-y-2 font-body leading-relaxed">
            <p>
              The agent evaluates all active shipments every simulated hour using the effective risk map (derived from fused road status and rain scores). If any road segment ahead has risk ≥ 50, the agent executes:
            </p>
            <ul className="space-y-1.5 list-disc list-inside pl-2">
              <li>
                <strong className="text-white">REROUTE:</strong> Runs risk-penalized Dijkstra to find an alternate route with max risk &lt; 50 within priority tolerance (Critical Medicine: +240 min, Perishable Food: +150 min, Normal: +90 min).
              </li>
              <li>
                <strong className="text-white">HOLD:</strong> If reroute exceeds tolerance but forecast indicates risk drops within 12h, the truck stages safely at an intermodal hub.
              </li>
              <li>
                <strong className="text-white">ESCALATE:</strong> If all corridors are impassable OR if a lone single-source anomaly occurs at &quot;watch&quot; level, flags a human emergency dispatcher.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 5: Honesty & Provenance Policy */}
        <section className="p-6 rounded-2xl bg-surface-container-low/70 backdrop-blur-xl border border-white/5 space-y-3 shadow-xl">
          <h2 className="font-headline text-xl font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-[#86e5ff]" />
            <span>5. Honesty &amp; Provenance Policy</span>
          </h2>

          <p className="text-xs text-on-surface-variant leading-relaxed">
            Every telemetry observation and metric presented in the interface carries an explicit provenance chip:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-surface-container border border-white/5">
              <span className="px-2 py-0.5 rounded bg-surface-variant text-slate-300 font-bold block mb-1 uppercase text-[9px] w-fit">
                Simulated
              </span>
              <span className="text-on-surface-variant text-[11px]">
                Deterministic simulator telemetry generated with realistic physical latency and sensor dropouts.
              </span>
            </div>
            <div className="p-3 rounded-lg bg-surface-container border border-white/5">
              <span className="px-2 py-0.5 rounded bg-primary-container/20 text-primary font-bold block mb-1 uppercase text-[9px] w-fit">
                Live
              </span>
              <span className="text-on-surface-variant text-[11px]">
                Live weather proxy data (Open-Meteo) or live NVIDIA Vision AI classifications (Nemotron-3.5-Super-VL).
              </span>
            </div>
            <div className="p-3 rounded-lg bg-surface-container border border-white/5">
              <span className="px-2 py-0.5 rounded bg-secondary-container/30 text-secondary font-bold block mb-1 uppercase text-[9px] w-fit">
                Human-verified
              </span>
              <span className="text-on-surface-variant text-[11px]">
                Field dispatcher confirmed reports injected with human verification step.
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
