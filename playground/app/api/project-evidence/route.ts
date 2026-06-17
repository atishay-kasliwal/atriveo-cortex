import { apiError, apiSuccess } from "@/lib/api/response";
import { toEvidenceTraceDTO } from "@/lib/api/dtos";
import { getProjectEvidence } from "@/lib/evidence-trace";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) {
      return apiError("id is required", 400);
    }

    const report = await getProjectEvidence(id);
    if (!report) {
      return apiError("Project not found", 404);
    }
    return apiSuccess(toEvidenceTraceDTO(report));
  } catch (e) {
    return apiError(
      e instanceof Error ? e.message : "Failed to load project evidence",
      500,
    );
  }
}
