"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ControlRoomHeader } from "@/components/ControlRoomHeader";
import { EDGES, RegionId, REGION_NAMES } from "@/lib/sim/network";
import { useSimStore } from "@/lib/store";
import { Observation } from "@/lib/detect/types";

interface DemoPhotoItem {
  id: string;
  filename: string;
  title: string;
  edgeId: string;
  edgeName: string;
  expectedLabel: "blocked" | "degraded" | "clear";
  confidence: number;
  waterDepthCm: number | null;
  passable: boolean;
  description: string;
}

const DEMO_PHOTOS: DemoPhotoItem[] = [
  {
    id: "flood-deep",
    filename: "flood-deep.jpg",
    title: "Deep Flood Inundation (55cm)",
    edgeId: "HAS-MNG",
    edgeName: "NH-75 Shiradi Ghat",
    expectedLabel: "blocked",
    confidence: 0.94,
    waterDepthCm: 55,
    passable: false,
    description: "Submerged dual carriageway with fast-moving turbulent brown water over lane markers.",
  },
  {
    id: "landslide-blocked",
    filename: "landslide-blocked.jpg",
    title: "Mountain Slope Mudslide & Boulders",
    edgeId: "WYN-KZD",
    edgeName: "NH-766 Thamarassery Ghat",
    expectedLabel: "blocked",
    confidence: 0.92,
    waterDepthCm: 15,
    passable: false,
    description: "Boulders and mud washed across hairpin bend, blocking travel lanes completely.",
  },
  {
    id: "puddle-passable",
    filename: "puddle-passable.jpg",
    title: "Shallow Puddling (Safe)",
    edgeId: "BLR-MYS",
    edgeName: "NH-275 Mysore Expressway",
    expectedLabel: "clear",
    confidence: 0.88,
    waterDepthCm: 8,
    passable: true,
    description: "Rain runoff with minor puddling along curb; travel lanes maintain passage.",
  },
];

export default function ReportPage() {
  const {
    simT,
    addUserObservation,
    userObservations,
    clearUserObservations,
    reopenEdge,
    removeUserObservationsForEdge,
  } = useSimStore();

  const [selectedDemoId, setSelectedDemoId] = useState<string>("flood-deep");
  const [selectedZone, setSelectedZone] = useState<RegionId>("all");
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>("HAS-MNG");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [landmark, setLandmark] = useState<string>("Near Maranahalli bridge, km 232");
  const [description, setDescription] = useState<string>(
    "Water rising rapidly over the culvert. Water depth approximately 2.5 feet, impassable for all heavy commercial vehicles. Local police turning traffic back toward Sakleshpur."
  );

  // Regional zone groupings
  const southEdges = useMemo(() => EDGES.filter((e) => e.region === "south"), []);
  const northEdges = useMemo(() => EDGES.filter((e) => e.region === "north"), []);
  const westEdges = useMemo(() => EDGES.filter((e) => e.region === "west"), []);
  const eastEdges = useMemo(() => EDGES.filter((e) => e.region === "east"), []);
  const interRegionalEdges = useMemo(() => EDGES.filter((e) => e.region === "all"), []);

  const zoneCounts = useMemo(() => {
    return {
      all: EDGES.length,
      south: southEdges.length,
      north: northEdges.length,
      west: westEdges.length,
      east: eastEdges.length,
    };
  }, [southEdges, northEdges, westEdges, eastEdges]);

  const visibleEdges = useMemo(() => {
    if (selectedZone === "all") return EDGES;
    return EDGES.filter((e) => e.region === selectedZone);
  }, [selectedZone]);

  const handleZoneSelect = (zone: RegionId) => {
    setSelectedZone(zone);
    if (zone !== "all") {
      const edgeInZone = EDGES.find((e) => e.id === selectedEdgeId && e.region === zone);
      if (!edgeInZone) {
        const firstInZone = EDGES.find((e) => e.region === zone);
        if (firstInZone) {
          setSelectedEdgeId(firstInZone.id);
          setConfirmedSuccess(false);
          setReopenedSuccess(false);
        }
      }
    }
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [photoAnalysis, setPhotoAnalysis] = useState<{
    label: "blocked" | "degraded" | "clear";
    confidence: number;
    waterDepthEstimateCm: number | null;
    passableForTruck: boolean;
    isRoadwayImage: boolean;
    requiresManualReview: boolean;
    modelAvailable: boolean;
    reason: string;
    source: string;
  } | null>({
    label: "blocked",
    confidence: 0.94,
    waterDepthEstimateCm: 55,
    passableForTruck: false,
    isRoadwayImage: true,
    requiresManualReview: false,
    modelAvailable: false,
    reason: "Water covers full width of road; depth exceeds safe clearance for axles. Upstream telemetry indicates Hemavathi basin spillover.",
    source: "demo_manifest",
  });

  const [verifiedLabel, setVerifiedLabel] = useState<"blocked" | "degraded" | "clear">("blocked");
  const [confirmedSuccess, setConfirmedSuccess] = useState(false);
  const [reopenedSuccess, setReopenedSuccess] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const selectedDemo = DEMO_PHOTOS.find((d) => d.id === selectedDemoId) || DEMO_PHOTOS[0];
  const selectedEdge = EDGES.find((e) => e.id === selectedEdgeId) || EDGES[0];

  const userObsForSelectedEdge = userObservations.filter((o) => o.edgeId === selectedEdgeId);
  const isEdgeBlockedByUser = userObsForSelectedEdge.some((o) => o.claim === "blocked");
  const isEdgeClearedByUser = userObsForSelectedEdge.some((o) => o.claim === "clear");
  const canApprovePhoto = Boolean(
    photoAnalysis?.isRoadwayImage && !photoAnalysis?.requiresManualReview
  );

  const handleSelectDemo = (demo: DemoPhotoItem) => {
    setSelectedDemoId(demo.id);
    setSelectedEdgeId(demo.edgeId);
    const demoEdge = EDGES.find((e) => e.id === demo.edgeId);
    if (demoEdge && selectedZone !== "all" && demoEdge.region !== selectedZone) {
      setSelectedZone(demoEdge.region);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setConfirmedSuccess(false);
    setReopenedSuccess(false);
    setScanMessage(null);

    setPhotoAnalysis({
      label: demo.expectedLabel,
      confidence: demo.confidence,
      waterDepthEstimateCm: demo.waterDepthCm,
      passableForTruck: demo.passable,
      isRoadwayImage: true,
      requiresManualReview: false,
      modelAvailable: false,
      reason: demo.description,
      source: "demo_manifest",
    });
    setVerifiedLabel(demo.expectedLabel);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        alert("File size exceeds 4MB limit.");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      // Do not keep the previous demo's verified result while a new upload is scanning.
      setPhotoAnalysis(null);
      setConfirmedSuccess(false);
      setReopenedSuccess(false);
      setScanMessage(null);
      handleAnalyzePhoto(file);
    }
  };

  const handleReopenCorridor = () => {
    reopenEdge(selectedEdgeId, simT);
    setConfirmedSuccess(false);
    setReopenedSuccess(true);
    setScanMessage(`Corridor reopened: ${selectedEdge.name} is now marked clear and passable.`);
    setTimeout(() => {
      const el = document.getElementById("step-3-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleAnalyzePhoto = async (fileOverride?: File) => {
    setIsAnalyzing(true);
    setScanMessage(null);
    try {
      const file = fileOverride || selectedFile;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("hint", file.name);
        formData.append("description", description);
        formData.append("corridor", selectedEdgeId);

        const res = await fetch("/api/vision/classify", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.label) {
          setPhotoAnalysis(data);
          setVerifiedLabel(data.label || "degraded");
          setScanMessage(
            !data.modelAvailable
              ? "NVIDIA Vision AI is not configured. Add an NVIDIA API key before real uploads can be analyzed."
              : data.isRoadwayImage && !data.requiresManualReview
              ? `Scan complete (NVIDIA Vision AI): ${data.label === "blocked" ? "Road impassable" : "Passable"} (${(data.confidence * 100).toFixed(0)}% confidence).`
              : `NVIDIA Vision AI review: ${data.reason}`
          );
        } else {
          // Fail closed: a failed scan must never be turned into a made-up hazard result.
          const fallback = {
            label: "degraded" as const,
            confidence: 0,
            waterDepthEstimateCm: null,
            passableForTruck: false,
            isRoadwayImage: false,
            requiresManualReview: true,
            modelAvailable: false,
            reason: `The image scan failed for ${file.name}; no road status was inferred. Upload a clear roadway image or request dispatcher review.`,
            source: "offline_fallback",
          };
          setPhotoAnalysis(fallback);
          setVerifiedLabel("degraded");
          setScanMessage("Upload not approved: image could not be verified. Dispatcher review is required.");
        }
      } else {
        const res = await fetch("/api/vision/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hint: `${selectedDemo.id} ${selectedDemo.title}`,
            fileName: selectedDemo.filename,
          }),
        });
        const data = await res.json();
        if (res.ok && data.label) {
          setPhotoAnalysis(data);
          setVerifiedLabel(data.label || "blocked");
          setScanMessage(`Scan complete: ${data.label === "blocked" ? "Road impassable" : "Passable"} (${(data.confidence * 100).toFixed(0)}% confidence).`);
        } else {
          setPhotoAnalysis({
            label: selectedDemo.expectedLabel,
            confidence: selectedDemo.confidence,
            waterDepthEstimateCm: selectedDemo.waterDepthCm,
            passableForTruck: selectedDemo.passable,
            isRoadwayImage: true,
            requiresManualReview: false,
            modelAvailable: false,
            reason: selectedDemo.description,
            source: "offline_fallback",
          });
          setVerifiedLabel(selectedDemo.expectedLabel);
          setScanMessage(`Scan complete: ${selectedDemo.title} evaluated.`);
        }
      }

      // Smooth scroll to step 3 so the result is immediately seen
      setTimeout(() => {
        const el = document.getElementById("step-3-section");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch {
      setScanMessage("Upload not approved: the image could not be analyzed. Dispatcher review is required.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmReport = () => {
    if (!photoAnalysis) return;

    if (!photoAnalysis.isRoadwayImage || photoAnalysis.requiresManualReview) {
      setScanMessage("Cannot approve this upload: a roadway condition was not verified. Dispatcher review is required.");
      return;
    }

    if (verifiedLabel === "clear") {
      handleReopenCorridor();
      return;
    }

    const newObs: Observation = {
      id: `photo-user-${Date.now()}`,
      edgeId: selectedEdgeId,
      sourceType: "photo_report",
      claim: verifiedLabel,
      confidence: Math.max(0.85, photoAnalysis.confidence),
      observedAtT: simT,
      receivedAtT: simT,
      provenance: "human_verified",
      details: `Dispatcher Verified: ${photoAnalysis.reason} (Water depth ~${photoAnalysis.waterDepthEstimateCm || 0}cm). ${description}`,
      evidence: {
        waterDepthCm: photoAnalysis.waterDepthEstimateCm || 0,
        passable: photoAnalysis.passableForTruck ? 1 : 0,
      },
    };

    addUserObservation(newObs);
    setConfirmedSuccess(true);
    setReopenedSuccess(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface font-body text-on-surface antialiased">
      {/* 1. Header Navigation */}
      <ControlRoomHeader />

      <main className="w-full pt-14 bg-surface max-w-[1440px] mx-auto min-h-screen flex flex-col">
        <div className="w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
          <div className="max-w-[1240px] mx-auto w-full">
            {/* Top Title Bar */}
            <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-surface-container-high text-on-surface uppercase tracking-wider border border-outline-variant/60">
                    Field Observation Intake
                  </span>
                  <span className="text-outline-variant font-mono">•</span>
                  <span className="font-mono text-xs font-semibold text-on-surface-variant">
                    Protocol ID #FL-8821
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                  Report a road issue
                </h1>
                <p className="text-sm font-medium text-on-surface-variant mt-1 max-w-2xl">
                  Submit field observations or verified road closures to update live dispatch corridors across Karnataka, Kerala, and Tamil Nadu.
                </p>
              </div>

              {/* Telemetry Summary Pill */}
              <div className="flex items-center gap-3 bg-surface-container-lowest px-3.5 py-2 rounded-lg shadow-xs border border-outline-variant/60 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tertiary" />
                  </span>
                  <span className="text-xs font-semibold text-on-surface">GIS Network: Online</span>
                </div>
                <span className="text-outline-variant">|</span>
                <span className="font-mono text-xs font-semibold text-on-surface-variant">
                  Sim Time: t={simT.toFixed(1)}h
                </span>
              </div>
            </div>

            {/* Critical Alert Notice */}
            <div className="mb-6 rounded-lg bg-surface-container-lowest border border-outline-variant/80 shadow-xs p-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-error" />
              <div className="flex items-start gap-3 pl-2">
                <span className="material-symbols-outlined text-error text-[22px] mt-0.5">
                  warning
                </span>
                <div className="flex-1">
                  <p className="font-bold text-sm text-error">
                    Monsoon Red Warning active for Western Ghats passes
                  </p>
                  <p className="text-xs font-medium text-on-surface-variant mt-0.5">
                    Shiradi Ghat (NH75) and Thamarassery Ghat (NH766) experiencing rapid flash runoff. Ground reports trigger automated recalculation of fuel reserve limits.
                  </p>
                </div>
              </div>
            </div>

            {/* Main Layout: 2 Columns (7 cols Form + 5 cols Sidebar) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* Left Column: Form Steps */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                {/* STEP 1: Choose the Road */}
                <div className="bg-surface-container-lowest rounded-lg p-5 sm:p-6 shadow-xs border border-outline-variant/80">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-surface-container">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-mono text-xs font-bold">
                        1
                      </span>
                      <h2 className="text-[17px] font-bold text-on-surface">Location and corridor</h2>
                    </div>
                    <span className="font-mono text-xs font-semibold text-on-surface-variant">
                      Step 1 of 3
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Zone / Division Selector (Step 1A) */}
                    <div className="space-y-2 p-3 bg-surface-container-low rounded-lg border border-outline-variant/60">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-primary text-[17px]">public</span>
                          <span>Step 1A: Filter Routes by India Zone</span>
                        </label>
                        <span className="font-mono text-[11px] font-bold text-primary uppercase bg-primary-fixed px-2 py-0.5 rounded">
                          Zone: {REGION_NAMES[selectedZone]}
                        </span>
                      </div>

                      {/* 5 Zone Selection Buttons */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                        {(
                          [
                            { id: "all", label: "All Zones", icon: "public", badge: zoneCounts.all },
                            { id: "south", label: "South India", icon: "south", badge: zoneCounts.south },
                            { id: "north", label: "North India", icon: "north", badge: zoneCounts.north },
                            { id: "west", label: "West India", icon: "west", badge: zoneCounts.west },
                            { id: "east", label: "East India", icon: "east", badge: zoneCounts.east },
                          ] as const
                        ).map((z) => (
                          <button
                            key={z.id}
                            type="button"
                            onClick={() => handleZoneSelect(z.id)}
                            className={`py-1.5 px-2 rounded-md font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              selectedZone === z.id
                                ? "bg-primary text-white shadow-xs"
                                : "bg-white text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-outline-variant/50"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">{z.icon}</span>
                            <span>{z.label}</span>
                            <span
                              className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                                selectedZone === z.id
                                  ? "bg-white/25 text-white"
                                  : "bg-surface-container-highest text-on-surface-variant"
                              }`}
                            >
                              {z.badge}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Step 1B: Choose Corridor in Zone */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-on-surface">
                          Step 1B: Select Corridor within {REGION_NAMES[selectedZone]} <span className="text-error">*</span>
                        </label>
                        <span className="font-mono text-[11px] text-on-surface-variant font-medium">
                          {visibleEdges.length} {selectedZone === "all" ? "total corridors available" : `${selectedZone} corridors`}
                        </span>
                      </div>
                      <div className="relative">
                        <select
                          value={selectedEdgeId}
                          onChange={(e) => {
                            const newId = e.target.value;
                            setSelectedEdgeId(newId);
                            setConfirmedSuccess(false);
                            setReopenedSuccess(false);
                            const edgeFound = EDGES.find((ed) => ed.id === newId);
                            if (edgeFound && edgeFound.region !== "all" && selectedZone !== "all" && edgeFound.region !== selectedZone) {
                              setSelectedZone(edgeFound.region);
                            }
                          }}
                          className="w-full h-11 pl-3 pr-8 bg-white text-on-surface text-sm font-semibold rounded border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary shadow-xs cursor-pointer"
                        >
                          {selectedZone === "all" ? (
                            <>
                              <optgroup label="📍 SOUTH INDIA CORRIDORS">
                                {southEdges.map((edge) => (
                                  <option key={edge.id} value={edge.id}>
                                    {edge.id} — {edge.name} ({edge.terrain} terrain, {edge.lengthKm}km, {edge.baseMinutes}m standard)
                                  </option>
                                ))}
                              </optgroup>

                              <optgroup label="📍 NORTH INDIA CORRIDORS">
                                {northEdges.map((edge) => (
                                  <option key={edge.id} value={edge.id}>
                                    {edge.id} — {edge.name} ({edge.terrain} terrain, {edge.lengthKm}km, {edge.baseMinutes}m standard)
                                  </option>
                                ))}
                              </optgroup>

                              <optgroup label="📍 WEST INDIA CORRIDORS">
                                {westEdges.map((edge) => (
                                  <option key={edge.id} value={edge.id}>
                                    {edge.id} — {edge.name} ({edge.terrain} terrain, {edge.lengthKm}km, {edge.baseMinutes}m standard)
                                  </option>
                                ))}
                              </optgroup>

                              <optgroup label="📍 EAST INDIA CORRIDORS">
                                {eastEdges.map((edge) => (
                                  <option key={edge.id} value={edge.id}>
                                    {edge.id} — {edge.name} ({edge.terrain} terrain, {edge.lengthKm}km, {edge.baseMinutes}m standard)
                                  </option>
                                ))}
                              </optgroup>

                              {interRegionalEdges.length > 0 && (
                                <optgroup label="📍 INTER-REGIONAL NATIONAL TRUNK CORRIDORS">
                                  {interRegionalEdges.map((edge) => (
                                    <option key={edge.id} value={edge.id}>
                                      {edge.id} — {edge.name} ({edge.terrain} terrain, {edge.lengthKm}km, {edge.baseMinutes}m standard)
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </>
                          ) : (
                            <optgroup label={`📍 ${REGION_NAMES[selectedZone].toUpperCase()} CORRIDORS (${visibleEdges.length})`}>
                              {visibleEdges.map((edge) => (
                                <option key={edge.id} value={edge.id}>
                                  {edge.id} — {edge.name} ({edge.terrain} terrain, {edge.lengthKm}km, {edge.baseMinutes}m standard)
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>

                      {/* Quick Corridor Selection Cards (Zone-wise visual selection) */}
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-primary">touch_app</span>
                            <span>Direct Zone Route Pick ({visibleEdges.length} {selectedZone === "all" ? "routes across India" : `${REGION_NAMES[selectedZone]} routes`}):</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1.5 bg-surface-container-low rounded-lg border border-outline-variant/60">
                          {visibleEdges.map((edge) => {
                            const isSelected = edge.id === selectedEdgeId;
                            return (
                              <button
                                key={edge.id}
                                type="button"
                                onClick={() => {
                                  setSelectedEdgeId(edge.id);
                                  setConfirmedSuccess(false);
                                  setReopenedSuccess(false);
                                }}
                                className={`text-left p-2.5 rounded-md transition-all flex items-start justify-between gap-2 border cursor-pointer ${
                                  isSelected
                                    ? "bg-primary-fixed/30 border-primary shadow-xs ring-1 ring-primary"
                                    : "bg-white hover:bg-surface-container border-outline-variant/50"
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-xs font-bold text-primary">{edge.id}</span>
                                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
                                      {edge.terrain}
                                    </span>
                                  </div>
                                  <p className="text-xs font-bold text-on-surface truncate mt-0.5">{edge.name}</p>
                                  <p className="text-[11px] font-semibold text-on-surface-variant">
                                    {edge.lengthKm} km • {edge.baseMinutes} min standard
                                  </p>
                                </div>
                                {isSelected && (
                                  <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                                    check_circle
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <p className="text-xs font-medium text-on-surface-variant mt-1.5">
                        Corridor connects active relief units in the current operational window. Select a zone above to quickly view only that zone's routes.
                      </p>
                    </div>

                    {/* GPS Coordinates Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface-container-low rounded-lg border border-outline-variant/60">
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-primary text-[20px]">
                          my_location
                        </span>
                        <div>
                          <p className="text-xs font-bold text-on-surface">GPS coordinates detected</p>
                          <p className="font-mono text-[11px] font-semibold text-on-surface-variant">
                            12.8942° N, 75.7831° E (±4.2m precision)
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLandmark("12.8942° N, 75.7831° E (GPS Verified)")}
                        className="h-8 px-3 bg-white text-primary hover:bg-surface-container text-xs font-bold rounded border border-outline-variant/60 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">navigation</span>
                        <span>Use current GPS</span>
                      </button>
                    </div>

                    {/* Landmark Input */}
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1.5">
                        Mile marker or physical landmark{" "}
                        <span className="text-xs text-on-surface-variant font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          placeholder="e.g. Near Maranahalli bridge, km 232"
                          className="w-full h-11 px-3.5 bg-white text-on-surface text-sm font-semibold rounded border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 2: Add Evidence & Condition */}
                <div className="bg-surface-container-lowest rounded-lg p-5 sm:p-6 shadow-xs border border-outline-variant/80">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-surface-container">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-mono text-xs font-bold">
                        2
                      </span>
                      <h2 className="text-[17px] font-bold text-on-surface">
                        Road condition &amp; evidence
                      </h2>
                    </div>
                    <span className="font-mono text-xs font-semibold text-on-surface-variant">
                      Step 2 of 3
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Presets Title */}
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-2">
                        Select Preset Incident Scenario (High-Contrast Demos):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {DEMO_PHOTOS.map((demo) => {
                          const isSelected = selectedDemoId === demo.id && !selectedFile;
                          return (
                            <div
                              key={demo.id}
                              onClick={() => handleSelectDemo(demo)}
                              className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                isSelected
                                  ? "bg-primary-fixed/40 border-primary shadow-xs ring-1 ring-primary"
                                  : "bg-surface-container-low hover:bg-surface-container border-outline-variant/60"
                              }`}
                            >
                              <div>
                                <span className="font-bold text-xs text-on-surface block leading-snug">
                                  {demo.title}
                                </span>
                                <span className="font-mono text-[11px] font-semibold text-primary block mt-1">
                                  {demo.edgeName}
                                </span>
                                <p className="text-[11px] font-medium text-on-surface-variant mt-1.5 leading-snug">
                                  {demo.description}
                                </p>
                              </div>
                              <span
                                className={`mt-3 inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase self-start ${
                                  demo.expectedLabel === "blocked"
                                    ? "bg-error-container text-error"
                                    : "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                                }`}
                              >
                                Expected: {demo.expectedLabel}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Upload Box */}
                    <div className="pt-2 border-t border-surface-container space-y-3">
                      <label className="block text-xs font-bold text-on-surface mb-1">
                        Or Upload Custom Photo / Dashcam Image:
                      </label>
                      <label className="p-4 bg-surface-container-low hover:bg-surface-container rounded-lg border-2 border-dashed border-outline-variant hover:border-primary flex flex-col items-center justify-center cursor-pointer transition-colors">
                        <span className="material-symbols-outlined text-[28px] text-primary mb-1">
                          cloud_upload
                        </span>
                        <p className="text-xs font-bold text-on-surface">
                          {selectedFile ? selectedFile.name : "Click to select or drag photo here"}
                        </p>
                        <p className="text-[11px] font-medium text-on-surface-variant mt-0.5">
                          Supports JPEG, PNG, WebP up to 4MB
                        </p>
                        <input
                          type="file"
                          accept="image/*,.jpg,.jpeg,.png,.webp"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>

                      {/* Attached Photo Preview Card */}
                      {selectedFile && (
                        <div className="p-3.5 bg-surface-container rounded-lg flex flex-col sm:flex-row items-center gap-4 border border-outline-variant/60">
                          <div className="w-full sm:w-28 h-24 rounded-lg overflow-hidden shrink-0 relative bg-surface-container-highest flex items-center justify-center">
                            {previewUrl ? (
                              <img
                                src={previewUrl}
                                alt={selectedFile.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="material-symbols-outlined text-[36px] text-primary">photo</span>
                            )}
                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-white font-mono text-[10px]">
                              {selectedFile.name.slice(0, 12)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 w-full">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-on-surface truncate">
                                  {selectedFile.name}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-mono text-[10px] font-bold">
                                  Location pending review
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedFile(null);
                                  setPreviewUrl(null);
                                  setScanMessage(null);
                                }}
                                className="text-on-surface-variant hover:text-error transition-colors p-1 cursor-pointer"
                                title="Remove attachment"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                            <p className="text-[11px] font-medium text-on-surface-variant">
                              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • 12.8941° N, 75.7829° E
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-1.5 bg-surface-container-highest rounded-full flex-1 overflow-hidden">
                                <div className="h-full bg-tertiary rounded-full w-full" />
                              </div>
                              <span className="font-mono text-[10px] font-bold text-on-surface-variant">Awaiting scan</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Detailed Text Report */}
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1.5">
                        Field observations &amp; driver commentary
                      </label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-3 bg-white text-on-surface text-sm font-semibold rounded border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary shadow-xs leading-relaxed"
                      />
                      <div className="flex items-center justify-between mt-1 text-on-surface-variant text-xs">
                        <span>Include water depth, culvert stability, or fallen rock volume.</span>
                        <span className="font-mono text-[11px] font-semibold">{description.length} chars</span>
                      </div>
                    </div>

                    {/* Trigger Vision AI Button */}
                    <button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={() => handleAnalyzePhoto()}
                      className="w-full h-10 rounded bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isAnalyzing ? "sync" : "psychology"}
                      </span>
                      <span>
                        {isAnalyzing ? "Analyzing Roadway with Vision AI..." : "Re-Scan Roadway with Vision AI"}
                      </span>
                    </button>

                    {/* Scan Message Notice */}
                    {scanMessage && (
                      <div
                        className={`p-3 rounded flex items-center gap-2 text-xs font-semibold ${
                          scanMessage.toLowerCase().includes("not configured") ||
                          scanMessage.toLowerCase().includes("not approved") ||
                          scanMessage.toLowerCase().includes("failed") ||
                          scanMessage.toLowerCase().includes("review required") ||
                          scanMessage.toLowerCase().includes("cannot approve")
                            ? "bg-amber-500/10 border border-amber-500/30 text-amber-900"
                            : "bg-tertiary-fixed/30 border border-tertiary/40 text-tertiary"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {scanMessage.toLowerCase().includes("not configured") ||
                          scanMessage.toLowerCase().includes("not approved") ||
                          scanMessage.toLowerCase().includes("failed") ||
                          scanMessage.toLowerCase().includes("review required") ||
                          scanMessage.toLowerCase().includes("cannot approve")
                            ? "warning"
                            : "verified"}
                        </span>
                        <span>{scanMessage}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* STEP 3: Verification & Impact Preview */}
                <div id="step-3-section" className="bg-surface-container-lowest rounded-lg p-5 sm:p-6 shadow-xs border border-outline-variant/80">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-surface-container">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-mono text-xs font-bold">
                        3
                      </span>
                      <h2 className="text-[17px] font-bold text-on-surface">
                        Verification &amp; dispatch impact preview
                      </h2>
                    </div>
                    <span className="font-mono text-xs font-semibold text-on-surface-variant">
                      Step 3 of 3
                    </span>
                  </div>

                  {photoAnalysis && (
                    <div className="p-4 bg-surface-container-low rounded-lg space-y-4 border border-outline-variant/60">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setVerifiedLabel("blocked");
                              setReopenedSuccess(false);
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-mono text-xs font-bold uppercase transition-all cursor-pointer ${
                              verifiedLabel === "blocked"
                                ? "bg-error-container text-error border-2 border-error/40 shadow-xs"
                                : "bg-surface-container-high text-on-surface-variant border border-outline-variant hover:text-on-surface"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">dangerous</span>
                            <span>Flooded / Impassable</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setVerifiedLabel("clear");
                              setConfirmedSuccess(false);
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-mono text-xs font-bold uppercase transition-all cursor-pointer ${
                              verifiedLabel === "clear"
                                ? "bg-tertiary-fixed text-on-tertiary-fixed-variant border-2 border-tertiary/40 shadow-xs"
                                : "bg-surface-container-high text-on-surface-variant border border-outline-variant hover:text-on-surface"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            <span>Passable / Open</span>
                          </button>
                          <span className="font-mono text-xs font-bold text-on-surface hidden sm:inline">
                            Corridor: {selectedEdgeId}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-on-surface-variant">Confidence:</span>
                          <span className="font-mono text-xs font-bold text-tertiary">
                            {canApprovePhoto
                              ? `${(photoAnalysis.confidence * 100).toFixed(0)}% (Roadway verified)`
                              : "Not approved"}
                          </span>
                        </div>
                      </div>

                      {!canApprovePhoto && !photoAnalysis.modelAvailable && (
                        <div className="p-3.5 bg-error-container/30 border border-error/40 rounded-lg flex items-start gap-2">
                          <span className="material-symbols-outlined text-error text-[20px]">cloud_off</span>
                          <div>
                            <p className="text-xs font-bold text-error">Vision AI service is unavailable</p>
                            <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                              This photo was not analyzed, so it cannot be approved or used to change a corridor. Configure a valid NVIDIA API key, then scan again.
                            </p>
                          </div>
                        </div>
                      )}

                      {!canApprovePhoto && photoAnalysis.modelAvailable && (
                        <div className="p-3.5 bg-error-container/30 border border-error/40 rounded-lg flex items-start gap-2">
                          <span className="material-symbols-outlined text-error text-[20px]">error</span>
                          <div>
                            <p className="text-xs font-bold text-error">Roadway evidence not verified</p>
                            <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                              This image cannot change corridor status or trigger rerouting. Upload a clear roadway image for analysis.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* AI Reason Text */}
                      <div className="p-3.5 bg-white rounded border border-outline-variant/60">
                        <p className="font-bold text-xs text-on-surface">Automated evaluation reasoning:</p>
                        <p className="text-xs font-medium text-on-surface-variant mt-1 leading-snug">
                          "{photoAnalysis.reason}"
                        </p>
                        <div className="mt-2.5 flex items-center gap-2 text-on-surface font-mono text-[11px]">
                          <span className="material-symbols-outlined text-[16px] text-secondary">psychology</span>
                          <span>AI-assisted hazard detection — dispatcher confirmation required.</span>
                        </div>
                      </div>

                      {/* Affected Trucks Advisory */}
                      <div className="p-3.5 bg-surface-container rounded-lg border border-outline-variant/60">
                        <div className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-secondary text-[22px] mt-0.5">
                            alt_route
                          </span>
                          <div>
                            <h4 className="font-bold text-xs text-on-surface">
                              {verifiedLabel === "blocked"
                                ? "Active Convoy Reroute Trigger"
                                : "Corridor Reopening & Clearance Directive"}
                            </h4>
                            <p className="text-xs font-medium text-on-surface-variant mt-1 leading-snug">
                              {verifiedLabel === "blocked" ? (
                                <>
                                  Confirming this closure report will immediately reroute{" "}
                                  <strong className="text-on-surface font-mono">TRK-001 (Insulin &amp; plasma)</strong>{" "}
                                  via Madikeri (+65 min) and notify dispatch for{" "}
                                  <strong className="text-on-surface font-mono">TRK-003</strong>.
                                </>
                              ) : (
                                <>
                                  Marking this road passable will clear detour directives. Assigned convoys will resume standard direct transit along{" "}
                                  <strong className="text-on-surface font-mono">{selectedEdge.name}</strong>.
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Active Status Notice if Already Reported */}
                      {!confirmedSuccess && !reopenedSuccess && isEdgeBlockedByUser && (
                        <div className="p-3.5 bg-error-container/30 border border-error/40 rounded-lg flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-error text-[20px]">warning</span>
                            <div>
                              <p className="text-xs font-bold text-error">
                                {selectedEdge.name} currently has an active closure directive.
                              </p>
                              <p className="text-[11px] text-on-surface-variant font-medium">
                                Trucks are currently avoiding this corridor. You can reopen it below.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleReopenCorridor}
                            className="h-8 px-3 bg-white text-tertiary hover:bg-surface-container text-xs font-bold rounded border border-tertiary/40 shadow-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">lock_open</span>
                            <span>Reopen now</span>
                          </button>
                        </div>
                      )}

                      {/* Confirm & Reopen Action Tray */}
                      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <button
                          type="button"
                          onClick={handleConfirmReport}
                          disabled={!canApprovePhoto}
                          className={`h-11 px-5 font-bold text-xs rounded shadow-xs flex items-center justify-center gap-2 transition-colors flex-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                            confirmedSuccess
                              ? "bg-tertiary text-on-tertiary"
                              : verifiedLabel === "clear"
                              ? "bg-tertiary text-on-tertiary hover:bg-tertiary/90"
                              : "bg-primary text-on-primary hover:bg-primary/90"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {confirmedSuccess
                              ? "check_circle"
                              : verifiedLabel === "clear"
                              ? "lock_open"
                              : "verified"}
                          </span>
                          <span>
                            {confirmedSuccess
                              ? "Road Closure Injected into Live Simulation!"
                              : verifiedLabel === "clear"
                              ? "Confirm road is clear & reopen corridor"
                              : "Confirm road closure & reroute 2 trucks"}
                          </span>
                        </button>

                        {/* Reopen Option Button after resolution or if blocked */}
                        {(confirmedSuccess || isEdgeBlockedByUser) && (
                          <button
                            type="button"
                            onClick={handleReopenCorridor}
                            className="h-11 px-4 bg-tertiary text-on-tertiary hover:bg-tertiary/90 font-bold text-xs rounded shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">lock_open</span>
                            <span>Reopen that road</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            clearUserObservations();
                            setConfirmedSuccess(false);
                            setReopenedSuccess(false);
                          }}
                          className="h-11 px-4 bg-white text-on-surface hover:bg-surface-container font-bold text-xs rounded border border-outline-variant shadow-xs transition-colors cursor-pointer"
                        >
                          Reset reports
                        </button>
                      </div>

                      {/* Post-Resolution Card: After Road Closure Confirmed */}
                      {confirmedSuccess && (
                        <div className="p-4 bg-surface-container rounded-lg border-2 border-error/30 space-y-3">
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-error text-[22px] shrink-0 mt-0.5">
                              block
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-error">
                                  Closure Directive Active for {selectedEdge.name}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-error-container text-error font-mono text-[10px] font-bold uppercase">
                                  Reroute Active
                                </span>
                              </div>
                              <p className="text-xs font-medium text-on-surface-variant mt-1 leading-snug">
                                Road marked impassable. Autonomous routing has rerouted assigned trucks along safe secondary passes.
                              </p>
                            </div>
                          </div>

                          {/* Dedicated Reopen Button after resolution */}
                          <div className="pt-2 border-t border-outline-variant/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <button
                              type="button"
                              onClick={handleReopenCorridor}
                              className="h-11 px-5 bg-tertiary text-on-tertiary hover:bg-tertiary/90 font-bold text-xs rounded shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[18px]">lock_open</span>
                              <span>Reopen That Road (Clear Hazard &amp; Resume Route)</span>
                            </button>

                            <Link
                              href="/dashboard"
                              className="h-11 px-4 bg-white text-primary hover:bg-surface-container font-bold text-xs rounded border border-outline-variant shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <span>View on Control room Map</span>
                              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                            </Link>
                          </div>
                        </div>
                      )}

                      {/* Post-Resolution Card: After Reopening Confirmed */}
                      {reopenedSuccess && (
                        <div className="p-4 bg-tertiary-fixed/30 border-2 border-tertiary/40 rounded-lg space-y-3">
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-tertiary text-[22px] shrink-0 mt-0.5">
                              lock_open
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-tertiary">
                                  Corridor Reopened: {selectedEdge.name} Marked Passable
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed-variant font-mono text-[10px] font-bold uppercase">
                                  Passable
                                </span>
                              </div>
                              <p className="text-xs font-medium text-on-surface-variant mt-1 leading-snug">
                                Hazard cleared. Commercial vehicles and relief shipments will now proceed directly along the primary corridor without detours.
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-tertiary/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <Link
                              href="/dashboard"
                              className="h-11 px-5 bg-primary text-on-primary hover:bg-primary/90 font-bold text-xs rounded shadow-xs flex items-center justify-center gap-2 transition-colors"
                            >
                              <span>Inspect Corridors in Control room</span>
                              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => {
                                setReopenedSuccess(false);
                                setConfirmedSuccess(false);
                              }}
                              className="h-11 px-4 bg-white text-on-surface hover:bg-surface-container font-bold text-xs rounded border border-outline-variant shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">refresh</span>
                              <span>Submit another report</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: GIS Telemetry & Impacted Shipments (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                {/* Corridor Map View Card */}
                <div className="bg-surface-container-lowest rounded-lg p-5 shadow-xs border border-outline-variant/80">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-sm text-on-surface">Corridor Status View</h3>
                      <p className="text-xs font-medium text-on-surface-variant">
                        {selectedEdge.id} — {selectedEdge.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold uppercase bg-primary-fixed text-primary">
                          {REGION_NAMES[selectedEdge.region] || "Pan-India"} Zone
                        </span>
                        <span className="font-mono text-[10px] text-on-surface-variant">
                          • {selectedEdge.terrain.toUpperCase()} • {selectedEdge.lengthKm} km • {selectedEdge.baseMinutes}m
                        </span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                        isEdgeClearedByUser || reopenedSuccess
                          ? "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                          : isEdgeBlockedByUser || confirmedSuccess
                          ? "bg-error-container text-error"
                          : "bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      {isEdgeClearedByUser || reopenedSuccess
                        ? "Passable (Reopened)"
                        : isEdgeBlockedByUser || confirmedSuccess
                        ? "Closure Active"
                        : "2 Trucks In-Route"}
                    </span>
                  </div>

                  {/* Tactical Summary Box */}
                  <div className="w-full bg-surface-container-low p-4 rounded-lg border border-outline-variant/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface">
                        Culvert Breach Marker: km 232.4
                      </span>
                      <span className="font-mono text-[11px] font-bold text-tertiary">
                        Live Sensor Feed
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-on-surface-variant">
                      Flow rate: 18.4 m³/sec • Sakleshpur bypass +65m ETA
                    </p>
                  </div>

                  {/* Reopen Action Button if Blocked */}
                  {(isEdgeBlockedByUser || confirmedSuccess) && (
                    <button
                      type="button"
                      onClick={handleReopenCorridor}
                      className="w-full mt-3 py-2 px-3 bg-tertiary text-on-tertiary hover:bg-tertiary/90 text-xs font-bold rounded shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">lock_open</span>
                      <span>Reopen corridor for transit</span>
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-surface-container">
                    <div className="p-2.5 bg-surface-container-low rounded border border-outline-variant/40">
                      <span className="font-mono text-[10px] text-on-surface-variant uppercase font-semibold">
                        Alternative Route
                      </span>
                      <p className="font-bold text-xs text-on-surface mt-0.5">SH88 Mysore-Madikeri</p>
                      <p className="text-[11px] font-semibold text-tertiary mt-0.5">Clear &amp; verified</p>
                    </div>
                    <div className="p-2.5 bg-surface-container-low rounded border border-outline-variant/40">
                      <span className="font-mono text-[10px] text-on-surface-variant uppercase font-semibold">
                        Local Authority
                      </span>
                      <p className="font-bold text-xs text-on-surface mt-0.5">Hassan District SP</p>
                      <p className="text-[11px] font-semibold text-on-surface-variant mt-0.5">
                        Patrol unit 4 stationed
                      </p>
                    </div>
                  </div>
                </div>

                {/* Impacted Shipments Card */}
                <div className="bg-surface-container-lowest rounded-lg p-5 shadow-xs border border-outline-variant/80">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-sm text-on-surface">Impacted Shipments</h3>
                    <span className="font-mono text-xs font-bold text-secondary">
                      Priority 1 Dispatches
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* TRK-001 */}
                    <div className="p-3 bg-surface-container-low rounded-lg flex items-start justify-between border border-outline-variant/40">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-primary mt-0.5 font-bold">
                          <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-on-surface">TRK-001</span>
                            <span className="px-1.5 py-0.2 rounded bg-surface-container-highest font-mono text-[10px] font-semibold text-on-surface">
                              Cold Chain
                            </span>
                          </div>
                          <p className="text-xs font-medium text-on-surface-variant mt-0.5">
                            Cargo: Insulin &amp; Plasma (380 kg)
                          </p>
                          <p className="font-mono text-[11px] font-bold text-error mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">warning</span>
                            <span>3.2 km to impassable zone</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-on-surface">ETA 16:45</span>
                        <p className="font-mono text-[11px] font-semibold text-tertiary">+65 min detour</p>
                      </div>
                    </div>

                    {/* TRK-003 */}
                    <div className="p-3 bg-surface-container-low rounded-lg flex items-start justify-between border border-outline-variant/40">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-primary mt-0.5 font-bold">
                          <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-on-surface">TRK-003</span>
                            <span className="px-1.5 py-0.2 rounded bg-surface-container-highest font-mono text-[10px] font-semibold text-on-surface">
                              High Capacity
                            </span>
                          </div>
                          <p className="text-xs font-medium text-on-surface-variant mt-0.5">
                            Cargo: Water purification units (2.4T)
                          </p>
                          <p className="font-mono text-[11px] font-semibold text-on-surface-variant mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">route</span>
                            <span>18.5 km away (Hassan town)</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-on-surface">ETA 18:20</span>
                        <p className="font-mono text-[11px] font-semibold text-tertiary">Safe for reroute</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Nearby Reports */}
                <div className="bg-surface-container-lowest rounded-lg p-5 shadow-xs border border-outline-variant/80">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-on-surface">Recent Nearby Reports</h3>
                    <span className="font-mono text-xs font-semibold text-on-surface-variant">
                      Last 2 hours
                    </span>
                  </div>
                  <div className="divide-y divide-surface-container">
                    <div className="py-2.5 first:pt-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-on-surface">Charmadi Ghat km 78</span>
                        <span className="font-mono text-[11px] font-semibold text-on-surface-variant">
                          18 min ago
                        </span>
                      </div>
                      <p className="text-xs font-medium text-on-surface-variant mt-0.5">
                        Minor mudslide on shoulder. Single lane passable with caution.
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-tertiary bg-tertiary-fixed px-1.5 py-0.2 rounded">
                          Passable with Caution
                        </span>
                        <span className="font-mono text-[10px] text-on-surface-variant">
                          Driver #402
                        </span>
                      </div>
                    </div>

                    <div className="py-2.5 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-on-surface">
                          Kozhikode-Wayanad Pass
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-on-surface-variant">
                          1h 14m ago
                        </span>
                      </div>
                      <p className="text-xs font-medium text-on-surface-variant mt-0.5">
                        Tree fallen on power line. Clearance crew on site.
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-error bg-error-container px-1.5 py-0.2 rounded">
                          Lane Blocked
                        </span>
                        <span className="font-mono text-[10px] text-on-surface-variant">
                          Kerala Police
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SOP Protocol Card */}
                <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/60">
                  <div className="flex items-center gap-2 mb-1 text-on-surface">
                    <span className="material-symbols-outlined text-primary text-[18px]">gavel</span>
                    <span className="font-bold text-xs">Standard Operating Protocol</span>
                  </div>
                  <p className="text-xs font-medium text-on-surface-variant leading-relaxed">
                    Every confirmed closure automatically issues SMS dispatch advisories to regional driver groups and updates the state emergency relief transit matrix.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
