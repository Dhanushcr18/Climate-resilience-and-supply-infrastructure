import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { extractReportDeterministic } from "@/lib/detect/extract";
import { Observation } from "@/lib/detect/types";

describe("Milestone D5: Text NLP Extraction & Alert/GeoJSON Import", () => {
  it("1. Deterministic NLP extracts corridor and claim from field dispatch text", () => {
    const report1 = extractReportDeterministic(
      "NH-75 Shiradi Ghat completely blocked by boulder landslide near mile 42."
    );
    expect(report1.edgeId).toBe("HAS-MNG");
    expect(report1.claim).toBe("blocked");
    expect(report1.confidence).toBeGreaterThanOrEqual(0.85);

    const report2 = extractReportDeterministic(
      "Walayar pass CBE-PLK is completely clear and open for heavy freight trucks."
    );
    expect(report2.edgeId).toBe("CBE-PLK");
    expect(report2.claim).toBe("clear");

    const report3 = extractReportDeterministic(
      "Periyar lowland TSR-KCH experiencing slow movement and waterlogging near Aluva."
    );
    expect(report3.edgeId).toBe("TSR-KCH");
    expect(report3.claim).toBe("degraded");
  });

  it("2. Official Alert sample JSON file exists and matches alert schema", () => {
    const alertsPath = path.join(process.cwd(), "public", "samples", "alerts-sample.json");
    expect(fs.existsSync(alertsPath)).toBe(true);

    const raw = fs.readFileSync(alertsPath, "utf-8");
    const alerts = JSON.parse(raw);
    expect(Array.isArray(alerts)).toBe(true);
    expect(alerts.length).toBeGreaterThan(0);

    const first = alerts[0];
    expect(first.corridorId).toBe("HAS-MNG");
    expect(first.status).toBe("blocked");
    expect(first.confidence).toBeGreaterThan(0.9);
  });

  it("3. Satellite Flood sample GeoJSON file exists and has valid polygon geometry", () => {
    const geoJsonPath = path.join(
      process.cwd(),
      "public",
      "samples",
      "satellite-flood-sample.geojson"
    );
    expect(fs.existsSync(geoJsonPath)).toBe(true);

    const raw = fs.readFileSync(geoJsonPath, "utf-8");
    const geojson = JSON.parse(raw);
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.features.length).toBeGreaterThan(0);

    const feature = geojson.features[0];
    expect(feature.geometry.type).toBe("Polygon");
    expect(feature.geometry.coordinates[0].length).toBeGreaterThanOrEqual(4);
    expect(feature.properties.correlatedEdgeId).toBe("HAS-MNG");
  });
});
