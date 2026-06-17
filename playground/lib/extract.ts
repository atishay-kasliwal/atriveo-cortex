import { buildWeightedEvidence } from "./evidence-builder";
import {
  classifyFailure,
  parseExtractionJson,
} from "./extraction-parse";
import { saveExtraction } from "./memory-db";
import { linkExtractionActionsAndIdeas } from "./action-idea-memory";
import { syncOpenLoops } from "./open-loops";
import { syncEvidenceTrace } from "./evidence-trace";
import { linkExtractionProjects } from "./project-memory";
import { normalizeExtractionProjects } from "./project-normalize";
import {
  EVIDENCE_LIMITS,
  OLLAMA_MODEL,
  OLLAMA_NUM_PREDICT,
  OLLAMA_TIMEOUT_MS,
  OLLAMA_URL,
  type EvidenceLimits,
} from "./paths";
import { buildExtractionPrompt, buildJsonRecoveryPrompt } from "./prompt";
import { fetchEvidence } from "./screenpipe-db";
import type {
  ExtractionMetadata,
  ExtractionResult,
  FailureReason,
  OllamaMetrics,
} from "./types";

type OllamaGenerateResponse = {
  response?: string;
  prompt_eval_count?: number;
  eval_count?: number;
  total_duration?: number;
  done_reason?: string;
};

type OllamaCallResult = {
  rawResponse: string;
  metrics: OllamaMetrics;
  doneReason: string | null;
};

async function callOllama(
  prompt: string,
  numPredict = OLLAMA_NUM_PREDICT,
): Promise<OllamaCallResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        options: { temperature: 0.2, num_predict: numPredict },
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
      const err = new Error("Ollama returned empty response");
      (err as Error & { failureReason: FailureReason }).failureReason =
        "empty_response";
      throw err;
    }

    return {
      rawResponse,
      doneReason: data.done_reason ?? null,
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
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      const err = new Error("Ollama request timed out");
      (err as Error & { failureReason: FailureReason }).failureReason =
        "timeout";
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

function mergeMetrics(a: OllamaMetrics, b: OllamaMetrics): OllamaMetrics {
  return {
    latencyMs: a.latencyMs + b.latencyMs,
    promptTokens:
      a.promptTokens != null && b.promptTokens != null
        ? a.promptTokens + b.promptTokens
        : a.promptTokens ?? b.promptTokens,
    responseTokens:
      a.responseTokens != null && b.responseTokens != null
        ? a.responseTokens + b.responseTokens
        : a.responseTokens ?? b.responseTokens,
    totalTokens:
      a.totalTokens != null && b.totalTokens != null
        ? a.totalTokens + b.totalTokens
        : a.totalTokens ?? b.totalTokens,
  };
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

  let failureReason: FailureReason = null;
  let jsonRecovered = false;
  let retryAttempted = false;
  let rawResponse = "";
  let doneReason: string | null = null;
  let metrics: OllamaMetrics = {
    promptTokens: null,
    responseTokens: null,
    totalTokens: null,
    latencyMs: 0,
  };

  try {
    const first = await callOllama(prompt);
    rawResponse = first.rawResponse;
    doneReason = first.doneReason;
    metrics = first.metrics;
  } catch (e) {
    const err = e as Error & { failureReason?: FailureReason };
    failureReason =
      err.failureReason ??
      (err.message.includes("empty") ? "empty_response" : null);
    if (failureReason === "timeout" || failureReason === "empty_response") {
      const metadata: ExtractionMetadata = {
        model: OLLAMA_MODEL,
        promptChars: prompt.length,
        evidenceChars: timeline.length,
        responseChars: 0,
        latencyMs: metrics.latencyMs,
        failureReason,
        jsonRecovered: false,
        retryAttempted: false,
      };
      const result: ExtractionResult = {
        timestamp: new Date().toISOString(),
        hourStart,
        hourEnd,
        evidence,
        timeline,
        evidenceStats: stats,
        prompt,
        rawResponse: "",
        parsedJson: null,
        parseError: err.message,
        metadata,
        ratings: { projects: null, actions: null, ideas: null },
        metrics,
      };
      result.id = await saveExtraction(result);
      return result;
    }
    throw e;
  }

  let { parsed, error } = parseExtractionJson(rawResponse);
  let observedProjects: Array<{ name: string; confidence?: number }> = [];

  if (parsed) {
    observedProjects = parsed.projects
      .filter((p) => p.name.trim())
      .map((p) => ({ name: p.name, confidence: p.confidence }));
    parsed = await normalizeExtractionProjects(parsed);
  }

  if (!parsed) {
    retryAttempted = true;
    try {
      const recovery = await callOllama(buildJsonRecoveryPrompt(rawResponse));
      metrics = mergeMetrics(metrics, recovery.metrics);
      const retryParse = parseExtractionJson(recovery.rawResponse);
      if (retryParse.parsed) {
        jsonRecovered = true;
        rawResponse = recovery.rawResponse;
        doneReason = recovery.doneReason;
        observedProjects = retryParse.parsed.projects
          .filter((p) => p.name.trim())
          .map((p) => ({ name: p.name, confidence: p.confidence }));
        parsed = await normalizeExtractionProjects(retryParse.parsed);
        error = null;
      } else {
        error = retryParse.error ?? error;
        doneReason = recovery.doneReason ?? doneReason;
      }
    } catch (e) {
      const err = e as Error & { failureReason?: FailureReason };
      if (!failureReason) {
        failureReason = err.failureReason ?? null;
      }
    }
  }

  if (!failureReason) {
    failureReason = classifyFailure(rawResponse, error, doneReason);
  }

  const metadata: ExtractionMetadata = {
    model: OLLAMA_MODEL,
    promptChars: prompt.length,
    evidenceChars: timeline.length,
    responseChars: rawResponse.length,
    latencyMs: metrics.latencyMs,
    failureReason: parsed ? null : failureReason,
    jsonRecovered,
    retryAttempted,
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
    ratings: { projects: null, actions: null, ideas: null },
    metrics,
  };

  result.id = await saveExtraction(result);
  if (result.id && observedProjects.length > 0) {
    await linkExtractionProjects(result.id, result.timestamp, observedProjects);
  }
  if (result.id && parsed) {
    await linkExtractionActionsAndIdeas(result.id, result.timestamp, parsed);
    await syncOpenLoops();
    await syncEvidenceTrace();
  }
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

export { parseExtractionJson, classifyFailure } from "./extraction-parse";
