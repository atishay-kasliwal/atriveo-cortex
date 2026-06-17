import { parsePagination } from "@/lib/api/pagination";
import { apiError, apiSuccess } from "@/lib/api/response";
import { toActionsListDTO } from "@/lib/api/dtos";
import { listActionsReport } from "@/lib/action-idea-memory";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const { page, limit } = parsePagination(searchParams);
    const fetchLimit = Math.min(100, page * limit);
    const report = await listActionsReport(fetchLimit);
    return apiSuccess(toActionsListDTO(report, page, limit));
  } catch (e) {
    return apiError(
      e instanceof Error ? e.message : "Failed to load actions",
      500,
    );
  }
}
