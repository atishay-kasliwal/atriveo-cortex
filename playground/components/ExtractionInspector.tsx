"use client";

import { RatingPanel } from "@/components/RatingPanel";
import type {
  EvidenceStats,
  ExtractionMetadata,
  ExtractionRatings,
  ExtractionResult,
  ExtractionSchema,
  RawEvidence,
} from "@/lib/types";

type Props = {
  evidence: RawEvidence | null;
  timeline: string;
  evidenceStats: EvidenceStats | null;
  prompt: string;
  onPromptChange: (value: string) => void;
  onRegenerate: () => void;
  result: ExtractionResult | null;
  ratings: ExtractionRatings;
  onRatingsChange: (ratings: ExtractionRatings) => void;
  savingRatings: boolean;
  running: boolean;
  error: string | null;
  windowHours: number;
};

export function ExtractionInspector({
  evidence,
  timeline,
  evidenceStats,
  prompt,
  onPromptChange,
  onRegenerate,
  result,
  ratings,
  onRatingsChange,
  savingRatings,
  running,
  error,
  windowHours,
}: Props) {
  const metadata: ExtractionMetadata | null = result?.metadata ?? null;
  const parsed: ExtractionSchema | null = result?.parsedJson ?? null;

  const compressionRatio =
    evidenceStats && evidenceStats.charsBeforeCompression > 0
      ? (
          (evidenceStats.charsAfterCompression /
            evidenceStats.charsBeforeCompression) *
          100
        ).toFixed(1)
      : null;

  return (
    <div className="inspector">
      {error && (
        <div className="inspector-error">{error}</div>
      )}

      <div className="inspector-section">
        <div className="inspector-section-header">
          Raw Evidence
          {windowHours > 1 && (
            <span className="window-badge">{windowHours}h window</span>
          )}
        </div>
        <div className="inspector-section-body">
          {!evidence ? (
            <div className="muted">Load or run an extraction.</div>
          ) : (
            <>
              <div className="muted" style={{ marginBottom: 12 }}>
                {evidence.hourStart} → {evidence.hourEnd}
                <br />
                DB totals: {evidence.counts.frames} frames,{" "}
                {evidence.counts.uiEvents} ui_events, {evidence.counts.audio}{" "}
                audio
              </div>
              {evidenceStats && (
                <>
                  <div className="label">Evidence statistics</div>
                  <pre className="pre">
                    {JSON.stringify(evidenceStats, null, 2)}
                    {compressionRatio != null &&
                      `\ncompressionRatio: ${compressionRatio}%`}
                  </pre>
                </>
              )}
              <div className="label">Weighted evidence (sent to model)</div>
              <pre className="pre">{timeline || "(empty)"}</pre>
            </>
          )}
        </div>
      </div>

      <div className="flow-arrow">↓</div>

      <div className="inspector-section">
        <div className="inspector-section-header">Prompt</div>
        <div className="inspector-section-body">
          <div className="muted" style={{ marginBottom: 8 }}>
            Editable. Regenerate sends this exact text to Ollama.
          </div>
          <textarea
            className="input inspector-textarea"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
          />
          <button
            className="btn btn-secondary"
            style={{ marginTop: 8 }}
            onClick={onRegenerate}
            disabled={running || !prompt.trim()}
          >
            {running ? "Running…" : "Regenerate with edited prompt"}
          </button>
          {metadata && (
            <>
              <div className="label" style={{ marginTop: 16 }}>
                Extraction metadata
              </div>
              <pre className="pre">{JSON.stringify(metadata, null, 2)}</pre>
            </>
          )}
        </div>
      </div>

      <div className="flow-arrow">↓</div>

      <div className="inspector-section">
        <div className="inspector-section-header">Raw Model Response</div>
        <div className="inspector-section-body">
          {!result ? (
            <div className="muted">No extraction yet.</div>
          ) : (
            <>
              <div className="muted" style={{ marginBottom: 8 }}>
                Extraction #{result.id} · {result.metrics.latencyMs} ms ·
                prompt tokens {result.metrics.promptTokens ?? "—"} · response
                tokens {result.metrics.responseTokens ?? "—"}
              </div>
              <pre className="pre">{result.rawResponse || "(empty)"}</pre>
            </>
          )}
        </div>
      </div>

      <div className="flow-arrow">↓</div>

      <div className="inspector-section">
        <div className="inspector-section-header">Parsed JSON</div>
        <div className="inspector-section-body">
          {!result ? (
            <div className="muted">No extraction yet.</div>
          ) : (
            <>
              {result.parseError && (
                <div className="error" style={{ marginBottom: 8 }}>
                  Parse error: {result.parseError}
                </div>
              )}
              <pre className="pre">
                {parsed ? JSON.stringify(parsed, null, 2) : "(null)"}
              </pre>
            </>
          )}
        </div>
      </div>

      <div className="flow-arrow">↓</div>

      <RatingPanel
        ratings={ratings}
        extractionId={result?.id}
        onChange={onRatingsChange}
        saving={savingRatings}
      />
    </div>
  );
}
