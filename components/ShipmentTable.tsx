"use client";

import React, { useState } from "react";
import { ShipmentSimState } from "@/lib/sim/engine";

interface ShipmentTableProps {
  trucks: ShipmentSimState[];
  selectedCode: string | null;
  onSelectTruck: (code: string | null) => void;
}

export function ShipmentTable({
  trucks,
  selectedCode,
  onSelectTruck,
}: ShipmentTableProps) {
  const [sortField, setSortField] = useState<"code" | "priority" | "status" | "delay">("code");

  const sortedTrucks = [...trucks].sort((a, b) => {
    if (sortField === "code") return a.code.localeCompare(b.code);
    if (sortField === "delay") return b.totalDelayHours - a.totalDelayHours;
    if (sortField === "status") return a.status.localeCompare(b.status);
    if (sortField === "priority") {
      const pMap = { critical: 3, high: 2, normal: 1 };
      return (pMap[b.shipment.priority] || 0) - (pMap[a.shipment.priority] || 0);
    }
    return 0;
  });

  return (
    <div className="overflow-x-auto h-full text-xs">
      <table className="w-full text-left font-body">
        <thead className="bg-surface-container-lowest/90 text-on-surface-variant uppercase tracking-wider text-[10px] font-mono sticky top-0 border-b border-white/5">
          <tr>
            <th
              className="p-2.5 cursor-pointer hover:text-on-surface"
              onClick={() => setSortField("code")}
            >
              Unit
            </th>
            <th className="p-2.5">Payload &amp; Telemetry</th>
            <th
              className="p-2.5 cursor-pointer hover:text-on-surface"
              onClick={() => setSortField("priority")}
            >
              Priority
            </th>
            <th
              className="p-2.5 cursor-pointer hover:text-on-surface"
              onClick={() => setSortField("status")}
            >
              Status
            </th>
            <th
              className="p-2.5 cursor-pointer hover:text-on-surface"
              onClick={() => setSortField("delay")}
            >
              Delay
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 font-mono text-[11px] text-on-surface">
          {sortedTrucks.map((truck) => {
            const isSelected = selectedCode === truck.code;
            const isBlocked = truck.isBlocked || truck.status === "delayed";
            const isHeld = truck.status === "held";
            const isDelivered = truck.status === "delivered";

            let cargoEmoji = "💊";
            if (truck.shipment.cargo === "food") cargoEmoji = "🌾";
            if (truck.shipment.cargo === "fuel") cargoEmoji = "⛽";
            if (truck.shipment.cargo === "water") cargoEmoji = "💧";

            let statusColor = "bg-primary-container/20 text-primary-container border-primary-container/30";
            let statusText = truck.status.replace("_", " ");

            if (isBlocked) {
              statusColor = "bg-error-container/40 text-error border-error/40 animate-pulse";
              statusText = "BLOCKED";
            } else if (isHeld) {
              statusColor = "bg-secondary-container/40 text-secondary border-secondary/30";
              statusText = "HELD STAGE";
            } else if (isDelivered) {
              statusColor = "bg-[#22e3a0]/20 text-[#22e3a0] border-[#22e3a0]/30";
              statusText = "DELIVERED";
            } else if (truck.status === "pending") {
              statusColor = "bg-surface-container text-on-surface-variant border-white/5";
              statusText = "STAGING";
            }

            return (
              <tr
                key={truck.code}
                onClick={() => onSelectTruck(truck.code)}
                className={`cursor-pointer transition ${
                  isSelected
                    ? "bg-surface-container-high/90 border-l-2 border-primary"
                    : "hover:bg-surface-container/60"
                }`}
              >
                <td className="p-2.5 font-bold text-on-surface whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-primary font-bold">{truck.code}</span>
                  </div>
                </td>
                <td className="p-2.5">
                  <div className="flex flex-col">
                    <span className="capitalize text-on-surface text-[11px] flex items-center gap-1">
                      <span>{cargoEmoji}</span>
                      <span>{truck.shipment.cargo}</span>
                    </span>
                    <span className="text-[9px] text-on-surface-variant truncate">
                      {truck.shipment.cargo === "medicine"
                        ? "4.2°C Cold-Chain"
                        : `${truck.shipment.origin} → ${truck.shipment.destination}`}
                    </span>
                  </div>
                </td>
                <td className="p-2.5">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border ${
                      truck.shipment.priority === "critical"
                        ? "bg-error-container/20 text-error border-error/30"
                        : truck.shipment.priority === "high"
                        ? "bg-secondary-container/20 text-secondary border-secondary/30"
                        : "bg-surface-container text-on-surface-variant border-white/5"
                    }`}
                  >
                    {truck.shipment.priority}
                  </span>
                </td>
                <td className="p-2.5">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${statusColor}`}
                  >
                    {statusText}
                  </span>
                </td>
                <td className="p-2.5">
                  <span
                    className={
                      truck.totalDelayHours > 0
                        ? "text-error font-bold"
                        : "text-[#22e3a0]"
                    }
                  >
                    +{truck.totalDelayHours}h
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
