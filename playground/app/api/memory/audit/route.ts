import { NextResponse } from "next/server";
import { getMemoryAuditReport } from "@/lib/memory-audit";

export const runtime = "nodejs";

export async function GET() {
  try {
    const report = await getMemoryAuditReport();
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load memory audit" },
      { status: 500 },
    );
  }
}
