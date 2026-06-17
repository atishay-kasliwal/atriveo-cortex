import { NextResponse } from "next/server";
import { extractWindow } from "@/lib/extract";
import { EVIDENCE_LIMITS, EVIDENCE_LIMITS_4H } from "@/lib/paths";
import { lastFourHoursRange, previousHourRange } from "@/lib/screenpipe-db";

export const runtime = "nodejs";
export const maxDuration = 600;

function limitsForWindow(hourStart: string, hourEnd: string) {
  const hours =
    (new Date(hourEnd).getTime() - new Date(hourStart).getTime()) / 3_600_000;
  return hours >= 3.5 ? EVIDENCE_LIMITS_4H : EVIDENCE_LIMITS;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      hourStart?: string;
      hourEnd?: string;
      prompt?: string;
      previousHour?: boolean;
      lastFourHours?: boolean;
    };

    let hourStart = body.hourStart;
    let hourEnd = body.hourEnd;

    if (body.lastFourHours) {
      const range = lastFourHoursRange();
      hourStart = range.hourStart;
      hourEnd = range.hourEnd;
    } else if (body.previousHour || (!hourStart && !hourEnd)) {
      const range = previousHourRange();
      hourStart = range.hourStart;
      hourEnd = range.hourEnd;
    }

    if (!hourStart || !hourEnd) {
      return NextResponse.json(
        { error: "hourStart and hourEnd required" },
        { status: 400 },
      );
    }

    const limits = limitsForWindow(hourStart, hourEnd);

    const result = await extractWindow(hourStart, hourEnd, {
      customPrompt: body.prompt,
      limits,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Extraction failed" },
      { status: 500 },
    );
  }
}
