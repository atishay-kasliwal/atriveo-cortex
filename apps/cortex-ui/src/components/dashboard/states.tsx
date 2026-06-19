import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { sanitizeClientErrorMessage } from "@/lib/api/cortex-fetch";

export function LoadingRows({ rows = 5, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`divide-y divide-border/40 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5">
          <div className="h-2 w-2 animate-pulse rounded-full bg-surface-2" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-3/5 animate-pulse rounded bg-surface-2" />
            <div className="h-2 w-2/5 animate-pulse rounded bg-surface-2/60" />
          </div>
          <div className="h-3 w-16 animate-pulse rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

export function LoadingCards({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="surface-card h-36 animate-pulse rounded-xl" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  hint,
  action,
}: {
  icon?: typeof Inbox;
  title: string;
  description?: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface-card flex flex-col items-center justify-center rounded-xl px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-sm tracking-tight text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {hint && (
        <p className="mt-3 max-w-md font-mono text-[11px] uppercase tracking-wider text-muted-foreground/60">
          {hint}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const raw = error instanceof Error ? error.message : "Unknown error";
  const message = sanitizeClientErrorMessage(
    raw,
    "Cortex is temporarily unavailable. Try again in a moment.",
  );
  return (
    <div className="surface-card flex flex-col items-center justify-center rounded-xl border-destructive/30 px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-destructive/40 bg-destructive/10 text-destructive">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold tracking-tight">Couldn't reach Cortex</h3>
      <p className="mt-1.5 max-w-md text-[13px] text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-foreground transition hover:bg-surface-2"
        >
          <RefreshCw className="h-3 w-3" /> Try again
        </button>
      )}
    </div>
  );
}

/** Standard query wrapper — handles loading/empty/error for list-style cards. */
export function QueryView<T>({
  query,
  isEmpty,
  loading,
  empty,
  children,
}: {
  query: { data: T | undefined; isLoading: boolean; isError: boolean; error: unknown; refetch: () => void };
  isEmpty?: (data: T) => boolean;
  loading: ReactNode;
  empty: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (query.isLoading) return <>{loading}</>;
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />;
  const data = query.data as T;
  if (data == null) return <>{empty}</>;
  if (isEmpty?.(data)) return <>{empty}</>;
  return <>{children(data)}</>;
}
