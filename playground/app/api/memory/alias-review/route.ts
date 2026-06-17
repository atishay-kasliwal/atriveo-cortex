import { NextResponse } from "next/server";
import { setAliasReview } from "@/lib/memory-db";
import type { AliasReviewStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      observed_name?: string;
      canonical_project?: string;
      status?: AliasReviewStatus;
    };

    const observed = body.observed_name?.trim();
    const canonical = body.canonical_project?.trim();
    const status = body.status;

    if (!observed || !canonical) {
      return NextResponse.json(
        { error: "observed_name and canonical_project are required" },
        { status: 400 },
      );
    }
    if (status !== "approved" && status !== "rejected") {
      return NextResponse.json(
        { error: "status must be approved or rejected" },
        { status: 400 },
      );
    }

    await setAliasReview(observed, canonical, status);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update alias review" },
      { status: 500 },
    );
  }
}
