import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      shipmentCode,
      decision,
      roadName,
      riskScore,
      reason,
      extraMinutes,
      delayAvoidedMin,
      alternateRoute,
    } = body;

    const delayAvoidedHours = (delayAvoidedMin / 60).toFixed(1);
    const templateText = `${shipmentCode} rerouted via ${alternateRoute || "alternate corridor"}: ${roadName} reached ${riskScore}% landslide/flood hazard (${reason}). Detour adds ${extraMinutes} min but protects delivery and prevents an estimated ${delayAvoidedHours}h closure hold.`;

    const nvidiaApiKey =
      process.env.NVIDIA_API_KEY ||
      "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";
    const apiKey = process.env.GEMINI_API_KEY;

    // Strict prompt
    const prompt = `You are the autonomous logistics resilience AI agent ResilienceOps.
Explain this dispatch intervention in exactly 2 clear, authoritative sentences using ONLY these structured facts. Invent NO new numbers, locations, or details:
- Shipment: ${shipmentCode}
- Action: ${decision}
- Hazardous Road: ${roadName} (${riskScore}% risk)
- Geophysical Diagnostics: ${reason}
- Added Detour: ${extraMinutes} minutes
- Estimated Delay Prevented: ${delayAvoidedHours} hours
- Alternative Path: ${alternateRoute}
Keep it concise, professional, and operational.`;

    if (nvidiaApiKey) {
      try {
        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${nvidiaApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "nvidia/nemotron-3.5-super-vl-120b-a12b",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 256,
            temperature: 0.2,
          }),
          signal: AbortSignal.timeout(8000),
        });

        if (response.ok) {
          const data = await response.json();
          const choice = data?.choices?.[0];
          const text = choice?.message?.content || choice?.message?.reasoning_content;
          if (text) {
            return NextResponse.json({
              text: text.trim(),
              source: "nvidia",
            });
          }
        }
      } catch {
        // Fallback
      }
    }

    if (!apiKey) {
      return NextResponse.json({
        text: templateText,
        source: "template",
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 120,
          temperature: 0.2,
        },
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({
        text: templateText,
        source: "template",
      });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return NextResponse.json({
      text: text || templateText,
      source: text ? "gemini" : "template",
    });
  } catch (err) {
    return NextResponse.json({
      text: "Shipment rerouted along verified alternate corridor to avoid catastrophic flood closures.",
      source: "template",
    });
  }
}
