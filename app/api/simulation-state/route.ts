import { NextRequest, NextResponse } from "next/server";
import { readSimulationState, writeSimulationState } from "@/lib/database/simulation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await readSimulationState());
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read simulation database", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const patch =
      body && typeof body.state === "object" && body.state
        ? body.state as Record<string, unknown>
        : body && typeof body === "object"
        ? body as Record<string, unknown>
        : null;
    if (!patch) {
      return NextResponse.json({ error: "Invalid simulation state" }, { status: 400 });
    }
    return NextResponse.json(await writeSimulationState(patch, body.replace === true));
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to write simulation database", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    return NextResponse.json(await writeSimulationState({}, true));
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to reset simulation database", detail: String(error) },
      { status: 500 }
    );
  }
}
