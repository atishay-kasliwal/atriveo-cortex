import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, Lightbulb, FolderKanban, CircleDashed, ArrowRight } from "lucide-react";
import { PageBody, PageHeader } from "@/components/dashboard/page-shell";
import { EmptyState, ErrorState, LoadingCards, LoadingRows } from "@/components/dashboard/states";
import { overviewQuery } from "@/lib/api/queries";

export const Route = createFileRoute("/overview")({
  head: () => ({
    meta: [
      { title: "Overview · Atriveo Cortex" },
      { name: "description", content: "What Cortex remembers about your work right now." },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(overviewQuery);
  },
  component: OverviewPage,
});

function OverviewPage() {
  const q = useQuery(overviewQuery);

  return (
    <PageBody>
      <PageHeader
        eyebrow="Working Memory"
        title="Overview"
        description="A live snapshot of what Cortex has learned from your activity."
      />

      {q.isError ? (
        <div className="mt-6">
          <ErrorState error={q.error} onRetry={q.refetch} />
        </div>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <CountTile
              icon={FolderKanban}
              label="Projects"
              value={q.data?.projects}
              to="/projects"
              loading={q.isLoading}
            />
            <CountTile
              icon={CheckSquare}
              label="Actions"
              value={q.data?.actions}
              to="/actions"
              loading={q.isLoading}
            />
            <CountTile
              icon={Lightbulb}
              label="Ideas"
              value={q.data?.ideas}
              to="/ideas"
              loading={q.isLoading}
            />
            <CountTile
              icon={CircleDashed}
              label="Open loops"
              value={q.data?.openLoops}
              to="/open-loops"
              loading={q.isLoading}
            />
          </section>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Recent actions" link="/actions">
              {q.isLoading ? (
                <LoadingRows rows={4} />
              ) : !q.data || q.data.recentActions.length === 0 ? (
                <EmptyState
                  title="No actions yet"
                  description="Cortex extracts actionable items from your activity. They'll appear here as soon as the first ones are captured."
                  hint="Waiting for first capture"
                />
              ) : (
                <ul className="divide-y divide-border/40">
                  {q.data.recentActions.slice(0, 6).map((a) => (
                    <li key={a.id}>
                      <Link
                        to="/actions/$id"
                        params={{ id: a.id }}
                        className="group flex items-center gap-3 px-5 py-3 transition hover:bg-surface-2/40"
                      >
                        <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-[13px]">{a.title}</span>
                        {a.projectName && (
                          <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
                            {a.projectName}
                          </span>
                        )}
                        <ArrowRight className="h-3 w-3 text-muted-foreground/50 transition group-hover:text-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Recent ideas" link="/ideas">
              {q.isLoading ? (
                <LoadingRows rows={4} />
              ) : !q.data || q.data.recentIdeas.length === 0 ? (
                <EmptyState
                  icon={Lightbulb}
                  title="No ideas yet"
                  description="Recurring concepts and themes Cortex notices will collect here."
                  hint="Waiting for first capture"
                />
              ) : (
                <ul className="divide-y divide-border/40">
                  {q.data.recentIdeas.slice(0, 6).map((i) => (
                    <li key={i.id}>
                      <Link
                        to="/ideas/$id"
                        params={{ id: i.id }}
                        className="group flex items-center gap-3 px-5 py-3 transition hover:bg-surface-2/40"
                      >
                        <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-[13px]">{i.title}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {i.mentionCount}×
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/50 transition group-hover:text-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="mt-4">
            <Panel title="Open loops worth attention" link="/open-loops">
              {q.isLoading ? (
                <LoadingCards cards={3} />
              ) : !q.data || q.data.staleLoops.length === 0 ? (
                <EmptyState
                  icon={CircleDashed}
                  title="No open loops"
                  description="Threads you started but never closed will surface here so you don't forget them."
                />
              ) : (
                <ul className="divide-y divide-border/40">
                  {q.data.staleLoops.slice(0, 6).map((l) => (
                    <li key={l.id}>
                      <Link
                        to="/open-loops/$id"
                        params={{ id: l.id }}
                        className="group flex items-center gap-3 px-5 py-3 transition hover:bg-surface-2/40"
                      >
                        <CircleDashed className="h-3.5 w-3.5 text-[color:var(--color-warning)]" />
                        <span className="min-w-0 flex-1 truncate text-[13px]">{l.title}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {Math.round(l.staleHours)}h stale
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/50 transition group-hover:text-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </PageBody>
  );
}

function CountTile({
  icon: Icon,
  label,
  value,
  to,
  loading,
}: {
  icon: typeof CheckSquare;
  label: string;
  value: number | undefined;
  to: string;
  loading: boolean;
}) {
  return (
    <Link
      to={to}
      className="surface-card group flex flex-col gap-3 rounded-xl p-4 transition hover:border-[color:var(--color-brand)]/40"
    >
      <div className="flex items-center justify-between">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <ArrowRight className="h-3 w-3 text-muted-foreground/40 transition group-hover:text-foreground" />
      </div>
      <div>
        {loading ? (
          <div className="h-7 w-12 animate-pulse rounded bg-surface-2" />
        ) : (
          <div className="font-mono text-2xl font-semibold tabular-nums">{value ?? 0}</div>
        )}
        <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      </div>
    </Link>
  );
}

function Panel({
  title,
  link,
  children,
}: {
  title: string;
  link?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card overflow-hidden rounded-xl">
      <header className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {link && (
          <Link to={link} className="text-[11px] text-muted-foreground hover:text-foreground">
            View all →
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}
