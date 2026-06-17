import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Repeat, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { PageBody, PageHeader } from "@/components/dashboard/page-shell";
import { EmptyState, ErrorState, LoadingRows } from "@/components/dashboard/states";
import { recurrenceQuery } from "@/lib/api/queries";

export const Route = createFileRoute("/recurrence")({
  head: () => ({
    meta: [
      { title: "Recurrence · Atriveo Cortex" },
      {
        name: "description",
        content: "Patterns Cortex sees repeating across your activity over time.",
      },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(recurrenceQuery);
  },
  component: RecurrencePage,
});

const trendIcon = { rising: TrendingUp, falling: TrendingDown, steady: Minus };

function RecurrencePage() {
  const q = useQuery(recurrenceQuery);

  return (
    <PageBody>
      <PageHeader
        eyebrow="Patterns"
        title="Recurrence"
        description="Themes, actions and ideas Cortex sees repeating. Use this to understand what's persistent vs one-off."
      />

      <div className="surface-card mt-6 overflow-hidden rounded-xl">
        {q.isLoading ? (
          <LoadingRows rows={6} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : !q.data || q.data.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="No recurring patterns yet"
            description="Cortex needs a few days of activity to detect cadence. Patterns surface automatically as they emerge."
          />
        ) : (
          <ul className="divide-y divide-border/40">
            {q.data.map((r) => {
              const T = r.trend ? trendIcon[r.trend] : Minus;
              const target =
                r.subjectType === "action"
                  ? "/actions/$id"
                  : r.subjectType === "idea"
                    ? "/ideas/$id"
                    : null;
              const inner = (
                <div className="flex items-center gap-4 px-5 py-3.5">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{r.subject}</div>
                    <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {r.subjectType} · {r.cadence}
                      {r.perWeek != null && ` · ${r.perWeek}×/wk`}
                    </div>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {r.occurrences}×
                  </span>
                  <span
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
                    style={{
                      color:
                        r.trend === "rising"
                          ? "var(--color-success)"
                          : r.trend === "falling"
                            ? "var(--color-warning)"
                            : "var(--color-muted-foreground)",
                      background:
                        r.trend === "rising"
                          ? "color-mix(in oklch, var(--color-success) 12%, transparent)"
                          : r.trend === "falling"
                            ? "color-mix(in oklch, var(--color-warning) 12%, transparent)"
                            : "var(--color-surface-2)",
                    }}
                  >
                    <T className="h-3 w-3" />
                    {r.trend ?? "steady"}
                  </span>
                </div>
              );
              return (
                <li key={r.id} className="transition hover:bg-surface-2/40">
                  {target ? (
                    <Link to={target} params={{ id: r.id }}>
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageBody>
  );
}
