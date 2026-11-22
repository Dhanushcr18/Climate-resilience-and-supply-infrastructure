"use client";

import React from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { ShipmentSimState } from "@/lib/sim/engine";
import { AlertTriangle } from "lucide-react";

interface TruckMarkersProps {
  trucks: ShipmentSimState[];
  selectedCode: string | null;
  onSelectTruck: (code: string | null) => void;
}

export function TruckMarkers({
  trucks,
  selectedCode,
  onSelectTruck,
}: TruckMarkersProps) {
  return (
    <>
      {trucks.map((truck) => {
        const isSelected = selectedCode === truck.code;
        const isPending = truck.status === "pending";
        const isBlocked = truck.isBlocked || truck.status === "delayed";
        const isHeld = truck.status === "held";
        const isDelivered = truck.status === "delivered";

        // Aurora Vehicle Palette
        let cargoColor = "bg-[#14f1d9] text-[#05070d]";
        let cargoIconSvg = `💊`;
        if (truck.shipment.cargo === "food") {
          cargoColor = "bg-[#ffd166] text-[#05070d]";
          cargoIconSvg = `🌾`;
        } else if (truck.shipment.cargo === "fuel") {
          cargoColor = "bg-[#ff8a3d] text-[#05070d]";
          cargoIconSvg = `⛽`;
        } else if (truck.shipment.cargo === "water") {
          cargoColor = "bg-[#3ddcff] text-[#05070d]";
          cargoIconSvg = `💧`;
        }

        const borderRing = isBlocked
          ? "ring-4 ring-[#ff3b5c] animate-pulse"
          : isHeld
          ? "ring-4 ring-[#cabeff]"
          : isSelected
          ? "ring-4 ring-[#14f1d9] shadow-[0_0_16px_#14f1d9]"
          : isPending
          ? "ring-2 ring-emerald-400/80 shadow-md"
          : "";

        const divHtml = `
          <div class="relative group cursor-pointer -translate-x-1/2 -translate-y-1/2 pointer-events-auto select-none" style="z-index: ${isSelected ? 9999 : 500};">
            ${
              isBlocked || isSelected
                ? `<span class="animate-ping absolute -inset-1 rounded-full ${
                    isBlocked ? "bg-[#ff3b5c]" : "bg-[#14f1d9]"
                  } opacity-40"></span>`
                : ""
            }
            <div class="w-8 h-8 rounded-full ${cargoColor} ${borderRing} border-2 border-white/20 flex items-center justify-center text-xs shadow-2xl transform transition-transform group-hover:scale-125 z-10">
              <span>${cargoIconSvg}</span>
            </div>
            ${
              isHeld
                ? `<div class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-secondary rounded-full border border-slate-900 flex items-center justify-center text-[8px] font-bold text-slate-950">⏱</div>`
                : isBlocked
                ? `<div class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-error rounded-full border border-slate-900 flex items-center justify-center text-[8px] font-bold text-white animate-bounce">!</div>`
                : isPending
                ? `<div class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border border-slate-900 flex items-center justify-center text-[8px] font-bold text-white">●</div>`
                : ""
            }
            <div class="absolute top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded ${
              isSelected
                ? "bg-[#14f1d9] text-slate-950 font-black ring-2 ring-white shadow-xl scale-110"
                : "bg-slate-900/95 text-white font-bold"
            } border border-slate-700/80 text-[10px] font-mono whitespace-nowrap shadow-md pointer-events-none transition-all">
              ${truck.code}
            </div>
          </div>
        `;

        const icon = L.divIcon({
          className: "truck-marker-icon",
          html: divHtml,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        return (
          <Marker
            key={truck.code}
            position={[truck.lat, truck.lng]}
            icon={icon}
            eventHandlers={{
              click: () => onSelectTruck(truck.code),
            }}
          >
            <Popup className="dark-popup">
              <div className="p-3 text-on-surface min-w-[240px] font-body">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-base">{cargoIconSvg}</span>
                    <div>
                      <div className="font-headline font-bold text-sm text-white">
                        #{truck.code}
                      </div>
                      <div className="text-[10px] text-on-surface-variant font-mono capitalize">
                        {truck.shipment.cargo} • {truck.shipment.priority}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                      isBlocked
                        ? "bg-error-container/40 text-error border-error/40"
                        : isHeld
                        ? "bg-secondary-container/40 text-secondary border-secondary/30"
                        : isDelivered
                        ? "bg-[#22e3a0]/20 text-[#22e3a0] border-[#22e3a0]/30"
                        : "bg-primary-container/20 text-primary-container border-primary-container/30"
                    }`}
                  >
                    {truck.status.replace("_", " ")}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-on-surface font-mono">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Driver:</span>
                    <span>{truck.shipment.driverName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Route:</span>
                    <span className="text-primary font-bold">
                      {truck.shipment.origin} → {truck.shipment.destination}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Plate:</span>
                    <span>{truck.shipment.truckPlate}</span>
                  </div>
                  {truck.shipment.cargo === "medicine" && (
                    <div className="flex justify-between text-primary">
                      <span>Cold Chain:</span>
                      <span className="font-bold">4.2°C STABLE</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Delay:</span>
                    <span
                      className={
                        truck.totalDelayHours > 0
                          ? "text-error font-bold"
                          : "text-[#22e3a0]"
                      }
                    >
                      +{truck.totalDelayHours} hrs
                    </span>
                  </div>
                </div>

                {truck.blockedReason && (
                  <div className="mt-2 p-2 rounded bg-error-container/30 border border-error/30 text-[10px] text-error flex items-start space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" />
                    <span>{truck.blockedReason}</span>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
