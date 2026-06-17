import { NextResponse } from "next/server";
import { getExtraction, listExtractions } from "@/lib/memory-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      const row = getExtraction(Number(id));
      if (!row) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(row);
    }
    return NextResponse.json({ extractions: listExtractions(30) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list extractions" },
      { status: 500 },
    );
  }
}
