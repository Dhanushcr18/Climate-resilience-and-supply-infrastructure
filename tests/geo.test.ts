import { describe, it, expect } from "vitest";
import { haversine, polylineLength, pointAlongPolyline, interpolate } from "../lib/sim/geo";

describe("Geographic calculations (geo.ts)", () => {
  it("calculates accurate haversine distance between known coordinates", () => {
    // Bengaluru (12.9716, 77.5946) to Mysuru (12.2958, 76.6394) is ~128 km great-circle
    const dist = haversine(12.9716, 77.5946, 12.2958, 76.6394);
    expect(dist).toBeGreaterThan(120);
    expect(dist).toBeLessThan(140);
  });

  it("handles identical coordinates with zero distance", () => {
    expect(haversine(12.97, 77.59, 12.97, 77.59)).toBe(0);
  });

  it("calculates polyline length correctly", () => {
    const points: [number, number][] = [
      [12.9716, 77.5946],
      [12.5, 77.0],
      [12.2958, 76.6394],
    ];
    const len = polylineLength(points);
    expect(len).toBeGreaterThan(125);
  });

  it("interpolates points accurately", () => {
    const p1: [number, number] = [10, 20];
    const p2: [number, number] = [20, 40];
    const mid = interpolate(p1, p2, 0.5);
    expect(mid[0]).toBeCloseTo(15);
    expect(mid[1]).toBeCloseTo(30);
  });

  it("finds point along polyline at fraction bounds (0, 0.5, 1)", () => {
    const points: [number, number][] = [
      [10, 10],
      [10, 20],
      [10, 30],
    ];
    const at0 = pointAlongPolyline(points, 0);
    expect(at0.lat).toBeCloseTo(10);
    expect(at0.lng).toBeCloseTo(10);

    const atHalf = pointAlongPolyline(points, 0.5);
    expect(atHalf.lat).toBeCloseTo(10);
    expect(atHalf.lng).toBeCloseTo(20);

    const at1 = pointAlongPolyline(points, 1);
    expect(at1.lat).toBeCloseTo(10);
    expect(at1.lng).toBeCloseTo(30);
  });

  it("safely handles out of bound fractions", () => {
    const points: [number, number][] = [
      [10, 10],
      [10, 20],
    ];
    const negative = pointAlongPolyline(points, -0.2);
    expect(negative.lat).toBeCloseTo(10);
    expect(negative.lng).toBeCloseTo(10);

    const overOne = pointAlongPolyline(points, 1.5);
    expect(overOne.lat).toBeCloseTo(10);
    expect(overOne.lng).toBeCloseTo(20);
  });
});
