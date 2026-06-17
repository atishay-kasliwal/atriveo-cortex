import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { PageBody, PageHeader } from "@/components/dashboard/page-shell";
import { ErrorState } from "@/components/dashboard/states";
import { MentionList, RecurrenceBadge, WhyCard } from "@/components/dashboard/why";
import { actionQuery } from "@/lib/api/queries";

export const Route = createFileRoute("/actions/$id")({
  head: () => ({ meta: [{ title: "Action · Atriveo Cortex" }] }),
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(actionQuery(params.id));
  },
  component: ActionDetailPage,
});

function ActionDetailPage() {
  const { id } = Route.useParams();
  const q = useQuery(actionQuery(id));

  return (
    <PageBody>
      <Link
        to="/actions"
        className="mb-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> All actions
      </Link>

      {q.isLoading ? (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-xl bg-surface-2" />
          <div className="h-40 animate-pulse rounded-xl bg-surface-2" />
        </div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={q.refetch} />
      ) : !q.data ? (
        <ErrorState error={new Error("Action not found")} />
      ) : (
        <>
          <PageHeader
            eyebrow={`Action · ${q.data.status}`}
            title={q.data.title}
            description={q.data.projectName ? `From ${q.data.projectName}` : undefined}
            actions={
              <RecurrenceBadge
                cadence={q.data.recurrence.cadence}
                perWeek={q.data.recurrence.perWeek}
                trend={q.data.recurrence.trend}
              />
            }
          />

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <section className="surface-card overflow-hidden rounded-xl lg:col-span-2">
              <header className="border-b border-border/60 px-5 py-3">
                <h2 className="text-sm font-semibold tracking-tight">Mention history</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Every time Cortex saw this action mentioned in your activity.
                </p>
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
