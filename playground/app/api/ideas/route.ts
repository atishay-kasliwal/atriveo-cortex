import { parsePagination } from "@/lib/api/pagination";
import { apiError, apiSuccess } from "@/lib/api/response";
import { toIdeasListDTO } from "@/lib/api/dtos";
import { listIdeasReport } from "@/lib/action-idea-memory";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const { page, limit } = parsePagination(searchParams);
    const fetchLimit = Math.min(100, page * limit);
    const report = await listIdeasReport(fetchLimit);
    return apiSuccess(toIdeasListDTO(report, page, limit));
  } catch (e) {
    return apiError(
      e instanceof Error ? e.message : "Failed to load ideas",
      500,
    );
  }
}
