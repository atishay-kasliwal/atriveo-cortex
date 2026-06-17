"use client";

import { useCallback, useEffect, useState } from "react";
import { WhyEvidenceSection } from "@/components/WhyEvidenceSection";
import { fetchApi } from "@/lib/api/client";
import type {
  LoopConfidence,
  OpenLoopDetailDTO,
  OpenLoopDTO,
  OpenLoopsListDTO,
} from "@/lib/api/dtos";

function confidenceClass(confidence: LoopConfidence): string {
  if (confidence === "HIGH") return "conf-high";
  if (confidence === "MEDIUM") return "conf-medium";
  return "conf-low";
}

function LoopRow({
  loop,
  selected,
  onSelect,
}: {
  loop: OpenLoopDTO;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`memory-project-btn${selected ? " active" : ""}`}
      onClick={onSelect}
    >
      <strong>{loop.actionText}</strong>
      <span className={`trend-badge ${confidenceClass(loop.confidence)}`}>
        {loop.confidence}
      </span>
      <div className="muted">
        {loop.mentionCount} mentions · {loop.daysSeen} day
        {loop.daysSeen === 1 ? "" : "s"} · first {loop.firstSeen.slice(0, 16)}{" "}
        · last {loop.lastSeen.slice(0, 16)}
      </div>
    </button>
  );
}

function LoopSection({
  title,
  items,
  selectedId,
  onSelect,
  empty,
}: {
  title: string;
  items: OpenLoopDTO[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  empty: string;
}) {
  return (
    <div className="entity-list-block">
      <div className="label">{title}</div>
      {items.length === 0 ? (
        <div className="muted">{empty}</div>
      ) : (
        <div className="entity-list">
          {items.map((loop) => (
            <LoopRow
              key={loop.id}
              loop={loop}
              selected={selectedId === loop.id}
              onSelect={() => onSelect(loop.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OpenLoopsInspector() {
  const [report, setReport] = useState<OpenLoopsListDTO | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<OpenLoopDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await fetchApi<OpenLoopsListDTO>("/api/open-loops"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    setError(null);
    try {
      setDetail(await fetchApi<OpenLoopDetailDTO>(`/api/open-loop?id=${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDetail(null);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  return (
    <div className="inspector">
      {error && <div className="inspector-error">{error}</div>}

      <div className="inspector-section">
        <div className="inspector-section-header">What am I forgetting?</div>
        <div className="inspector-section-body">
          {loading && !report && <div className="muted">Loading open loops…</div>}
          {report && (
            <>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-value">{report.summary.total}</div>
                  <div className="metric-label">Open Loops</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value conf-high">{report.summary.high}</div>
                  <div className="metric-label">High</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value conf-medium">{report.summary.medium}</div>
                  <div className="metric-label">Medium</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value conf-low">{report.summary.low}</div>
                  <div className="metric-label">Low</div>
                </div>
              </div>

              <LoopSection
                title="High Confidence"
                items={report.high.items}
                selectedId={selectedId}
                onSelect={setSelectedId}
                empty="No high-confidence open loops."
              />
              <LoopSection
                title="Medium Confidence"
                items={report.medium.items}
                selectedId={selectedId}
                onSelect={setSelectedId}
                empty="No medium-confidence open loops."
              />
              <LoopSection
                title="Low Confidence"
                items={report.low.items}
                selectedId={selectedId}
                onSelect={setSelectedId}
                empty="No low-confidence open loops."
              />
            </>
          )}
        </div>
      </div>

      {detail && (
        <>
          <div className="flow-arrow">↓</div>
          <div className="inspector-section">
            <div className="inspector-section-header">Open Loop Detail</div>
            <div className="inspector-section-body">
              <div className="audit-grid">
                <div>
                  <div className="label">Action</div>
                  <div>{detail.loop.actionText}</div>
                </div>
                <div>
                  <div className="label">Confidence</div>
                  <div className={confidenceClass(detail.loop.confidence)}>
                    {detail.loop.confidence}
                  </div>
                </div>
                <div>
                  <div className="label">Mentions</div>
                  <div>{detail.loop.mentionCount}</div>
                </div>
                <div>
                  <div className="label">Days Seen</div>
                  <div>{detail.loop.daysSeen}</div>
                </div>
                <div>
                  <div className="label">First Seen</div>
                  <div>{detail.loop.firstSeen.slice(0, 16)}</div>
                </div>
                <div>
                  <div className="label">Last Seen</div>
                  <div>{detail.loop.lastSeen.slice(0, 16)}</div>
                </div>
              </div>

              <div className="label" style={{ marginTop: 12 }}>
                Mention History
              </div>
              {detail.mentions.map((m, i) => (
                <div key={`${m.extractionId}-${i}`} className="row-item">
                  <div className="muted">
                    extraction #{m.extractionId} · {m.timestamp.slice(0, 16)}
                    {m.canonicalProject && ` · ${m.canonicalProject}`}
                  </div>
                  <div>{m.observedText}</div>
                </div>
              ))}
              <WhyEvidenceSection
                title={detail.loop.actionText}
                apiPath="/api/open-loop-evidence"
                entityId={detail.loop.id}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
