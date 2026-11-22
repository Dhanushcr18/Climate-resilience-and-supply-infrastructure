"use client";

import dynamic from "next/dynamic";
import React from "react";
import { ScenarioId } from "@/lib/sim/scenarios";
import { ShipmentSimState, AgentDecision } from "@/lib/sim/engine";
import { RoadStatus, SatelliteFloodPolygon, Observation } from "@/lib/detect/types";
import { ProbeCluster } from "@/lib/detect/simulators/fleetGps";
import { SensorTelemetryReading } from "@/lib/detect/simulators/roadSensor";

export interface MapWrapperProps {
  scenario: ScenarioId;
  simT: number;
  selectedEdgeId: string | null;
  onSelectEdge: (id: string | null) => void;
  trucks?: ShipmentSimState[];
  selectedShipmentCode?: string | null;
  onSelectTruck?: (code: string | null) => void;
  activeRoutePolyline?: [number, number][];
  originalRoutePolyline?: [number, number][];
  roadStatusMap?: Map<string, RoadStatus>;
  satellitePolygons?: SatelliteFloodPolygon[];
  probeClusters?: ProbeCluster[];
  sensorReadings?: SensorTelemetryReading[];
  allObservations?: Observation[];
  decisions?: AgentDecision[];
  className?: string;
}

const DynamicLeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[350px] flex items-center justify-center bg-[#e5ecf2] text-on-surface-variant font-mono text-xs">
      <div className="flex flex-col items-center space-y-2">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Loading GIS Real Map...</span>
      </div>
    </div>
  ),
});

export function Map({ className = "min-h-[500px]", ...props }: MapWrapperProps) {
  return (
    <div className={`w-full h-full flex-1 relative flex flex-col ${className}`}>
      <DynamicLeafletMap {...props} />
    </div>
  );
}
