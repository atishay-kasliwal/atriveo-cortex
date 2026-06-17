import { apiError, apiSuccess } from "@/lib/api/response";
import { toActionDetailDTO } from "@/lib/api/dtos";
import { getActionDetail } from "@/lib/action-idea-memory";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isFinite(id) || id <= 0) {
      return apiError("id is required", 400);
    }

    const detail = await getActionDetail(id);
    if (!detail) {
      return apiError("Action not found", 404);
    }
    return apiSuccess(toActionDetailDTO(detail));
  } catch (e) {
    return apiError(
      e instanceof Error ? e.message : "Failed to load action",
      500,
    );
  }
}
