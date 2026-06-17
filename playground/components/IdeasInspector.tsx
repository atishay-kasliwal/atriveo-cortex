"use client";

import { useCallback, useEffect, useState } from "react";
import { WhyEvidenceSection } from "@/components/WhyEvidenceSection";
import { fetchApi } from "@/lib/api/client";
import type { IdeaDetailDTO, IdeaDTO, IdeasListDTO } from "@/lib/api/dtos";

function IdeaRow({
  idea,
  selected,
  onSelect,
}: {
  idea: IdeaDTO;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`memory-project-btn${selected ? " active" : ""}`}
      onClick={onSelect}
    >
      <strong>{idea.text}</strong>
      <span className="muted">
        {" "}
        · {idea.mentionCount} mention{idea.mentionCount === 1 ? "" : "s"}
      </span>
    </button>
  );
}

function IdeaList({
  title,
  items,
  selectedId,
  onSelect,
  empty,
}: {
  title: string;
  items: IdeaDTO[];
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
          {items.map((idea) => (
            <IdeaRow
              key={idea.id}
              idea={idea}
              selected={selectedId === idea.id}
              onSelect={() => onSelect(idea.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function IdeasInspector() {
  const [report, setReport] = useState<IdeasListDTO | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<IdeaDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await fetchApi<IdeasListDTO>("/api/ideas"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    setError(null);
    try {
      setDetail(await fetchApi<IdeaDetailDTO>(`/api/idea?id=${id}`));
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
        <div className="inspector-section-header">Ideas</div>
        <div className="inspector-section-body">
          {loading && !report && <div className="muted">Loading…</div>}
          {report && (
            <>
              <IdeaList
                title="Recurring Ideas"
                items={report.recurring.items}
                selectedId={selectedId}
                onSelect={setSelectedId}
                empty="No recurring ideas yet."
              />
              <IdeaList
                title="New Ideas"
                items={report.newest.items}
                selectedId={selectedId}
                onSelect={setSelectedId}
                empty="No ideas yet."
              />
              <IdeaList
                title="Idea History"
                items={report.history.items}
                selectedId={selectedId}
                onSelect={setSelectedId}
                empty="No idea history."
              />
            </>
          )}
        </div>
      </div>

      {detail && (
        <>
          <div className="flow-arrow">↓</div>
          <div className="inspector-section">
            <div className="inspector-section-header">Idea Detail</div>
            <div className="inspector-section-body">
              <div className="audit-grid">
                <div>
                  <div className="label">Text</div>
                  <div>{detail.idea.text}</div>
                </div>
                <div>
                  <div className="label">Mentions</div>
                  <div>{detail.idea.mentionCount}</div>
                </div>
                <div>
                  <div className="label">First Seen</div>
                  <div>{detail.idea.firstSeen.slice(0, 16)}</div>
                </div>
                <div>
                  <div className="label">Last Seen</div>
                  <div>{detail.idea.lastSeen.slice(0, 16)}</div>
                </div>
              </div>

              <div className="label" style={{ marginTop: 12 }}>
                Mention History
              </div>
              {detail.mentions.map((m) => (
                <div key={m.id} className="row-item">
                  <div className="muted">
                    extraction #{m.extractionId} · {m.timestamp.slice(0, 16)}
                    {m.canonicalProject && ` · ${m.canonicalProject}`}
                  </div>
                  <div>{m.observedText}</div>
                </div>
              ))}
              <WhyEvidenceSection
                title={detail.idea.text}
                apiPath="/api/idea-evidence"
                entityId={detail.idea.id}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
