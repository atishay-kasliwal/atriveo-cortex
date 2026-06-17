import { Sparkles } from "lucide-react";
import type { Why } from "@/lib/api/types";

export function WhyCard({ why }: { why: Why }) {
  const pct = Math.round(why.confidence * 100);
  return (
    <section className="surface-card relative overflow-hidden rounded-xl p-5">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{ background: "var(--gradient-glow)" }}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-brand)]/30 bg-[color:var(--color-brand)]/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[color:var(--color-brand)]">
            <Sparkles className="h-3 w-3" /> Why Cortex surfaced this
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(90deg, var(--color-brand), var(--color-brand-2))",
                }}
              />
            </div>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{pct}%</span>
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-foreground/95">
          {why.rationale}
        </p>
        {why.signals.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {why.signals.map((s) => (
              <li key={s} className="flex gap-2 text-[12px] text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[color:var(--color-brand)]" />
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function RecurrenceBadge({
  cadence,
  perWeek,
  trend,
}: {
  cadence: string;
  perWeek?: number;
  trend?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1 text-[11px]">
      <span className="font-medium capitalize text-foreground">{cadence}</span>
      {perWeek != null && (
        <span className="font-mono text-muted-foreground">{perWeek}×/wk</span>
      )}
      {trend && (
        <span
          className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
          style={{
            color:
              trend === "rising"
                ? "var(--color-success)"
                : trend === "falling"
                  ? "var(--color-warning)"
                  : "var(--color-muted-foreground)",
            background:
              trend === "rising"
                ? "color-mix(in oklch, var(--color-success) 12%, transparent)"
                : trend === "falling"
                  ? "color-mix(in oklch, var(--color-warning) 12%, transparent)"
                  : "var(--color-surface-2)",
          }}
        >
          {trend}
        </span>
      )}
    </div>
  );
}

export function MentionList({
  mentions,
}: {
  mentions: { id: string; at: string; app?: string; context?: string }[];
}) {
  if (mentions.length === 0) {
    return (
      <p className="px-5 py-4 text-[12px] text-muted-foreground">No mentions captured yet.</p>
    );
  }
  return (
    <ul className="divide-y divide-border/40">
      {mentions.map((m) => (
        <li key={m.id} className="flex items-start gap-3 px-5 py-3">
          <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-brand)]" />
          <div className="min-w-0 flex-1">
            {m.context && <div className="truncate text-[13px] text-foreground/90">{m.context}</div>}
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-mono">{new Date(m.at).toLocaleString()}</span>
              {m.app && <span>· {m.app}</span>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
