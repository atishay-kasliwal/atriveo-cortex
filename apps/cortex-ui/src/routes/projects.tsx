import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, FolderKanban } from "lucide-react";
import { PageBody, PageHeader } from "@/components/dashboard/page-shell";
import { EmptyState, ErrorState, LoadingCards } from "@/components/dashboard/states";
import { projectsQuery } from "@/lib/api/queries";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects · Atriveo Cortex" },
      { name: "description", content: "Projects Cortex has clustered from your activity." },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(projectsQuery);
  },
  component: ProjectsPage,
});

function ProjectsPage() {
  const q = useQuery(projectsQuery);

  return (
    <PageBody>
      <PageHeader
        eyebrow="Project Explorer"
        title="Projects"
        description="Open a project to see its memory — timeline, actions, ideas and why Cortex grouped it together."
        actions={
          <Link
            to="/projects/health"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Project health →
          </Link>
        }
      />

      <div className="mt-6">
        {q.isLoading ? (
          <LoadingCards cards={6} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : !q.data || q.data.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Cortex will create projects automatically when it detects related work across your sessions."
            hint="Nothing clustered yet"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {q.data.map((p) => (
              <Link
                key={p.id}
                to="/projects/$id"
                params={{ id: p.id }}
                className="surface-card group relative overflow-hidden rounded-xl p-5 transition hover:border-[color:var(--color-brand)]/50"
              >
                {p.color && (
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-px"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${p.color}, transparent)`,
                    }}
                  />
                )}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-offset-2 ring-offset-card"
                      style={{
                        background: p.color ?? "var(--color-brand)",
                        boxShadow: `0 0 16px ${p.color ?? "var(--color-brand)"}`,
                      }}
                    />
                    <div>
                      <h3 className="text-sm font-semibold tracking-tight">{p.name}</h3>
                      {p.description && (
                        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                          {p.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
                </div>

                <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border/60 pt-4">
                  <Stat label="Actions" value={p.actionCount} />
                  <Stat label="Ideas" value={p.ideaCount} />
                  <Stat label="Mentions" value={p.mentionCount ?? 0} />
                </dl>

                <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>
                    First{" "}
                    <span className="font-mono text-foreground/80">
                      {new Date(p.firstSeenAt).toLocaleDateString()}
                    </span>
                  </span>
                  <span>
                    Last{" "}
                    <span className="font-mono text-foreground/80">
                      {new Date(p.lastSeenAt).toLocaleDateString()}
                    </span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageBody>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-mono text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
