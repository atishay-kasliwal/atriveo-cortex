import { apiError, apiSuccess } from "@/lib/api/response";
import { toIdeaDetailDTO } from "@/lib/api/dtos";
import { getIdeaDetail } from "@/lib/action-idea-memory";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isFinite(id) || id <= 0) {
      return apiError("id is required", 400);
    }

    const detail = await getIdeaDetail(id);
    if (!detail) {
      return apiError("Idea not found", 404);
    }
    return apiSuccess(toIdeaDetailDTO(detail));
  } catch (e) {
    return apiError(
      e instanceof Error ? e.message : "Failed to load idea",
      500,
    );
  }
}
