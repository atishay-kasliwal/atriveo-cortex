import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lightbulb } from "lucide-react";
import { PageBody, PageHeader } from "@/components/dashboard/page-shell";
import { EmptyState, ErrorState, LoadingRows } from "@/components/dashboard/states";
import { ideasQuery } from "@/lib/api/queries";

export const Route = createFileRoute("/ideas")({
  head: () => ({
    meta: [
      { title: "Ideas · Atriveo Cortex" },
      { name: "description", content: "Recurring concepts Cortex pulled from your activity." },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(ideasQuery);
  },
  component: IdeasPage,
});

function IdeasPage() {
  const q = useQuery(ideasQuery);
  const max = Math.max(1, ...(q.data?.map((i) => i.mentionCount) ?? [1]));

  return (
    <PageBody>
      <PageHeader
        eyebrow="Idea Explorer"
        title="Ideas"
        description="Concepts Cortex has noticed across your activity. Open one to see when it surfaced and why."
      />

      <div className="surface-card mt-6 overflow-hidden rounded-xl">
        {q.isLoading ? (
          <LoadingRows rows={6} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : !q.data || q.data.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="No ideas yet"
            description="Cortex extracts recurring concepts from your sessions. They'll appear here as soon as patterns emerge."
          />
        ) : (
          <>
            <div className="hidden grid-cols-12 border-b border-border/60 bg-surface/40 px-5 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground md:grid">
              <div className="col-span-6">Idea</div>
              <div className="col-span-2">First seen</div>
              <div className="col-span-2">Last seen</div>
              <div className="col-span-2 text-right">Mentions</div>
            </div>
            <ul>
              {q.data.map((i) => {
                const intensity = i.mentionCount / max;
                return (
                  <li key={i.id}>
                    <Link
                      to="/ideas/$id"
                      params={{ id: i.id }}
                      className="grid grid-cols-1 items-center gap-2 border-b border-border/40 px-5 py-3.5 transition last:border-0 hover:bg-surface-2/40 md:grid-cols-12 md:gap-4"
                    >
                      <div className="flex items-center gap-3 md:col-span-6">
                        <div
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            background: "var(--signal)",
                            boxShadow: `0 0 ${10 + intensity * 16}px oklch(0.55 0.22 264 / ${
                              0.3 + intensity * 0.5
                            })`,
                          }}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{i.title}</div>
                          {i.summary && (
                            <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                              {i.summary}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground md:col-span-2">
                        {new Date(i.firstSeenAt).toLocaleDateString()}
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground md:col-span-2">
                        {new Date(i.lastSeenAt).toLocaleDateString()}
                      </div>
                      <div className="md:col-span-2 md:text-right">
                        <span className="font-mono text-sm font-semibold tabular-nums">
                          {i.mentionCount}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </PageBody>
  );
}
