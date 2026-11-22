"use client";

import React from "react";
import Link from "next/link";
import { calculateImpact } from "@/lib/sim/impact";
import { ArrowRight, ShieldCheck, Play, Layers } from "lucide-react";

export default function Home() {
  const keralaImpact = calculateImpact("kerala-2018");

  return (
    <div className="min-h-screen flex flex-col font-body bg-white text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed-variant">
      {/* 1. Main Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-outline-variant/60 h-14 flex items-center">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo & Wordmark */}
          <Link
            href="/"
            className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-primary rounded p-1"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded bg-surface-container-low border border-outline-variant text-on-surface">
              <span className="material-symbols-outlined text-[18px] text-primary">hub</span>
            </div>
            <span className="text-[17px] font-semibold tracking-tight text-on-surface">
              ResilienceOps
            </span>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-on-surface-variant">
            <Link href="/dashboard" className="hover:text-on-surface transition-colors">
              Control room
            </Link>
            <Link href="/impact" className="hover:text-on-surface transition-colors">
              Impact
            </Link>
            <Link href="/report" className="hover:text-on-surface transition-colors">
              Report an issue
            </Link>
            <Link href="/about" className="hover:text-on-surface transition-colors">
              How it works
            </Link>
            <div className="flex items-center gap-1.5 pl-2 text-xs">
              <span className="px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide uppercase bg-surface-container text-on-surface-variant border border-outline-variant/60 rounded">
                Simulation
              </span>
            </div>
          </nav>

          {/* Right CTAs */}
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-3.5 py-1.5 text-sm font-medium rounded-md text-on-primary bg-primary-container hover:bg-primary transition shadow-xs focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Open control room
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main className="flex-grow">
        <section className="py-12 lg:py-20 border-b border-outline-variant/60 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Hero Column (60%) */}
              <div className="lg:col-span-7 flex flex-col justify-center">
                {/* Real-time operational note badge */}
                <div className="inline-flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
                    Ghat corridors monitored: NH75, SH88, NH766
                  </span>
                </div>

                {/* Headline */}
                <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-semibold text-on-surface tracking-tight leading-[1.18]">
                  See the flood before the road does.
                </h1>

                {/* Subtext */}
                <p className="mt-4 text-lg text-on-surface-variant leading-relaxed max-w-2xl font-normal">
                  ResilienceOps forecasts which freight corridors will become unsafe and reroutes medicine, food, and fuel trucks before they get stranded.
                </p>

                {/* Call to Actions */}
                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-md text-sm font-medium text-on-primary bg-primary-container hover:bg-primary transition shadow-xs focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary gap-1.5"
                  >
                    <span>Open control room</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/about"
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-md text-sm font-medium text-on-surface bg-white hover:bg-surface-container-low border border-outline-variant/80 transition focus:outline-none"
                  >
                    <span>Read model transparency</span>
                  </Link>
                </div>

                {/* Credibility Note */}
                <div className="mt-8 pt-6 border-t border-surface-container flex items-center text-xs text-on-surface-variant">
                  <ShieldCheck className="w-4 h-4 mr-2 text-primary shrink-0" />
                  <span>Built for disaster logistics dispatchers during extreme weather events.</span>
                </div>
              </div>

              {/* Right Hero Column: UI Card Corridor Map Mockup (40%) */}
              <div className="lg:col-span-5">
                <div className="bg-surface-container-low border border-outline-variant/80 rounded-lg p-3 sm:p-4 shadow-xs">
                  {/* Card mini-header showing vehicle status tag */}
                  <div className="bg-white border border-outline-variant/80 rounded-md p-3 mb-3 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-on-surface bg-surface-container px-1.5 py-0.5 rounded">
                          TRK-001
                        </span>
                        <span className="text-xs font-semibold text-on-surface">
                          Insulin &amp; plasma
                        </span>
                        <span className="inline-flex items-center text-[11px] font-medium text-primary bg-primary-fixed border border-primary/20 px-1.5 rounded">
                          Rerouted
                        </span>
                      </div>
                      <div className="text-[12px] text-on-surface-variant mt-1 flex items-center gap-1">
                        <span>Bengaluru</span>
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                        <span>Mangaluru</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[11px] font-medium text-error bg-error-container rounded">
                      Critical
                    </span>
                  </div>

                  {/* Interactive-feel Graphic Map Canvas */}
                  <div className="relative bg-[#FAFAFB] border border-outline-variant/80 rounded-md overflow-hidden aspect-[4/3] flex items-center justify-center">
                    <svg
                      aria-label="Active corridor reroute map illustration"
                      className="w-full h-full bg-[#FAFAFB]"
                      viewBox="0 0 400 300"
                    >
                      {/* Secondary connected roads */}
                      <line stroke="#CBD5E1" strokeWidth="2" x1="280" x2="360" y1="210" y2="180" />
                      <line stroke="#CBD5E1" strokeLinecap="round" strokeWidth="2" x1="160" x2="280" y1="230" y2="210" />
                      <line stroke="#CBD5E1" strokeWidth="1.5" x1="80" x2="160" y1="120" y2="230" />
                      <line stroke="#CBD5E1" strokeWidth="2" x1="280" x2="340" y1="210" y2="90" />

                      {/* Blocked Route (Red Dashed) via Hassan / Shiradi Ghat */}
                      <path
                        d="M 80,120 L 220,90"
                        fill="none"
                        stroke="#BA1A1A"
                        strokeWidth="3.5"
                        strokeDasharray="6, 4"
                      />

                      {/* Recommended Route (Green Solid) via Madikeri */}
                      <path
                        d="M 80,120 L 180,190 L 280,170"
                        fill="none"
                        stroke="#005A32"
                        strokeLinejoin="round"
                        strokeWidth="3.5"
                      />

                      {/* Nodes / Waypoints */}
                      <circle cx="80" cy="120" fill="#191C1F" r="5.5" />
                      <text fill="#191C1F" fontSize="11" fontWeight="600" x="35" y="112">
                        Mangaluru
                      </text>

                      <circle cx="220" cy="90" fill="#BA1A1A" r="5" />
                      <text fill="#BA1A1A" fontSize="11" fontWeight="600" x="210" y="76">
                        Hassan
                      </text>

                      <circle cx="180" cy="190" fill="#005A32" r="5" />
                      <text fill="#005A32" fontSize="11" fontWeight="600" x="145" y="210">
                        Madikeri
                      </text>

                      <circle cx="280" cy="170" fill="#191C1F" r="5.5" />
                      <text fill="#191C1F" fontSize="11" fontWeight="600" x="290" y="174">
                        Mysuru
                      </text>

                      {/* Truck Current Position Indicator on safe pass */}
                      <circle cx="225" cy="181" fill="#1F5FD6" fillOpacity="0.2" r="8" />
                      <circle cx="225" cy="181" fill="#1F5FD6" r="4" />
                    </svg>

                    {/* Annotation Badges */}
                    <div className="absolute top-4 right-4 bg-on-surface/90 text-surface text-[10.5px] font-mono px-2 py-1 rounded shadow flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
                      <span>Blocked: Shiradi (91% risk)</span>
                    </div>

                    <div className="absolute bottom-4 left-6 bg-tertiary-fixed text-on-tertiary-fixed-variant text-[10.5px] font-mono px-2 py-1 rounded shadow flex items-center gap-1.5 border border-tertiary/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                      <span>Via Madikeri (+65m, safe)</span>
                    </div>
                  </div>

                  {/* Corridor Comparison Metric Strip */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-white rounded border border-outline-variant/80">
                      <span className="block text-[11px] text-on-surface-variant font-mono">
                        ORIGINAL (NH75)
                      </span>
                      <span className="font-semibold text-error mt-0.5 block">
                        Blocked (91% risk)
                      </span>
                      <span className="text-[11px] text-on-surface-variant">ETA: Indefinite</span>
                    </div>
                    <div className="p-2 bg-tertiary-fixed/30 rounded border border-tertiary-fixed-dim">
                      <span className="block text-[11px] text-tertiary font-mono font-medium">
                        RECOMMENDED (SH88)
                      </span>
                      <span className="font-semibold text-tertiary mt-0.5 block">
                        +65 min (46% risk)
                      </span>
                      <span className="text-[11px] text-tertiary">ETA: Safe passage confirmed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. How It Works Section */}
        <section className="py-16 lg:py-24 bg-white border-b border-outline-variant/60" id="how-it-works">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-mono font-semibold uppercase tracking-wider text-primary">
                Methodology
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-on-surface">
                How it works
              </h2>
              <p className="mt-2 text-base text-on-surface-variant leading-relaxed">
                A deterministic pipeline connecting real-time hydrologic models to corridor dispatch commands.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Step 1 */}
              <div className="p-6 bg-white rounded-lg border border-outline-variant/80 shadow-xs">
                <div className="w-10 h-10 rounded-md bg-surface-container-low flex items-center justify-center text-primary mb-4 border border-outline-variant/60">
                  <span className="material-symbols-outlined text-[20px]">cloud_sync</span>
                </div>
                <div className="font-mono text-xs text-on-surface-variant font-semibold mb-1">
                  STEP 01
                </div>
                <h3 className="text-base font-semibold text-on-surface mb-2">Watch the rain forecast</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Aggregates localized precipitation, basin-level runoff models, and hill catchment saturation trends.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-6 bg-white rounded-lg border border-outline-variant/80 shadow-xs">
                <div className="w-10 h-10 rounded-md bg-surface-container-low flex items-center justify-center text-primary mb-4 border border-outline-variant/60">
                  <span className="material-symbols-outlined text-[20px]">analytics</span>
                </div>
                <div className="font-mono text-xs text-on-surface-variant font-semibold mb-1">
                  STEP 02
                </div>
                <h3 className="text-base font-semibold text-on-surface mb-2">Score every road</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Continuously assesses landslide risk, culvert overflows, and river crest thresholds along ghat passes.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-6 bg-white rounded-lg border border-outline-variant/80 shadow-xs">
                <div className="w-10 h-10 rounded-md bg-surface-container-low flex items-center justify-center text-primary mb-4 border border-outline-variant/60">
                  <span className="material-symbols-outlined text-[20px]">alt_route</span>
                </div>
                <div className="font-mono text-xs text-on-surface-variant font-semibold mb-1">
                  STEP 03
                </div>
                <h3 className="text-base font-semibold text-on-surface mb-2">Reroute trucks early</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Identifies viable alternate corridors before vehicles commit past critical bifurcation junctions.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-6 bg-white rounded-lg border border-outline-variant/80 shadow-xs">
                <div className="w-10 h-10 rounded-md bg-surface-container-low flex items-center justify-center text-primary mb-4 border border-outline-variant/60">
                  <span className="material-symbols-outlined text-[20px]">chat</span>
                </div>
                <div className="font-mono text-xs text-on-surface-variant font-semibold mb-1">
                  STEP 04
                </div>
                <h3 className="text-base font-semibold text-on-surface mb-2">Tell the driver why</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Delivers plain-language, high-contrast instructions with fuel battery buffers and safe delivery window margins.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. What It Protects Section */}
        <section className="py-16 lg:py-24 bg-surface-container-lowest border-b border-outline-variant/60" id="what-it-protects">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-mono font-semibold uppercase tracking-wider text-on-surface-variant">
                Critical Freight Classes
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-on-surface">
                What it protects
              </h2>
              <p className="mt-2 text-base text-on-surface-variant">
                Designed for cargo with rigid expiration limits, cooling constraints, or life-or-death deadlines.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <article className="bg-white rounded-lg border border-outline-variant/80 p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-on-surface-variant">
                      CLASS 01
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-error-container text-error">
                      High Risk of Spoilage
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-on-surface">Hospitals &amp; clinics</h3>
                  <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
                    Cold-chain insulin, dialysis fluids, surgical supplies, and blood plasma with active auxiliary refrigeration limits.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-surface-container flex items-center justify-between text-xs text-on-surface-variant">
                  <span>Reserve shelf: <strong>14 hours</strong></span>
                  <span>Temp: <strong>2°–8°C</strong></span>
                </div>
              </article>

              {/* Card 2 */}
              <article className="bg-white rounded-lg border border-outline-variant/80 p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-on-surface-variant">
                      CLASS 02
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#fcf6e8] text-[#946c00] border border-[#f5da99]">
                      Isolation Prevention
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-on-surface">Food supply</h3>
                  <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
                    Grain stockpiles, potable bottled water, fresh produce convoys, and infant baby formula distribution into marooned taluks.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-surface-container flex items-center justify-between text-xs text-on-surface-variant">
                  <span>Dry transit: <strong>Protected</strong></span>
                  <span>Hub routing: <strong>Multi-point</strong></span>
                </div>
              </article>

              {/* Card 3 */}
              <article className="bg-white rounded-lg border border-outline-variant/80 p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-on-surface-variant">
                      CLASS 03
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-primary-fixed text-on-primary-fixed-variant">
                      Emergency Fueling
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-on-surface">Fuel &amp; power</h3>
                  <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
                    Bulk diesel fuel tankers specifically earmarked for hospital backup generators, cellular towers, and evacuation motorboats.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-surface-container flex items-center justify-between text-xs text-on-surface-variant">
                  <span>Hazmat passes: <strong>Verified</strong></span>
                  <span>Gradient limit: <strong>&lt; 9%</strong></span>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* 5. Past Flood Simulation Section */}
        <section className="py-16 lg:py-20 bg-white" id="simulation">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-surface-container-low border border-outline-variant/80 rounded-lg p-6 sm:p-8 lg:p-10">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-surface-container-highest text-on-surface-variant border border-outline-variant/60">
                    SIMULATION
                  </span>
                  <span className="text-xs font-mono text-on-surface-variant">
                    Event Dataset #KL-2018-08
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-on-surface">
                  Kerala monsoon, August 2018 (replay)
                </h2>
                <p className="mt-3 text-base text-on-surface-variant leading-relaxed">
                  Replay 14 actual relief convoys during the catastrophic 2018 floods. See how 18+ hours of delays and stranded trucks were avoided using automated road saturation scoring across the Western Ghats.
                </p>

                {/* Metrics bar */}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 border-y border-outline-variant/60 py-4 max-w-xl">
                  <div>
                    <span className="block text-2xl font-bold font-mono text-on-surface">14</span>
                    <span className="text-xs text-on-surface-variant">Active convoys</span>
                  </div>
                  <div>
                    <span className="block text-2xl font-bold font-mono text-tertiary">0</span>
                    <span className="text-xs text-on-surface-variant">Stranded vehicles</span>
                  </div>
                  <div>
                    <span className="block text-2xl font-bold font-mono text-on-surface">
                      +{keralaImpact.delayHoursSaved} hrs
                    </span>
                    <span className="text-xs text-on-surface-variant">Delay saved (Modelled estimate)</span>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-md text-sm font-medium text-on-primary bg-primary-container hover:bg-primary transition shadow-xs focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Launch simulation replay</span>
                  </Link>
                  <span className="text-xs text-on-surface-variant font-mono">
                    Runs locally in browser canvas • Zero API keys required
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 6. Main Footer */}
      <footer className="bg-white border-t border-outline-variant/60 py-8 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-on-surface-variant text-xs sm:text-sm">
            ResilienceOps — Hackathon prototype. Rainfall scenarios and trucks are simulated.
          </p>
          <div className="flex items-center space-x-6 text-xs sm:text-sm text-on-surface font-medium">
            <Link href="/dashboard" className="hover:text-primary transition-colors">
              Control room
            </Link>
            <Link href="/impact" className="hover:text-primary transition-colors">
              Impact data
            </Link>
            <Link href="/report" className="hover:text-primary transition-colors">
              Report issue
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
