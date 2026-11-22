import { z } from "zod";
import { EDGES } from "@/lib/sim/network";

export const ReportExtractionSchema = z.object({
  edgeId: z.string(),
  corridorName: z.string(),
  claim: z.enum(["blocked", "degraded", "clear"]),
  confidence: z.number().min(0).max(1),
  details: z.string(),
  source: z.enum(["nlp_model", "regex_fallback"]),
});

export type ReportExtractionResult = z.infer<typeof ReportExtractionSchema>;

export const CORRIDOR_ALIASES: Record<string, string> = {
  shiradi: "HAS-MNG",
  "has-mng": "HAS-MNG",
  sakleshpur: "HAS-MNG",
  "nh-75": "HAS-MNG",
  "nh 75": "HAS-MNG",
  sampaje: "MDK-MNG",
  "mdk-mng": "MDK-MNG",
  madikeri: "MDK-MNG",
  "nh-275": "MDK-MNG",
  "nh 275": "MDK-MNG",
  thamarassery: "WYN-KZD",
  "wyn-kzd": "WYN-KZD",
  wayanad: "WYN-KZD",
  "nh-766": "WYN-KZD",
  "nh 766": "WYN-KZD",
  periyar: "TSR-KCH",
  "tsr-kch": "TSR-KCH",
  aluva: "TSR-KCH",
  thrissur: "TSR-KCH",
  "nh-544": "TSR-KCH",
  "nh 544": "TSR-KCH",
  kuttanad: "KCH-KTM",
  "kch-ktm": "KCH-KTM",
  alappuzha: "KCH-KTM",
  kottayam: "KCH-KTM",
  "ac road": "KCH-KTM",
  walayar: "CBE-PLK",
  "cbe-plk": "CBE-PLK",
  palakkad: "CBE-PLK",
  coimbatore: "CBE-PLK",
  mysore: "BLR-MYS",
  "blr-mys": "BLR-MYS",
  bangalore: "BLR-MYS",
  bengaluru: "BLR-MYS",
  hosur: "BLR-KGI",
  "blr-kgi": "BLR-KGI",
  krishnagiri: "BLR-KGI",
  dharmapuri: "KGI-SLM",
  "kgi-slm": "KGI-SLM",
  salem: "KGI-SLM",
  madurai: "SLM-MDU",
  "slm-mdu": "SLM-MDU",
  dindigul: "SLM-MDU",
  trivandrum: "KTM-TVM",
  "ktm-tvm": "KTM-TVM",
  kollam: "KTM-TVM",
  thiruvananthapuram: "KTM-TVM",
  nagercoil: "MDU-TVM",
  "mdu-tvm": "MDU-TVM",
  tirunelveli: "MDU-TVM",
};

export function extractReportDeterministic(
  text: string,
  defaultEdgeId?: string
): ReportExtractionResult {
  const lower = text.toLowerCase();

  // Match corridor
  let matchedEdgeId = defaultEdgeId || "HAS-MNG";
  for (const [alias, edgeId] of Object.entries(CORRIDOR_ALIASES)) {
    if (lower.includes(alias)) {
      matchedEdgeId = edgeId;
      break;
    }
  }

  const edge = EDGES.find((e) => e.id === matchedEdgeId) || EDGES[0];

  // Match claim
  let claim: "blocked" | "degraded" | "clear" = "degraded";
  let confidence = 0.85;

  const blockedWords = [
    "blocked",
    "closed",
    "impassable",
    "submerged",
    "landslide",
    "mudslide",
    "rockfall",
    "fallen tree",
    "bridge collapse",
    "breach",
    "shut",
    "stranded",
  ];

  const clearWords = [
    "clear",
    "open",
    "passable",
    "flowing",
    "reopened",
    "drained",
    "safe",
  ];

  if (blockedWords.some((w) => lower.includes(w))) {
    claim = "blocked";
    confidence = 0.92;
  } else if (clearWords.some((w) => lower.includes(w))) {
    claim = "clear";
    confidence = 0.88;
  }

  return {
    edgeId: edge.id,
    corridorName: edge.name,
    claim,
    confidence,
    details: text.trim().slice(0, 300),
    source: "regex_fallback",
  };
}
