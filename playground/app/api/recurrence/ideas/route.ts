import { parsePagination } from "@/lib/api/pagination";
import { apiError, apiSuccess } from "@/lib/api/response";
import { toRecurrenceListDTO } from "@/lib/api/dtos";
import { getIdeaRecurrenceReport } from "@/lib/recurrence";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const { page, limit } = parsePagination(searchParams);
    const fetchLimit = Math.min(100, page * limit);
    const report = await getIdeaRecurrenceReport(fetchLimit);
    return apiSuccess(toRecurrenceListDTO(report, page, limit));
  } catch (e) {
    return apiError(
      e instanceof Error ? e.message : "Failed to load idea recurrence",
      500,
    );
  }
}
