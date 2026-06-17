"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchApi } from "@/lib/api/client";
import type { ActionDetailDTO, ActionDTO, ActionsListDTO } from "@/lib/api/dtos";
import { WhyEvidenceSection } from "@/components/WhyEvidenceSection";

function ActionRow({
  action,
  selected,
  onSelect,
}: {
  action: ActionDTO;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`memory-project-btn${selected ? " active" : ""}`}
      onClick={onSelect}
    >
      <strong>{action.text}</strong>
      <span className="muted">
        {" "}
        · {action.mentionCount} mention{action.mentionCount === 1 ? "" : "s"}
        · {action.status}
      </span>
    </button>
  );
}

function ActionList({
  title,
  items,
  selectedId,
  onSelect,
  empty,
}: {
  title: string;
  items: ActionDTO[];
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
          {items.map((action) => (
            <ActionRow
              key={action.id}
              action={action}
              selected={selectedId === action.id}
              onSelect={() => onSelect(action.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ActionsInspector() {
  const [report, setReport] = useState<ActionsListDTO | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ActionDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<ActionsListDTO>("/api/actions");
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    setError(null);
    try {
      const data = await fetchApi<ActionDetailDTO>(`/api/action?id=${id}`);
      setDetail(data);
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
        <div className="inspector-section-header">Actions</div>
        <div className="inspector-section-body">
          {loading && !report && <div className="muted">Loading…</div>}
          {report && (
            <>
              <ActionList
                title="Most Recurring"
                items={report.recurring.items}
                selectedId={selectedId}
                onSelect={setSelectedId}
                empty="No recurring actions yet."
              />
              <ActionList
                title="Newest"
                items={report.newest.items}
                selectedId={selectedId}
                onSelect={setSelectedId}
                empty="No actions yet."
              />
              <ActionList
                title="Oldest Unresolved"
                items={report.unresolved.items}
                selectedId={selectedId}
                onSelect={setSelectedId}
                empty="No open actions."
              />
            </>
          )}
        </div>
      </div>

      {detail && (
        <>
          <div className="flow-arrow">↓</div>
          <div className="inspector-section">
            <div className="inspector-section-header">Action Detail</div>
            <div className="inspector-section-body">
              <div className="audit-grid">
                <div>
                  <div className="label">Text</div>
                  <div>{detail.action.text}</div>
                </div>
                <div>
                  <div className="label">Mentions</div>
                  <div>{detail.action.mentionCount}</div>
                </div>
                <div>
                  <div className="label">First Seen</div>
                  <div>{detail.action.firstSeen.slice(0, 16)}</div>
                </div>
                <div>
                  <div className="label">Last Seen</div>
                  <div>{detail.action.lastSeen.slice(0, 16)}</div>
                </div>
                <div>
                  <div className="label">Status</div>
                  <div>{detail.action.status}</div>
                </div>
              </div>

              <div className="label" style={{ marginTop: 12 }}>
                Mention History
              </div>
              {detail.mentions.length === 0 ? (
                <div className="muted">(none)</div>
              ) : (
                detail.mentions.map((m) => (
                  <div key={m.id} className="row-item">
                    <div className="muted">
                      extraction #{m.extractionId} · {m.timestamp.slice(0, 16)}
                      {m.canonicalProject && ` · ${m.canonicalProject}`}
                    </div>
                    <div>{m.observedText}</div>
                  </div>
                ))
              )}
              <WhyEvidenceSection
                title={detail.action.text}
                apiPath="/api/action-evidence"
                entityId={detail.action.id}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
