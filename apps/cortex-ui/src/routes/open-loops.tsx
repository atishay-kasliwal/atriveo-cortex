import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CircleDashed } from "lucide-react";
import { PageBody, PageHeader } from "@/components/dashboard/page-shell";
import { EmptyState, ErrorState, LoadingRows } from "@/components/dashboard/states";
import { openLoopsQuery } from "@/lib/api/queries";

export const Route = createFileRoute("/open-loops")({
  head: () => ({
    meta: [
      { title: "Open Loops · Atriveo Cortex" },
      { name: "description", content: "Threads you started but haven't closed yet." },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(openLoopsQuery);
  },
  component: OpenLoopsPage,
});

function OpenLoopsPage() {
  const q = useQuery(openLoopsQuery);

  return (
    <PageBody>
      <PageHeader
        eyebrow="Memory"
        title="Open loops"
        description="Things Cortex saw you start but not finish. Sorted by how long they've been waiting."
      />

      <div className="surface-card mt-6 overflow-hidden rounded-xl">
        {q.isLoading ? (
          <LoadingRows rows={6} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : !q.data || q.data.length === 0 ? (
          <EmptyState
            icon={CircleDashed}
            title="No open loops"
            description="When Cortex spots threads you didn't close — a draft, a question, a benchmark — they'll show up here."
          />
        ) : (
          <ul className="divide-y divide-border/40">
            {q.data.map((l) => (
              <li key={l.id}>
                <Link
                  to="/open-loops/$id"
                  params={{ id: l.id }}
                  className="group flex items-center gap-4 px-5 py-3.5 transition hover:bg-surface-2/40"
                >
                  <CircleDashed className="h-4 w-4 text-[color:var(--color-warning)]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{l.title}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {l.projectName ?? "—"} · last touched{" "}
                      {new Date(l.lastTouchedAt).toLocaleString()}
                    </div>
                  </div>
                  <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
                    {Math.round(l.staleHours)}h
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageBody>
  );
}
