import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckSquare, Circle, Repeat, Sparkles } from "lucide-react";
import { PageBody, PageHeader } from "@/components/dashboard/page-shell";
import { EmptyState, ErrorState, LoadingRows } from "@/components/dashboard/states";
import { actionsQuery } from "@/lib/api/queries";
import type { ActionBucket } from "@/lib/api/client";

export const Route = createFileRoute("/actions")({
  head: () => ({
    meta: [
      { title: "Actions · Atriveo Cortex" },
      { name: "description", content: "Actions Cortex extracted from your activity." },
    ],
  }),
  component: ActionsPage,
});

const tabs: {
  key: ActionBucket;
  label: string;
  icon: typeof Circle;
  color: string;
}[] = [
  { key: "unresolved", label: "Unresolved", icon: Circle, color: "var(--color-chart-1)" },
  { key: "recurring", label: "Recurring", icon: Repeat, color: "var(--color-brand)" },
  { key: "newest", label: "Newest", icon: Sparkles, color: "var(--color-warning)" },
];

function ActionsPage() {
  const [tab, setTab] = useState<ActionBucket>("unresolved");
  const q = useQuery(actionsQuery(tab));

  return (
    <PageBody>
      <PageHeader
        eyebrow="Action Center"
        title="Actions"
        description="Cortex extracts actionable items from your sessions. Open one to see why it was surfaced."
      />

      <div className="mt-6 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-surface-2 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" style={{ color: active ? t.color : undefined }} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="surface-card mt-4 overflow-hidden rounded-xl">
        {q.isLoading ? (
          <LoadingRows rows={6} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : !q.data || q.data.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title={`No ${tab} actions`}
            description="As Cortex captures new activity, extracted actions will appear here."
          />
        ) : (
          <ul className="divide-y divide-border/40">
            {q.data.map((a) => (
              <li key={a.id}>
                <Link
                  to="/actions/$id"
                  params={{ id: a.id }}
                  className="group flex items-center gap-4 px-5 py-3.5 transition hover:bg-surface-2/40"
                >
                  <span className="text-muted-foreground">
                    {a.status === "completed" ? (
                      <CheckSquare className="h-4 w-4 text-[color:var(--color-success)]" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate text-sm ${
                        a.status === "completed"
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {a.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {a.projectName ?? "—"} · {a.mentionCount} mentions
                    </div>
                  </div>
                  <ConfidenceBar value={a.confidence} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageBody>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="hidden items-center gap-2 sm:flex">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--color-brand), var(--color-brand-2))",
          }}
        />
      </div>
      <span className="w-9 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
        {pct}%
      </span>
    </div>
  );
}
