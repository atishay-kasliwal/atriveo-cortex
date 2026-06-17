import { apiError, apiSuccess } from "@/lib/api/response";
import { toOpenLoopDetailDTO } from "@/lib/api/dtos";
import { getOpenLoopDetail } from "@/lib/open-loops";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isFinite(id) || id <= 0) {
      return apiError("id is required", 400);
    }

    const detail = await getOpenLoopDetail(id);
    if (!detail) {
      return apiError("Open loop not found", 404);
    }
    return apiSuccess(toOpenLoopDetailDTO(detail));
  } catch (e) {
    return apiError(
      e instanceof Error ? e.message : "Failed to load open loop",
      500,
    );
  }
}
