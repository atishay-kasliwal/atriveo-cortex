import { buildWeightedEvidence } from "./evidence-builder";
import { saveExtraction } from "./memory-db";
import {
  EVIDENCE_LIMITS,
  OLLAMA_MODEL,
  OLLAMA_URL,
  type EvidenceLimits,
} from "./paths";
import { buildExtractionPrompt } from "./prompt";
import { fetchEvidence } from "./screenpipe-db";
import type {
  ExtractionItem,
  ExtractionMetadata,
  ExtractionResult,
  ExtractionSchema,
  OllamaMetrics,
} from "./types";

type OllamaGenerateResponse = {
  response?: string;
  prompt_eval_count?: number;
  eval_count?: number;
  total_duration?: number;
};

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

export function parseExtractionJson(raw: string): {
  parsed: ExtractionSchema | null;
  error: string | null;
} {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { parsed: null, error: "No JSON object found in response" };
  }
  try {
    const obj = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
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
        commitments: Array.isArray(obj.commitments)
          ? obj.commitments
              .filter((c) => c && typeof c === "object" && "text" in c)
              .map((c) => {
                const row = c as Record<string, unknown>;
                return {
                  text: String(row.text ?? ""),
                  ...normalizeItem(row),
                };
              })
          : [],
        ideas: Array.isArray(obj.ideas)
          ? obj.ideas
              .filter((i) => i && typeof i === "object" && "text" in i)
              .map((i) => {
                const row = i as Record<string, unknown>;
                return {
                  text: String(row.text ?? ""),
                  ...normalizeItem(row),
                };
              })
          : [],
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

async function callOllama(prompt: string): Promise<{
  rawResponse: string;
  metrics: OllamaMetrics;
}> {
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9 * 60 * 1000);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        options: { temperature: 0.2, num_predict: 1536 },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Ollama error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as OllamaGenerateResponse & {
      message?: { content?: string };
    };
    const latencyMs = Date.now() - started;
    const promptTokens = data.prompt_eval_count ?? null;
    const responseTokens = data.eval_count ?? null;
    const rawResponse = (
      data.message?.content ??
      data.response ??
      ""
    ).trim();

    if (!rawResponse) {
      throw new Error("Ollama returned empty response");
    }

    return {
      rawResponse,
      metrics: {
        promptTokens,
        responseTokens,
        totalTokens:
          promptTokens != null && responseTokens != null
            ? promptTokens + responseTokens
            : null,
        latencyMs,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export type ExtractOptions = {
  customPrompt?: string;
  limits?: EvidenceLimits;
};

export async function extractWindow(
  hourStart: string,
  hourEnd: string,
  opts?: ExtractOptions,
): Promise<ExtractionResult> {
  const limits = opts?.limits ?? EVIDENCE_LIMITS;
  const evidence = fetchEvidence(hourStart, hourEnd, limits);
  const { timeline, stats } = buildWeightedEvidence(evidence);
  const prompt =
    opts?.customPrompt?.trim() ||
    buildExtractionPrompt(timeline, hourStart, hourEnd);

  const { rawResponse, metrics } = await callOllama(prompt);
  const { parsed, error } = parseExtractionJson(rawResponse);

  const metadata: ExtractionMetadata = {
    model: OLLAMA_MODEL,
    promptChars: prompt.length,
    evidenceChars: timeline.length,
    responseChars: rawResponse.length,
    latencyMs: metrics.latencyMs,
  };

  const result: ExtractionResult = {
    timestamp: new Date().toISOString(),
    hourStart,
    hourEnd,
    evidence,
    timeline,
    evidenceStats: stats,
    prompt,
    rawResponse,
    parsedJson: parsed,
    parseError: error,
    metadata,
    ratings: { projects: null, commitments: null, ideas: null },
    metrics,
  };

  result.id = saveExtraction(result);
  return result;
}

/** @deprecated use extractWindow */
export async function extractHour(
  hourStart: string,
  hourEnd: string,
  customPrompt?: string,
): Promise<ExtractionResult> {
  return extractWindow(hourStart, hourEnd, { customPrompt });
}

export async function regenerateWithPrompt(
  hourStart: string,
  hourEnd: string,
  prompt: string,
  limits?: EvidenceLimits,
): Promise<ExtractionResult> {
  return extractWindow(hourStart, hourEnd, { customPrompt: prompt, limits });
}
