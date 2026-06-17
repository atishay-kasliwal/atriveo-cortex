import { apiError, apiSuccess } from "@/lib/api/response";
import { toEvidenceTraceDTO } from "@/lib/api/dtos";
import { getActionEvidence } from "@/lib/evidence-trace";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isFinite(id) || id <= 0) {
      return apiError("id is required", 400);
    }

    const report = await getActionEvidence(id);
    if (!report) {
      return apiError("Action not found", 404);
    }
    return apiSuccess(toEvidenceTraceDTO(report));
  } catch (e) {
    return apiError(
      e instanceof Error ? e.message : "Failed to load action evidence",
      500,
    );
  }
}
