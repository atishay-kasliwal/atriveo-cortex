"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchApi } from "@/lib/api/client";
import type { EvidenceTraceDTO } from "@/lib/api/dtos";

type WhyEvidenceSectionProps = {
  title: string;
  apiPath: string;
  entityId: string | number | null;
};

function windowLabel(hourStart: string, hourEnd: string): string {
  return `${hourStart.slice(0, 16)} → ${hourEnd.slice(11, 16)}`;
}

function extractionMap(report: EvidenceTraceDTO) {
  return new Map(report.extractions.map((e) => [e.id, e]));
}

export function WhyEvidenceSection({
  title,
  apiPath,
  entityId,
}: WhyEvidenceSectionProps) {
  const [open, setOpen] = useState(false);
  const [trace, setTrace] = useState<EvidenceTraceDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (entityId == null || entityId === "") return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<EvidenceTraceDTO>(
        `${apiPath}?id=${encodeURIComponent(String(entityId))}`,
      );
      setTrace(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setTrace(null);
    } finally {
      setLoading(false);
    }
  }, [apiPath, entityId]);

  useEffect(() => {
    setOpen(false);
    setTrace(null);
    setError(null);
  }, [entityId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  if (entityId == null || entityId === "") return null;

  const extractions = trace ? extractionMap(trace) : new Map();

  return (
    <div className="why-section">
      <button
        type="button"
        className="why-btn"
        onClick={() => setOpen((v) => !v)}
      >
        Why? — {title}
      </button>

      {open && (
        <div className="why-panel">
          {loading && <div className="muted">Loading evidence…</div>}
          {error && <div className="inspector-error">{error}</div>}
          {trace && (
            <>
              <div className="label">Timeline</div>
              {trace.timeline.length === 0 ? (
                <div className="muted">No timeline entries.</div>
              ) : (
                <div className="why-timeline">
                  {trace.timeline.map((entry, i) => (
                    <div
                      key={`${entry.extractionId}-${i}`}
                      className="why-timeline-row"
                    >
                      <div className="why-date">{entry.dateLabel}</div>
                      <div>{entry.label}</div>
                      <div className="muted">
                        extraction #{entry.extractionId}
                        {entry.confidence != null &&
                          ` · confidence ${entry.confidence}`}
                        {entry.note && ` · ${entry.note}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="label" style={{ marginTop: 12 }}>
                Evidence
              </div>
              {trace.mentions.length === 0 ? (
                <div className="muted">No linked extractions.</div>
              ) : (
                trace.mentions.map((mention) => {
                  const extraction = extractions.get(mention.extractionId);
                  return (
                    <div key={mention.extractionId} className="why-evidence-card">
                      <div className="why-evidence-header">
                        <strong>{mention.timestamp.slice(0, 16)}</strong>
                        <span className="muted">
                          {" "}
                          · Extraction #{mention.extractionId}
                        </span>
                      </div>
                      {extraction && (
                        <div className="muted">
                          Window:{" "}
                          {windowLabel(extraction.hourStart, extraction.hourEnd)}
                        </div>
                      )}
                      {mention.observedText && (
                        <div>
                          <span className="label">Mention: </span>
                          {mention.observedText}
                        </div>
                      )}
                      {mention.confidence != null && (
                        <div>
                          <span className="label">Confidence: </span>
                          {mention.confidence}
                        </div>
                      )}
                      {extraction?.timeline && (
                        <details className="why-evidence-details">
                          <summary>Original evidence excerpt</summary>
                          <pre className="pre why-evidence-pre">
                            {extraction.timeline.slice(0, 1200)}
                            {extraction.timeline.length > 1200 ? "\n…" : ""}
                          </pre>
                        </details>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
