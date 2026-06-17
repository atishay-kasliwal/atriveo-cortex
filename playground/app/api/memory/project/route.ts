import { NextResponse } from "next/server";
import { getProjectTimeline } from "@/lib/project-memory";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  if (!name?.trim()) {
    return NextResponse.json(
      { error: "name query parameter required" },
      { status: 400 },
    );
  }

  try {
    const timeline = await getProjectTimeline(name.trim());
    if (!timeline) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(timeline);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load project" },
      { status: 500 },
    );
  }
}
