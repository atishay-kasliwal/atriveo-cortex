import { parsePagination } from "@/lib/api/pagination";
import { apiError, apiSuccess } from "@/lib/api/response";
import { toOpenLoopsListDTO } from "@/lib/api/dtos";
import { buildProjectOpenLoops } from "@/lib/open-loop-api";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ project: string }> },
) {
  try {
    const { project } = await context.params;
    if (!project?.trim()) {
      return apiError("project is required", 400);
    }
    const { page, limit } = parsePagination(new URL(request.url).searchParams);
    const report = await buildProjectOpenLoops(project);
    return apiSuccess(toOpenLoopsListDTO(report, page, limit));
  } catch (e) {
    return apiError(
      e instanceof Error ? e.message : "Failed to load project open loops",
      500,
    );
  }
}
