import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText } from "lucide-react";
import { PageBody, PageHeader } from "@/components/dashboard/page-shell";
import { ErrorState } from "@/components/dashboard/states";
import { MentionList, WhyCard } from "@/components/dashboard/why";
import { openLoopQuery } from "@/lib/api/queries";

export const Route = createFileRoute("/open-loops/$id")({
  head: () => ({ meta: [{ title: "Open Loop · Atriveo Cortex" }] }),
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(openLoopQuery(params.id));
  },
  component: OpenLoopDetail,
});

function OpenLoopDetail() {
  const { id } = Route.useParams();
  const q = useQuery(openLoopQuery(id));

  return (
    <PageBody>
      <Link
        to="/open-loops"
        className="mb-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> All open loops
      </Link>

      {q.isLoading ? (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-xl bg-surface-2" />
          <div className="h-40 animate-pulse rounded-xl bg-surface-2" />
        </div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={q.refetch} />
      ) : !q.data ? (
        <ErrorState error={new Error("Open loop not found")} />
      ) : (
        <>
          <PageHeader
            eyebrow={`${q.data.status} · ${q.data.daysOpen}d open · resurfaced ${q.data.resurfaceCount}×`}
            title={q.data.title}
            description={
              q.data.projectName
                ? `${q.data.projectName} · ${q.data.source} · ${q.data.confidence} confidence`
                : `${q.data.source} · ${q.data.confidence} confidence`
            }
          />

          {q.data.resurfaceDates.length > 1 ? (
            <div className="mt-4 rounded-xl border border-border/60 bg-surface-2/30 px-4 py-3 text-[13px] text-muted-foreground">
              Resurfaced on{" "}
              {q.data.resurfaceDates
                .map((d) =>
                  new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  }),
                )
                .join(" · ")}
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <section className="surface-card overflow-hidden rounded-xl lg:col-span-2">
              <header className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <h2 className="text-sm font-semibold tracking-tight">Evidence trail</h2>
              </header>
              {q.data.evidence.length === 0 ? (
                <p className="px-5 py-6 text-[12px] text-muted-foreground">
                  No evidence captured yet.
                </p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {q.data.evidence.map((e) => (
                    <li key={e.id} className="px-5 py-3">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                        <span className="font-mono">{e.sourceType}</span>
                        {e.app && <span>· {e.app}</span>}
                        <span className="ml-auto font-mono">
                          {new Date(e.capturedAt).toLocaleString()}
                        </span>
                      </div>
                      {e.excerpt && (
                        <p className="mt-1.5 text-[13px] text-foreground/90">{e.excerpt}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <header className="border-y border-border/60 px-5 py-3">
                <h2 className="text-sm font-semibold tracking-tight">Mention history</h2>
              </header>
              <MentionList mentions={q.data.mentions} />
            </section>

            <WhyCard why={q.data.why} />
          </div>
        </>
      )}
    </PageBody>
  );
}
