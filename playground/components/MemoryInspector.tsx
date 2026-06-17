"use client";

import { useCallback, useEffect, useState } from "react";
import { WhyEvidenceSection } from "@/components/WhyEvidenceSection";
import type {
  AliasReviewItem,
  MemoryAuditReport,
  MergeConfidence,
  ProjectAuditRow,
} from "@/lib/types";

function confidenceClass(tier: MergeConfidence): string {
  if (tier === "HIGH") return "conf-high";
  if (tier === "MEDIUM") return "conf-medium";
  return "conf-low";
}

function reasonLabel(reason: AliasReviewItem["reasons"][number]): string {
  if (reason === "low_confidence") return "low confidence";
  if (reason === "single_observation") return "single observation";
  return "conflicting";
}

export function MemoryInspector() {
  const [report, setReport] = useState<MemoryAuditReport | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/memory/audit");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load memory audit");
      const audit = data as MemoryAuditReport;
      setReport(audit);
      setSelected((prev) => {
        if (prev && audit.projects.some((p) => p.summary.canonical_project === prev)) {
          return prev;
        }
        return audit.projects[0]?.summary.canonical_project ?? "";
      });
      return audit;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const handleReview = async (
    item: AliasReviewItem,
    status: "approved" | "rejected",
  ) => {
    const key = `${item.observed_name}|${item.canonical_project}`;
    setReviewing(key);
    setError(null);
    try {
      const res = await fetch("/api/memory/alias-review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observed_name: item.observed_name,
          canonical_project: item.canonical_project,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Review failed");
      await loadAudit();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReviewing(null);
    }
  };

  const selectedProject: ProjectAuditRow | null =
    report?.projects.find((p) => p.summary.canonical_project === selected) ??
    null;

  const metrics = report?.metrics;

  return (
    <div className="inspector">
      {error && <div className="inspector-error">{error}</div>}

      <div className="inspector-section">
        <div className="inspector-section-header">Memory Quality Metrics</div>
        <div className="inspector-section-body">
          {loading && !metrics && <div className="muted">Loading…</div>}
          {metrics && (
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-value">{metrics.projects_detected}</div>
                <div className="metric-label">Projects Detected</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{metrics.aliases_merged}</div>
                <div className="metric-label">Aliases Merged</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">
                  {(metrics.average_confidence * 100).toFixed(0)}%
                </div>
                <div className="metric-label">Average Confidence</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{metrics.projects_with_actions}</div>
                <div className="metric-label">Projects With Actions</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{metrics.projects_with_ideas}</div>
                <div className="metric-label">Projects With Ideas</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flow-arrow">↓</div>

      <div className="inspector-section">
        <div className="inspector-section-header">Alias Review Queue</div>
        <div className="inspector-section-body">
          {!report?.review_queue.length ? (
            <div className="muted">No aliases need review.</div>
          ) : (
            report.review_queue.map((item) => {
              const key = `${item.observed_name}|${item.canonical_project}`;
              const busy = reviewing === key;
              return (
                <div key={key} className="review-item">
                  <div>
                    <strong>{item.observed_name}</strong>
                    <span className="muted"> → {item.canonical_project}</span>
                  </div>
                  <div className="muted">
                    <span className={confidenceClass(item.merge_confidence)}>
                      {item.merge_confidence}
                    </span>
                    {" · "}
                    {item.observation_count} observation
                    {item.observation_count === 1 ? "" : "s"}
                    {" · "}
                    {item.reasons.map(reasonLabel).join(", ")}
                  </div>
                  <div className="review-actions">
                    <button
                      type="button"
                      className="review-btn review-approve"
                      disabled={busy}
                      onClick={() => handleReview(item, "approved")}
                    >
                      Approve Merge
                    </button>
                    <button
                      type="button"
                      className="review-btn review-reject"
                      disabled={busy}
                      onClick={() => handleReview(item, "rejected")}
                    >
                      Reject Merge
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flow-arrow">↓</div>

      <div className="inspector-section">
        <div className="inspector-section-header">Memory Audit</div>
        <div className="inspector-section-body">
          {!report?.projects.length ? (
            <div className="muted">No projects yet. Run an extraction first.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {report.projects.map((p) => (
                <button
                  key={p.summary.canonical_project}
                  type="button"
                  className={`memory-project-btn${selected === p.summary.canonical_project ? " active" : ""}`}
                  onClick={() => setSelected(p.summary.canonical_project)}
                >
                  <strong>{p.summary.canonical_project}</strong>
                  <span className="muted">
                    {" "}
                    · {p.summary.extraction_count} extractions ·{" "}
                    {p.aliases.length} alias{p.aliases.length === 1 ? "" : "es"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedProject && (
        <>
          <div className="flow-arrow">↓</div>

          <div className="inspector-section">
            <div className="inspector-section-header">Project Audit</div>
            <div className="inspector-section-body">
              <div className="audit-grid">
                <div>
                  <div className="label">Canonical Project</div>
                  <div>{selectedProject.summary.canonical_project}</div>
                </div>
                <div>
                  <div className="label">Extraction Count</div>
                  <div>{selectedProject.summary.extraction_count}</div>
                </div>
                <div>
                  <div className="label">First Seen</div>
                  <div>{selectedProject.summary.first_seen.slice(0, 16)}</div>
                </div>
                <div>
                  <div className="label">Last Seen</div>
                  <div>{selectedProject.summary.last_seen.slice(0, 16)}</div>
                </div>
              </div>

              <div className="label" style={{ marginTop: 12 }}>
                Aliases Observed
              </div>
              {selectedProject.aliases.length === 0 ? (
                <div className="muted">(canonical name only)</div>
              ) : (
                <div className="alias-merge-list">
                  <div className="alias-canonical">
                    {selectedProject.summary.canonical_project}
                  </div>
                  {selectedProject.aliases.map((alias) => (
                    <div key={alias.observed_name} className="alias-merge-row">
                      <span className="alias-arrow">←</span>
                      <span>{alias.observed_name}</span>
                      <span
                        className={`alias-conf ${confidenceClass(alias.merge_confidence)}`}
                      >
                        ({alias.merge_confidence})
                      </span>
                      {alias.review_status && (
                        <span className="muted"> · {alias.review_status}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <WhyEvidenceSection
                title={selectedProject.summary.canonical_project}
                apiPath="/api/project-evidence"
                entityId={selectedProject.summary.canonical_project}
              />
            </div>
          </div>

          <div className="flow-arrow">↓</div>

          <div className="inspector-section">
            <div className="inspector-section-header">Project Growth Timeline</div>
            <div className="inspector-section-body">
              {selectedProject.growth_timeline.length === 0 ? (
                <div className="muted">(no history)</div>
              ) : (
                <div className="growth-timeline">
                  {selectedProject.growth_timeline.map((event, i) => (
                    <div key={`${event.extraction_id}-${i}`} className="growth-event">
                      <div className="growth-step">
                        <span className="growth-label">Hour</span>
                        <span>{event.hour_label}</span>
                      </div>
                      <div className="growth-arrow">↓</div>
                      <div className="growth-step">
                        <span className="growth-label">Extraction</span>
                        <span>#{event.extraction_id}</span>
                      </div>
                      <div className="growth-arrow">↓</div>
                      <div className="growth-step">
                        <span className="growth-label">Observed Name</span>
                        <span>{event.observed_name}</span>
                      </div>
                      <div className="growth-arrow">↓</div>
                      <div className="growth-step">
                        <span className="growth-label">Canonical Name</span>
                        <span>{event.canonical_project}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flow-arrow">↓</div>

          <div className="inspector-section">
            <div className="inspector-section-header">Associated Actions</div>
            <div className="inspector-section-body">
              {!selectedProject.actions.length ? (
                <div className="muted">(none)</div>
              ) : (
                selectedProject.actions.map((a, i) => (
                  <div key={`${a.extraction_id}-${i}`} className="row-item">
                    <div className="muted">
                      extraction #{a.extraction_id} · {a.timestamp.slice(0, 16)}
                    </div>
                    <div>{a.text}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flow-arrow">↓</div>

          <div className="inspector-section">
            <div className="inspector-section-header">Associated Ideas</div>
            <div className="inspector-section-body">
              {!selectedProject.ideas.length ? (
                <div className="muted">(none)</div>
              ) : (
                selectedProject.ideas.map((idea, i) => (
                  <div key={`${idea.extraction_id}-${i}`} className="row-item">
                    <div className="muted">
                      extraction #{idea.extraction_id} ·{" "}
                      {idea.timestamp.slice(0, 16)}
                    </div>
                    <div>{idea.text}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
