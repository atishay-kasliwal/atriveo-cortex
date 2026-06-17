import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckSquare, Clock, FolderKanban, Lightbulb } from "lucide-react";
import { PageBody, PageHeader } from "@/components/dashboard/page-shell";
import { ErrorState, LoadingRows } from "@/components/dashboard/states";
import { WhyCard } from "@/components/dashboard/why";
import { projectQuery } from "@/lib/api/queries";

export const Route = createFileRoute("/projects/$id")({
  head: () => ({
    meta: [{ title: "Project · Atriveo Cortex" }],
  }),
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(projectQuery(params.id));
  },
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { id } = Route.useParams();
  const q = useQuery(projectQuery(id));

  return (
    <PageBody>
      <Link
        to="/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> All projects
      </Link>

      {q.isLoading ? (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-xl bg-surface-2" />
          <div className="h-40 animate-pulse rounded-xl bg-surface-2" />
        </div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={q.refetch} />
      ) : !q.data ? (
        <ErrorState error={new Error("Project not found")} />
      ) : (
        <>
          <PageHeader
            eyebrow="Project"
            title={q.data.name}
            description={q.data.description}
          />

          <div className="mt-6 grid grid-cols-3 gap-3">
            <Tile icon={CheckSquare} label="Actions" value={q.data.actionCount} />
            <Tile icon={Lightbulb} label="Ideas" value={q.data.ideaCount} />
            <Tile icon={FolderKanban} label="Mentions" value={q.data.mentionCount ?? 0} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <section className="surface-card overflow-hidden rounded-xl lg:col-span-2">
              <header className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <h2 className="text-sm font-semibold tracking-tight">Timeline</h2>
              </header>
              {q.data.timeline.length === 0 ? (
                <p className="px-5 py-8 text-center text-[12px] text-muted-foreground">
                  Nothing on the timeline yet for this project.
                </p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {q.data.timeline.map((e, idx) => (
                    <li key={idx} className="flex items-start gap-3 px-5 py-3">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[color:var(--color-brand)]" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px]">{e.title}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          <span className="font-mono">
                            {new Date(e.at).toLocaleString()}
                          </span>{" "}
                          · {e.kind}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="space-y-4">
              <WhyCard why={q.data.why} />
            </div>
          </div>
        </>
      )}
    </PageBody>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CheckSquare;
  label: string;
  value: number;
}) {
  return (
    <div className="surface-card rounded-xl p-4">
      <div className="flex items-center justify-between">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
// Silence unused import in loading skeleton
void LoadingRows;
