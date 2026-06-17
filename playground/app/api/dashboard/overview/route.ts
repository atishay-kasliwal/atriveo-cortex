import { apiError, apiSuccess } from "@/lib/api/response";
import { getDashboardOverview } from "@/lib/api/dashboard";

export const runtime = "nodejs";

export async function GET() {
  try {
    return apiSuccess(await getDashboardOverview());
  } catch (e) {
    return apiError(
      e instanceof Error ? e.message : "Failed to load dashboard overview",
      500,
    );
  }
}
