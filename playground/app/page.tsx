"use client";

import { useCallback, useEffect, useState } from "react";
import { ExtractionInspector } from "@/components/ExtractionInspector";
import { ActionsInspector } from "@/components/ActionsInspector";
import { IdeasInspector } from "@/components/IdeasInspector";
import { MemoryInspector } from "@/components/MemoryInspector";
import { RecurrenceInspector } from "@/components/RecurrenceInspector";
import { OpenLoopsInspector } from "@/components/OpenLoopsInspector";
import { buildExtractionPrompt } from "@/lib/prompt";
import {
  parseStoredMetadata,
  parseStoredRatings,
  parseStoredExtractionSchema,
} from "@/lib/stored-extraction";
import type {
  EvidenceStats,
  ExtractionRatings,
  ExtractionResult,
  RawEvidence,
  StoredExtraction,
} from "@/lib/types";

const EMPTY_RATINGS: ExtractionRatings = {
  projects: null,
  actions: null,
  ideas: null,
};

export default function InspectorPage() {
  const [hourStart, setHourStart] = useState("");
  const [hourEnd, setHourEnd] = useState("");
  const [windowHours, setWindowHours] = useState(1);
  const [evidence, setEvidence] = useState<RawEvidence | null>(null);
  const [timeline, setTimeline] = useState("");
  const [evidenceStats, setEvidenceStats] = useState<EvidenceStats | null>(
    null,
  );
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [ratings, setRatings] = useState<ExtractionRatings>(EMPTY_RATINGS);
  const [history, setHistory] = useState<StoredExtraction[]>([]);
  const [running, setRunning] = useState(false);
  const [savingRatings, setSavingRatings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<
    "extract" | "memory" | "actions" | "ideas" | "recurrence" | "open-loops"
  >("extract");

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/extractions");
    const data = await res.json();
    if (data.extractions) setHistory(data.extractions);
  }, []);

  const loadEvidence = useCallback(
    async (opts?: {
      start?: string;
      end?: string;
      lastFourHours?: boolean;
    }) => {
      const qs = new URLSearchParams();
      if (opts?.lastFourHours) {
        qs.set("lastFourHours", "true");
      } else if (opts?.start && opts?.end) {
        qs.set("hourStart", opts.start);
        qs.set("hourEnd", opts.end);
      }
      const res = await fetch(`/api/evidence?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load evidence");
      setEvidence(data.evidence);
      setTimeline(data.timeline);
      setEvidenceStats(data.evidenceStats ?? null);
      setHourStart(data.hourStart);
      setHourEnd(data.hourEnd);
      setWindowHours(data.windowHours ?? 1);
      setPrompt(
        buildExtractionPrompt(data.timeline, data.hourStart, data.hourEnd),
      );
      return data;
    },
    [],
  );

  useEffect(() => {
    loadEvidence().catch((e) => setError(String(e)));
    loadHistory();
  }, [loadEvidence, loadHistory]);

  async function runExtraction(opts: {
    previousHour?: boolean;
    lastFourHours?: boolean;
    customPrompt?: string;
  }) {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hourStart: opts.previousHour || opts.lastFourHours ? undefined : hourStart,
          hourEnd: opts.previousHour || opts.lastFourHours ? undefined : hourEnd,
          previousHour: opts.previousHour ?? false,
          lastFourHours: opts.lastFourHours ?? false,
          prompt: opts.customPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Extraction failed");
      setResult(data);
      setEvidence(data.evidence);
      setTimeline(data.timeline);
      setEvidenceStats(data.evidenceStats ?? null);
      setHourStart(data.hourStart);
      setHourEnd(data.hourEnd);
      setWindowHours(
        opts.lastFourHours
          ? 4
          : opts.previousHour
            ? 1
            : (new Date(data.hourEnd).getTime() -
                new Date(data.hourStart).getTime()) /
                3_600_000 >=
              3.5
              ? 4
              : 1,
      );
      setPrompt(data.prompt);
      setRatings(data.ratings ?? EMPTY_RATINGS);
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  async function onRegenerate() {
    if (!hourStart || !hourEnd) return;
    await runExtraction({ customPrompt: prompt });
  }

  async function saveRatings(next: ExtractionRatings) {
    setRatings(next);
    if (!result?.id) return;
    setSavingRatings(true);
    try {
      const res = await fetch(`/api/extractions/${result.id}/ratings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save ratings");
      }
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingRatings(false);
    }
  }

  function loadFromHistory(id: number) {
    const row = history.find((h) => h.id === id);
    if (!row) return;

    const start = new Date(row.hour_start).getTime();
    const end = new Date(row.hour_end).getTime();
    const hours = (end - start) / 3_600_000;

    setHourStart(row.hour_start);
    setHourEnd(row.hour_end);
    setWindowHours(hours >= 3.5 ? 4 : 1);
    setTimeline(row.timeline ?? "");
    setPrompt(row.prompt);
    setRatings(parseStoredRatings(row.ratings));
    setResult({
      id: row.id,
      timestamp: row.timestamp,
      hourStart: row.hour_start,
      hourEnd: row.hour_end,
      evidence: evidence ?? {
        hourStart: row.hour_start,
        hourEnd: row.hour_end,
        frames: [],
        uiEvents: [],
        audio: [],
        counts: { frames: 0, uiEvents: 0, audio: 0 },
      },
      timeline: row.timeline ?? "",
      evidenceStats: {
        framesAnalyzed: 0,
        uiEventsAnalyzed: 0,
        transcriptionsAnalyzed: 0,
        charsBeforeCompression: 0,
        charsAfterCompression: (row.timeline ?? "").length,
      },
      prompt: row.prompt,
      rawResponse: row.response,
      parsedJson: parseStoredExtractionSchema(row.parsed_json),
      parseError: row.parsed_json ? null : "No parsed JSON stored",
      metadata: parseStoredMetadata(row.extraction_metadata) ?? {
        model: "gemma4:12b",
        promptChars: row.prompt.length,
        evidenceChars: (row.timeline ?? "").length,
        responseChars: row.response.length,
        latencyMs: row.latency_ms ?? 0,
        failureReason: null,
        jsonRecovered: false,
        retryAttempted: false,
      },
      ratings: parseStoredRatings(row.ratings),
      metrics: {
        latencyMs: row.latency_ms ?? 0,
        promptTokens: row.prompt_tokens,
        responseTokens: row.response_tokens,
        totalTokens:
          row.prompt_tokens != null && row.response_tokens != null
            ? row.prompt_tokens + row.response_tokens
            : null,
      },
    });
    loadEvidence({
      start: row.hour_start,
      end: row.hour_end,
      lastFourHours: hours >= 3.5,
    }).catch(() => undefined);
  }

  return (
    <>
      <div className="toolbar">
        <div className="tab-bar">
          <button
            type="button"
            className={`tab-btn${tab === "extract" ? " active" : ""}`}
            onClick={() => setTab("extract")}
          >
            Extract
          </button>
          <button
            type="button"
            className={`tab-btn${tab === "memory" ? " active" : ""}`}
            onClick={() => setTab("memory")}
          >
            Memory
          </button>
          <button
            type="button"
            className={`tab-btn${tab === "actions" ? " active" : ""}`}
            onClick={() => setTab("actions")}
          >
            Actions
          </button>
          <button
            type="button"
            className={`tab-btn${tab === "ideas" ? " active" : ""}`}
            onClick={() => setTab("ideas")}
          >
            Ideas
          </button>
          <button
            type="button"
            className={`tab-btn${tab === "recurrence" ? " active" : ""}`}
            onClick={() => setTab("recurrence")}
          >
            Recurrence
          </button>
          <button
            type="button"
            className={`tab-btn${tab === "open-loops" ? " active" : ""}`}
            onClick={() => setTab("open-loops")}
          >
            Open Loops
          </button>
        </div>
        {tab === "extract" && (
          <>
            <strong style={{ marginRight: 8 }}>Extraction Inspector</strong>
        <button
          className="btn"
          disabled={running}
          onClick={() => runExtraction({ previousHour: true })}
        >
          {running ? "Running…" : "Run Previous Hour (1h)"}
        </button>
        <button
          className="btn"
          disabled={running}
          onClick={() => runExtraction({ lastFourHours: true })}
        >
          {running ? "Running…" : "Run Last 4 Hours"}
        </button>
        <button
          className="btn btn-secondary"
          disabled={running}
          onClick={() =>
            loadEvidence({
              start: hourStart,
              end: hourEnd,
              lastFourHours: windowHours >= 4,
            })
          }
        >
          Reload evidence
        </button>
        <select
          className="input"
          onChange={(e) => {
            if (e.target.value) loadFromHistory(Number(e.target.value));
          }}
          defaultValue=""
        >
          <option value="" disabled>
            History…
          </option>
          {history.map((h) => {
            const hrs =
              (new Date(h.hour_end).getTime() -
                new Date(h.hour_start).getTime()) /
              3_600_000;
            const label = hrs >= 3.5 ? "4h" : "1h";
            return (
              <option key={h.id} value={h.id}>
                #{h.id} [{label}] {h.hour_start.slice(0, 16)} →{" "}
                {h.hour_end.slice(11, 16)}
              </option>
            );
          })}
        </select>
          </>
        )}
      </div>

      {tab === "extract" ? (
      <ExtractionInspector
        evidence={evidence}
        timeline={timeline}
        evidenceStats={evidenceStats}
        prompt={prompt}
        onPromptChange={setPrompt}
        onRegenerate={onRegenerate}
        result={result}
        ratings={ratings}
        onRatingsChange={saveRatings}
        savingRatings={savingRatings}
        running={running}
        error={error}
        windowHours={windowHours}
      />
      ) : tab === "memory" ? (
        <MemoryInspector />
      ) : tab === "actions" ? (
        <ActionsInspector />
      ) : tab === "ideas" ? (
        <IdeasInspector />
      ) : tab === "recurrence" ? (
        <RecurrenceInspector />
      ) : (
        <OpenLoopsInspector />
      )}
    </>
  );
}
