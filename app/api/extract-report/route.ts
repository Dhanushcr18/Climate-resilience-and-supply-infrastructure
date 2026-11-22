import { NextRequest, NextResponse } from "next/server";
import { EDGES } from "@/lib/sim/network";
import { extractReportDeterministic, ReportExtractionSchema } from "@/lib/detect/extract";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = String(body.text || "").trim();
    const defaultEdgeId = body.edgeId;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const nvidiaApiKey =
      process.env.NVIDIA_API_KEY ||
      "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";
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

    if (nvidiaApiKey && text.length > 10) {
      try {
        const edgeListStr = EDGES.map((e) => `${e.id}: ${e.name}`).join(", ");
        const prompt = `You are a freight transport dispatch parser.
Extract the incident details from this field report: "${text}"

Available Corridors: [${edgeListStr}]

Return strictly valid JSON:
{
  "edgeId": "Corridor ID from the list, or closest match",
  "corridorName": "Corridor name",
  "claim": "blocked" | "degraded" | "clear",
  "confidence": number between 0.0 and 1.0,
  "details": "clean summarized description under 30 words"
}`;

        const nvidiaRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${nvidiaApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "nvidia/nemotron-3.5-super-vl-120b-a12b",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 512,
            temperature: 0.1,
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (nvidiaRes.ok) {
          const nvidiaData = await nvidiaRes.json();
          const choice = nvidiaData?.choices?.[0];
          const rawText = choice?.message?.content || choice?.message?.reasoning_content || "";
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            const edge =
              EDGES.find((e) => e.id === parsed.edgeId) ||
              EDGES.find((e) => e.id === defaultEdgeId) ||
              EDGES[0];

            const validated = ReportExtractionSchema.parse({
              edgeId: edge.id,
              corridorName: edge.name,
              claim: parsed.claim,
              confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.85)),
              details: String(parsed.details || text).slice(0, 300),
              source: "nlp_model",
            });

            return NextResponse.json(validated);
          }
        }
      } catch {
        // Fallback silently
      }
    }

    if (apiKey && text.length > 10) {
      try {
        const edgeListStr = EDGES.map((e) => `${e.id}: ${e.name}`).join(", ");
        const prompt = `You are a freight transport dispatch parser.
Extract the incident details from this field report: "${text}"

Available Corridors: [${edgeListStr}]

Return strictly valid JSON:
{
  "edgeId": "Corridor ID from the list, or closest match",
  "corridorName": "Corridor name",
  "claim": "blocked" | "degraded" | "clear",
  "confidence": number between 0.0 and 1.0,
  "details": "clean summarized description under 30 words"
}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
              },
            }),
            signal: AbortSignal.timeout(5000),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
          const parsed = JSON.parse(rawText);

          const edge =
            EDGES.find((e) => e.id === parsed.edgeId) ||
            EDGES.find((e) => e.id === defaultEdgeId) ||
            EDGES[0];

          const validated = ReportExtractionSchema.parse({
            edgeId: edge.id,
            corridorName: edge.name,
            claim: parsed.claim,
            confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.85)),
            details: String(parsed.details || text).slice(0, 300),
            source: "nlp_model",
          });

          return NextResponse.json(validated);
        }
      } catch {
        // Fallback silently to deterministic regex parser
      }
    }

    const fallback = extractReportDeterministic(text, defaultEdgeId);
    return NextResponse.json(fallback);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
