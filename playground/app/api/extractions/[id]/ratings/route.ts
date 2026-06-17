import { NextResponse } from "next/server";
import { getExtraction, saveRatings } from "@/lib/memory-db";
import { parseStoredRatings } from "@/lib/stored-extraction";
import type { ExtractionRatings, RatingValue } from "@/lib/types";

export const runtime = "nodejs";

const VALID: RatingValue[] = ["good", "okay", "bad"];

function parseRating(v: unknown): RatingValue | null {
  return typeof v === "string" && VALID.includes(v as RatingValue)
    ? (v as RatingValue)
    : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const existing = await getExtraction(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await request.json()) as Partial<ExtractionRatings>;
    const current = parseStoredRatings(existing.ratings);
    const ratings: ExtractionRatings = {
      projects: parseRating(body.projects) ?? current.projects,
      actions: parseRating(body.actions) ?? current.actions,
      ideas: parseRating(body.ideas) ?? current.ideas,
    };
    await saveRatings(id, ratings);
    return NextResponse.json({ id, ratings });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save ratings" },
      { status: 500 },
    );
  }
}
