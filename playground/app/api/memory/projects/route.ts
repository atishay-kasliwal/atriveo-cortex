import { paginateArray, parsePagination } from "@/lib/api/pagination";
import { apiError, apiSuccess } from "@/lib/api/response";
import { toProjectDTO } from "@/lib/api/dtos";
import { listProjectSummaries } from "@/lib/project-memory";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { page, limit } = parsePagination(new URL(request.url).searchParams);
    const projects = (await listProjectSummaries()).map(toProjectDTO);
    return apiSuccess(paginateArray(projects, page, limit));
  } catch (e) {
    return apiError(
      e instanceof Error ? e.message : "Failed to load projects",
      500,
    );
  }
}
