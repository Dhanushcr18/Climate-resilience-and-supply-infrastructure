"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSimStore } from "@/lib/store";
import { SCENARIOS, ScenarioId } from "@/lib/sim/scenarios";
import { getLanguagesForZone, TRANSLATIONS, SupportedLanguage } from "@/lib/i18n";

export function ControlRoomHeader() {
  const pathname = usePathname();
  const { scenario, setScenario, selectedRegion, language, setLanguage } = useSimStore();
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const availableLanguages = getLanguagesForZone(selectedRegion);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest border-b border-outline-variant">
      <div className="h-14 w-full max-w-[1440px] mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded bg-surface-container-low border border-outline-variant text-on-surface">
              <span className="material-symbols-outlined text-[18px] text-primary">hub</span>
            </div>
            <span className="font-semibold text-on-surface text-[17px] tracking-tight">
              ResilienceOps
            </span>
          </Link>
        </div>

        {/* Center Nav */}
        <nav className="hidden md:flex items-center gap-8 h-full">
          <Link
            href="/dashboard"
            className={`transition-colors py-1 text-[14px] ${
              pathname === "/dashboard"
                ? "text-primary font-semibold relative after:content-[''] after:absolute after:bottom-[-17px] after:left-0 after:right-0 after:h-[2px] after:bg-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {t.controlRoom}
          </Link>
          <Link
            href="/impact"
            className={`transition-colors py-1 text-[14px] ${
              pathname === "/impact"
                ? "text-primary font-semibold relative after:content-[''] after:absolute after:bottom-[-17px] after:left-0 after:right-0 after:h-[2px] after:bg-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {t.impact}
          </Link>
          <Link
            href="/report"
            className={`transition-colors py-1 text-[14px] ${
              pathname === "/report"
                ? "text-primary font-semibold relative after:content-[''] after:absolute after:bottom-[-17px] after:left-0 after:right-0 after:h-[2px] after:bg-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {t.reportIssue}
          </Link>
          <Link
            href="/about"
            className={`transition-colors py-1 text-[14px] ${
              pathname === "/about"
                ? "text-primary font-semibold relative after:content-[''] after:absolute after:bottom-[-17px] after:left-0 after:right-0 after:h-[2px] after:bg-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {t.howItWorks}
          </Link>
        </nav>

        {/* Right Controls: Scenario Replay Pill + Zone Language Selector + User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Zone-Aware Language Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-surface-container-low border border-outline-variant hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-[17px] text-primary">translate</span>
            <select
              aria-label="Interface Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              className="bg-transparent text-xs text-on-surface font-bold focus:outline-none cursor-pointer"
            >
              {availableLanguages.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nativeName} ({l.name})
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded bg-surface-container-low border border-outline-variant hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              history_toggle_off
            </span>
            <select
              aria-label="Simulation Scenario"
              value={scenario}
              onChange={(e) => setScenario(e.target.value as ScenarioId)}
              className="bg-transparent text-[13px] text-on-surface font-medium focus:outline-none cursor-pointer"
            >
              {Object.values(SCENARIOS).map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>
            <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant border border-outline-variant">
              {t.simulation}
            </span>
          </div>

          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined text-[18px]">person</span>
          </div>
        </div>
      </div>
    </header>
  );
}
