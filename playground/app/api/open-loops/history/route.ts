import { parsePagination } from "@/lib/api/pagination";
import { apiError, apiSuccess } from "@/lib/api/response";
import { toOpenLoopsListDTO } from "@/lib/api/dtos";
import { buildOpenLoopHistory } from "@/lib/open-loop-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { page, limit } = parsePagination(new URL(request.url).searchParams);
    const report = await buildOpenLoopHistory();
    return apiSuccess(toOpenLoopsListDTO(report, page, limit));
  } catch (e) {
    return apiError(
      e instanceof Error ? e.message : "Failed to load open loop history",
      500,
    );
  }
}
