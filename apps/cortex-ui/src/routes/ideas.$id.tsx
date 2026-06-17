import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { PageBody, PageHeader } from "@/components/dashboard/page-shell";
import { ErrorState } from "@/components/dashboard/states";
import { MentionList, RecurrenceBadge, WhyCard } from "@/components/dashboard/why";
import { ideaQuery } from "@/lib/api/queries";

export const Route = createFileRoute("/ideas/$id")({
  head: () => ({ meta: [{ title: "Idea · Atriveo Cortex" }] }),
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(ideaQuery(params.id));
  },
  component: IdeaDetailPage,
});

function IdeaDetailPage() {
  const { id } = Route.useParams();
  const q = useQuery(ideaQuery(id));

  return (
    <PageBody>
      <Link
        to="/ideas"
        className="mb-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> All ideas
      </Link>

      {q.isLoading ? (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-xl bg-surface-2" />
          <div className="h-40 animate-pulse rounded-xl bg-surface-2" />
        </div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={q.refetch} />
      ) : !q.data ? (
        <ErrorState error={new Error("Idea not found")} />
      ) : (
        <>
          <PageHeader
            eyebrow="Idea"
            title={q.data.title}
            description={q.data.summary}
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
