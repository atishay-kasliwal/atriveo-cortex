import { NextResponse } from "next/server";
import { buildWeightedEvidence } from "@/lib/evidence-builder";
import { EVIDENCE_LIMITS, EVIDENCE_LIMITS_4H, type EvidenceLimits } from "@/lib/paths";
import {
  fetchEvidence,
  lastFourHoursRange,
  previousHourRange,
} from "@/lib/screenpipe-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let hourStart = searchParams.get("hourStart");
  let hourEnd = searchParams.get("hourEnd");
  const lastFourHours = searchParams.get("lastFourHours") === "true";

  let limits: EvidenceLimits = EVIDENCE_LIMITS;

  if (lastFourHours) {
    const range = lastFourHoursRange();
    hourStart = range.hourStart;
    hourEnd = range.hourEnd;
    limits = EVIDENCE_LIMITS_4H;
  } else if (!hourStart || !hourEnd) {
    const range = previousHourRange();
    hourStart = range.hourStart;
    hourEnd = range.hourEnd;
  }

  try {
    const evidence = fetchEvidence(hourStart!, hourEnd!, limits);
    const { timeline, stats } = buildWeightedEvidence(evidence);
    return NextResponse.json({
      evidence,
      timeline,
      evidenceStats: stats,
      hourStart,
      hourEnd,
      windowHours: lastFourHours ? 4 : 1,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load evidence" },
      { status: 500 },
    );
  }
}
