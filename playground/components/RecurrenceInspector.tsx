"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchApi } from "@/lib/api/client";
import type { RecurrenceDTO, RecurrenceListDTO } from "@/lib/api/dtos";

function trendClass(trend: RecurrenceDTO["trend"]): string {
  if (trend === "Rising") return "trend-rising";
  if (trend === "Dormant") return "trend-dormant";
  return "trend-stable";
}

function RecurrenceRow({ item }: { item: RecurrenceDTO }) {
  return (
    <div className="recurrence-row">
      <div>
        <strong>{item.text}</strong>
        <span className={`trend-badge ${trendClass(item.trend)}`}>
          {item.trend}
        </span>
      </div>
      <div className="muted">
        {item.mentionCount} mentions · {item.daysSeen} day
        {item.daysSeen === 1 ? "" : "s"} · avg{" "}
        {item.averageMentionsPerDay.toFixed(2)}/day
      </div>
      <div className="muted">
        first {item.firstSeen.slice(0, 16)} · last {item.lastSeen.slice(0, 16)}
      </div>
    </div>
  );
}

function RecurrenceSection({
  title,
  report,
}: {
  title: string;
  report: RecurrenceListDTO | null;
}) {
  if (!report) return null;

  return (
    <div className="inspector-section">
      <div className="inspector-section-header">{title}</div>
      <div className="inspector-section-body">
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">{report.summary.total}</div>
            <div className="metric-label">Total</div>
          </div>
          <div className="metric-card">
            <div className="metric-value trend-rising">{report.summary.rising}</div>
            <div className="metric-label">Rising</div>
          </div>
          <div className="metric-card">
            <div className="metric-value trend-stable">{report.summary.stable}</div>
            <div className="metric-label">Stable</div>
          </div>
          <div className="metric-card">
            <div className="metric-value trend-dormant">{report.summary.dormant}</div>
            <div className="metric-label">Dormant</div>
          </div>
        </div>

        <div className="entity-list-block">
          <div className="label">Most Recurring</div>
          {report.explorer.mostRecurring.items.length === 0 ? (
            <div className="muted">No recurring items yet (need 2+ mentions).</div>
          ) : (
            report.explorer.mostRecurring.items.map((item) => (
              <RecurrenceRow key={item.id} item={item} />
            ))
          )}
        </div>

        <div className="entity-list-block">
          <div className="label">New Recurring</div>
          {report.explorer.newRecurring.items.length === 0 ? (
            <div className="muted">No new recurring items in the last 7 days.</div>
          ) : (
            report.explorer.newRecurring.items.map((item) => (
              <RecurrenceRow key={item.id} item={item} />
            ))
          )}
        </div>

        <div className="entity-list-block">
          <div className="label">Dormant Recurring</div>
          {report.explorer.dormantRecurring.items.length === 0 ? (
            <div className="muted">No dormant recurring items.</div>
          ) : (
            report.explorer.dormantRecurring.items.map((item) => (
              <RecurrenceRow key={item.id} item={item} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function RecurrenceInspector() {
  const [actions, setActions] = useState<RecurrenceListDTO | null>(null);
  const [ideas, setIdeas] = useState<RecurrenceListDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [actionsData, ideasData] = await Promise.all([
        fetchApi<RecurrenceListDTO>("/api/recurrence/actions"),
        fetchApi<RecurrenceListDTO>("/api/recurrence/ideas"),
      ]);
      setActions(actionsData);
      setIdeas(ideasData);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="inspector">
      {error && <div className="inspector-error">{error}</div>}
      {loading && !actions && <div className="muted">Loading recurrence…</div>}

      <RecurrenceSection title="Action Recurrence" report={actions} />

      <div className="flow-arrow">↓</div>

      <RecurrenceSection title="Idea Recurrence" report={ideas} />
    </div>
  );
}
