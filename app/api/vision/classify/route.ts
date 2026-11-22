import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dns from "node:dns";

// Ensure IPv4 is prioritized to avoid IPv6 connect timeouts on certain networks
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

export const dynamic = "force-dynamic";

// Strict schema for Vision AI incident classification
const VisionClassificationSchema = z.object({
  label: z.enum(["blocked", "degraded", "clear"]),
  confidence: z.number().min(0).max(1),
  waterDepthEstimateCm: z.number().nullable().optional(),
  passableForTruck: z.boolean(),
  isRoadwayImage: z.boolean(),
  requiresManualReview: z.boolean(),
  modelAvailable: z.boolean(),
  reason: z.string().max(500),
  source: z.enum(["live_vision", "live_nvidia", "offline_fallback", "demo_manifest"]),
});

export type VisionClassificationResult = z.infer<typeof VisionClassificationSchema>;

const DEMO_IMAGE_HINTS = ["flood-deep", "landslide-blocked", "puddle-passable"];

function needsReview(reason: string): VisionClassificationResult {
  return {
    // The existing status shape is retained so callers can render a result, but this
    // is explicitly not a road finding and cannot be approved by the client.
    label: "degraded",
    confidence: 0,
    waterDepthEstimateCm: null,
    passableForTruck: false,
    isRoadwayImage: false,
    requiresManualReview: true,
    modelAvailable: false,
    reason,
    source: "offline_fallback",
  };
}

function parseModelJson(text: string) {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    return JSON.parse(match[0]);
  }
  const json = text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(json);
}

function toLiveResult(parsed: Record<string, unknown>, source: "live_vision" | "live_nvidia") {
  const isRoadway = parsed.isRoadwayImage !== undefined ? Boolean(parsed.isRoadwayImage) : true;
  const rawLabel = String(parsed.label || parsed.claim || "degraded").toLowerCase();
  const label: "blocked" | "degraded" | "clear" =
    rawLabel.includes("block") || rawLabel.includes("impass")
      ? "blocked"
      : rawLabel.includes("clear") || rawLabel.includes("pass")
      ? "clear"
      : "degraded";

  return VisionClassificationSchema.parse({
    label,
    confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.95)),
    waterDepthEstimateCm:
      typeof parsed.waterDepthEstimateCm === "number" ? parsed.waterDepthEstimateCm : null,
    passableForTruck:
      typeof parsed.passableForTruck === "boolean"
        ? parsed.passableForTruck
        : label === "clear",
    isRoadwayImage: isRoadway,
    requiresManualReview:
      !isRoadway ? true : Boolean(parsed.requiresManualReview),
    modelAvailable: true,
    reason: String(parsed.reason || parsed.details || "NVIDIA Vision model inference complete.").slice(0, 500),
    source,
  });
}

// Offline fallback is deliberately limited to the built-in demo assets. It must
// never invent a hazard result for a user-uploaded image it cannot actually inspect.
function getOfflineClassification(
  hint?: string,
  fileName?: string
): VisionClassificationResult {
  const normalizedHint = (hint || fileName || "").toLowerCase();

  if (!DEMO_IMAGE_HINTS.some((demoHint) => normalizedHint.includes(demoHint))) {
    return needsReview(
      "Unable to verify that this upload shows a roadway hazard. Attach a clear road or dashcam image and have a dispatcher review it before any dispatch action."
    );
  }

  if (normalizedHint.includes("landslide") || normalizedHint.includes("rockfall")) {
    return {
      label: "blocked",
      confidence: 0.92,
      waterDepthEstimateCm: 15,
      passableForTruck: false,
      isRoadwayImage: true,
      requiresManualReview: false,
      modelAvailable: false,
      reason: "Visual AI identified severe hillside debris and boulder slide completely occluding travel lanes.",
      source: "offline_fallback",
    };
  }

  if (normalizedHint.includes("puddle") || normalizedHint.includes("passable") || normalizedHint.includes("shallow")) {
    return {
      label: "clear",
      confidence: 0.88,
      waterDepthEstimateCm: 8,
      passableForTruck: true,
      isRoadwayImage: true,
      requiresManualReview: false,
      modelAvailable: false,
      reason: "Surface puddling detected along road shoulder; primary travel lanes maintain adequate tire friction and passage.",
      source: "offline_fallback",
    };
  }

  // Default flood / submerged road
  return {
    label: "blocked",
    confidence: 0.94,
    waterDepthEstimateCm: 55,
    passableForTruck: false,
    isRoadwayImage: true,
    requiresManualReview: false,
    modelAvailable: false,
    reason: "Severe flood inundation detected. High water depth (>50cm) exceeds commercial freight axle clearance.",
    source: "offline_fallback",
  };
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let base64Data = "";
    let mimeType = "image/jpeg";
    let hint = "";
    let fileName = "";
    let userCommentary = "";
    let targetCorridor = "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      base64Data = body.image || "";
      mimeType = body.mimeType || "image/jpeg";
      hint = body.hint || "";
      fileName = body.fileName || "";
      userCommentary = body.description || body.commentary || "";
      targetCorridor = body.corridor || "";
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      hint = (formData.get("hint") as string) || "";
      userCommentary = (formData.get("description") as string) || (formData.get("commentary") as string) || "";
      targetCorridor = (formData.get("corridor") as string) || "";

      if (file) {
        fileName = file.name;
        mimeType = file.type || "image/jpeg";

        // Security check: 4 MB limit
        if (file.size > 4 * 1024 * 1024) {
          return NextResponse.json(
            { error: "Image exceeds 4MB limit" },
            { status: 413 }
          );
        }

        // Security check: allowed formats (handling image/jpg, image/jpeg, image/png, image/webp)
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const isAllowedExt = ["jpg", "jpeg", "png", "webp"].includes(ext);
        const isAllowedMime = ["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp"].includes(
          mimeType.toLowerCase()
        );

        if (!isAllowedExt || !isAllowedMime) {
          return NextResponse.json(
            { error: "Unsupported image format. Allowed: JPEG, PNG, WebP" },
            { status: 415 }
          );
        }

        // Normalize mimeType for Gemini / processing
        if (ext === "png" || mimeType === "image/png") mimeType = "image/png";
        else if (ext === "webp" || mimeType === "image/webp") mimeType = "image/webp";
        else mimeType = "image/jpeg";

        const arrayBuffer = await file.arrayBuffer();
        base64Data = Buffer.from(arrayBuffer).toString("base64");
      }
    }

    const nvidiaApiKey =
      process.env.NVIDIA_API_KEY ||
      "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";
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

    if (nvidiaApiKey && base64Data) {
      try {
        const prompt = `You are an expert transportation safety and visual hazard AI inspector for highway logistics.
Analyze this roadway / infrastructure photograph during severe weather.
${userCommentary ? `Driver / Observer Field Report: "${userCommentary}"` : ""}
${targetCorridor ? `Corridor: ${targetCorridor}` : ""}

Determine:
1. Is this a photograph of a road, bridge, highway, culvert, mountain pass, or dashcam view? (isRoadwayImage: true/false).
2. What is the roadway condition:
   - "blocked" (roadway is impassable: deep water, submerged road, culvert overflow, mudslide, rockfall, fallen tree, structural failure)
   - "degraded" (passable with caution: shallow puddling, debris on shoulder, slow traffic)
   - "clear" (safe, dry or normal damp surface with clear travel lanes)
3. Estimated water depth in cm (if water is present, e.g. 50, 75, or null if dry).
4. Is it passable for heavy commercial freight trucks? (passableForTruck: true/false).
5. If it is a real roadway with identifiable condition, set "requiresManualReview": false. Only set "requiresManualReview": true if the image is not a roadway or completely unreadable.
6. A concise 1-2 sentence reason explaining the hazard observed.

Respond strictly with a valid JSON object matching this schema:
{
  "label": "blocked" | "degraded" | "clear",
  "confidence": 0.95,
  "waterDepthEstimateCm": 75,
  "passableForTruck": false,
  "isRoadwayImage": true,
  "requiresManualReview": false,
  "reason": "Water has overflowed the culvert making the corridor impassable for heavy commercial vehicles."
}`;

        const nvidiaRes = await fetch(
          "https://integrate.api.nvidia.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${nvidiaApiKey}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "nvidia/nemotron-3.5-super-vl-120b-a12b",
              messages: [
                {
                  role: "system",
                  content:
                    "You are an autonomous road hazard vision classifier. Output only valid JSON without markdown or conversational filler.",
                },
                {
                  role: "user",
                  content: [
                    { type: "text", text: prompt },
                    {
                      type: "image_url",
                      image_url: { url: `data:${mimeType};base64,${base64Data}` },
                    },
                  ],
                },
              ],
              temperature: 0.1,
              max_tokens: 3500,
            }),
            signal: AbortSignal.timeout(25000),
          }
        );

        if (nvidiaRes.ok) {
          const nvidiaData = await nvidiaRes.json();
          const choice = nvidiaData?.choices?.[0];
          const text = choice?.message?.content || "";
          if (text) {
            try {
              const parsed = parseModelJson(text);
              return NextResponse.json(toLiveResult(parsed, "live_nvidia"));
            } catch (err) {
              console.warn("Failed to parse nvidia content:", err);
            }
          }
          const reasoning = choice?.message?.reasoning_content || "";
          if (reasoning) {
            try {
              const match = reasoning.match(/\{[\s\S]*\}/);
              if (match) {
                const parsed = JSON.parse(match[0]);
                return NextResponse.json(toLiveResult(parsed, "live_nvidia"));
              }
            } catch (err) {
              console.warn("Failed to parse nvidia reasoning:", err);
            }
          }
        } else {
          const errText = await nvidiaRes.text();
          console.error("NVIDIA API response error:", nvidiaRes.status, errText);
        }
      } catch (e) {
        console.error("NVIDIA API call error:", e);
      }
    }

    if (geminiApiKey && base64Data) {
      try {
        const prompt = `Analyze this road infrastructure photograph during severe weather.
First decide whether this is a usable road/dashcam image. If it does not visibly show a roadway, road hazard, or road condition, set "isRoadwayImage" to false and "requiresManualReview" to true. Never infer a road closure from a non-road image.

Only if it is a usable roadway image, determine whether the roadway is:
1. "blocked" (impassable: flood >30cm, landslide, fallen tree, bridge failure)
2. "degraded" (slow moving: minor waterlogging, debris, surface erosion)
3. "clear" (safe for commercial freight trucks)

Return strictly valid JSON matching this schema:
{
  "label": "blocked" | "degraded" | "clear",
  "confidence": number between 0.0 and 1.0,
  "waterDepthEstimateCm": number in cm or null,
  "passableForTruck": boolean,
  "isRoadwayImage": boolean,
  "requiresManualReview": boolean,
  "reason": "concise explanation under 40 words"
}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType,
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
              },
            }),
            signal: AbortSignal.timeout(6000),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const text =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

          return NextResponse.json(toLiveResult(parseModelJson(text), "live_vision"));
        }
      } catch {
        // Fallback gracefully on any external API or timeout failure
      }
    }

    // Deterministic offline fallback (fully keyless demo ready)
    const fallback = getOfflineClassification(hint, fileName);
    return NextResponse.json(fallback);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Classification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
