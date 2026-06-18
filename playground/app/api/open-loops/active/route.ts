import { parsePagination } from "@/lib/api/pagination";
import { apiError, apiSuccess } from "@/lib/api/response";
import { toOpenLoopsListDTO } from "@/lib/api/dtos";
import { buildActiveOpenLoops } from "@/lib/open-loop-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { page, limit } = parsePagination(new URL(request.url).searchParams);
    const report = await buildActiveOpenLoops();
    return apiSuccess(toOpenLoopsListDTO(report, page, limit));
  } catch (e) {
    return apiError(
      e instanceof Error ? e.message : "Failed to load active open loops",
      500,
    );
  }
}
