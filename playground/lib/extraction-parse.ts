import type { ExtractionItem, ExtractionSchema, FailureReason } from "./types";

function normalizeItem(item: unknown): ExtractionItem {
  if (!item || typeof item !== "object") return {};
  const row = item as Record<string, unknown>;
  return {
    confidence: typeof row.confidence === "number" ? row.confidence : undefined,
    evidence: Array.isArray(row.evidence)
      ? row.evidence.filter((e): e is string => typeof e === "string")
      : [],
  };
}

function stripMarkdownFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
  if (fenced) return fenced[1].trim();
  return trimmed.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
}

function parseTextItems(
  items: unknown,
): Array<ExtractionItem & { text: string }> {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item === "object" && "text" in item)
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        text: String(row.text ?? ""),
        ...normalizeItem(row),
      };
    });
}

export function classifyFailure(
  raw: string,
  parseError: string | null,
  doneReason: string | null,
): FailureReason {
  if (doneReason === "length") return "truncated";
  if (!raw.trim()) return "empty_response";
  if (!parseError) return null;
  if (parseError.includes("No JSON") && raw.includes("{")) return "truncated";
  if (raw.includes("{") && !raw.trimEnd().endsWith("}")) return "truncated";
  return "invalid_json";
}

export function parseExtractionJson(raw: string): {
  parsed: ExtractionSchema | null;
  error: string | null;
} {
  const cleaned = stripMarkdownFences(raw);
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { parsed: null, error: "No JSON object found in response" };
  }
  try {
    const obj = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const actionsSource = Array.isArray(obj.actions)
      ? obj.actions
      : obj.commitments;

    return {
      parsed: {
        projects: Array.isArray(obj.projects)
          ? obj.projects
              .filter((p) => p && typeof p === "object" && "name" in p)
              .map((p) => {
                const row = p as Record<string, unknown>;
                return {
                  name: String(row.name ?? ""),
                  ...normalizeItem(row),
                };
              })
          : [],
        actions: parseTextItems(actionsSource),
        ideas: parseTextItems(obj.ideas),
      },
      error: null,
    };
  } catch (e) {
    return {
      parsed: null,
      error: e instanceof Error ? e.message : "JSON parse failed",
    };
  }
}
