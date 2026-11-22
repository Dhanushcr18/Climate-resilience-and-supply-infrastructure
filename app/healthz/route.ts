import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { status: "healthy", service: "resilience-ops", timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
