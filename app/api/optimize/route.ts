import { NextRequest, NextResponse } from "next/server";
import { solve, solveBuiltin } from "@/lib/optimizer";
import { OptimizationRequest } from "@/lib/optimizer/types";
import { validateOptimizationResult } from "@/lib/optimizer/validate";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    cuoptConfigured: Boolean(process.env.CUOPT_URL),
  });
}

export async function POST(request: NextRequest) {
  let body: {
    request?: OptimizationRequest;
    compare?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.request) {
    return NextResponse.json({ error: "Optimization request is required" }, { status: 400 });
  }

  if (body.compare) {
    const builtin = solveBuiltin(body.request);
    const builtinValidation = validateOptimizationResult(body.request, builtin);
    const builtinResult = builtinValidation.valid ? builtin : {
      ...builtin,
      assignments: [],
      unassignedOrders: body.request.orders.map((order) => ({
        orderId: order.id,
        reason: builtinValidation.reason || "Invalid built-in plan",
      })),
    };

    if (!process.env.CUOPT_URL) {
      return NextResponse.json({
        cuoptConfigured: false,
        builtin: builtinResult,
        cuopt: null,
      });
    }
    const cuopt = await solve(body.request);
    return NextResponse.json({
      cuoptConfigured: true,
      builtin: builtinResult,
      cuopt: cuopt.solver === "cuopt" ? cuopt : null,
      fallback: cuopt.solver === "builtin" ? cuopt : null,
    });
  }

  const result = await solve(body.request);
  return NextResponse.json({ cuoptConfigured: Boolean(process.env.CUOPT_URL), result });
}
