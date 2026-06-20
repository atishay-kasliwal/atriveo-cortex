import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Service Health — Timestamp Concepts" },
      { name: "description", content: "Six creative timestamp patterns for a multi-microservice health dashboard." },
    ],
  }),
  component: Index,
});

type Service = {
  name: string;
  status: "healthy" | "degraded" | "down";
  first: Date;
  last: Date;
  mentions: number;
  latencyMs: number;
  uptime: number[]; // 0..1 last 24 buckets
};

const now = Date.now();
const m = (min: number) => new Date(now - min * 60_000);
const h = (hr: number) => new Date(now - hr * 3_600_000);
const d = (day: number) => new Date(now - day * 86_400_000);

const services: Service[] = [
  { name: "auth-gateway",      status: "healthy",  first: d(412), last: m(0.2),  mentions: 18234, latencyMs: 42,  uptime: bars(24, 0.99) },
  { name: "billing-worker",    status: "degraded", first: d(287), last: m(3),    mentions: 4821,  latencyMs: 318, uptime: bars(24, 0.86, [14,15,16]) },
  { name: "search-indexer",    status: "healthy",  first: d(198), last: m(0.8),  mentions: 9120,  latencyMs: 88,  uptime: bars(24, 0.97) },
  { name: "notify-dispatcher", status: "down",     first: d(132), last: h(2.4),  mentions: 612,   latencyMs: 0,   uptime: bars(24, 0.4, [20,21,22,23]) },
  { name: "media-transcoder",  status: "healthy",  first: d(76),  last: m(11),   mentions: 2310,  latencyMs: 124, uptime: bars(24, 0.95) },
  { name: "ledger-ingest",     status: "degraded", first: d(45),  last: m(38),   mentions: 1583,  latencyMs: 210, uptime: bars(24, 0.91, [9,10]) },
];

function bars(n: number, base: number, dips: number[] = []) {
  return Array.from({ length: n }, (_, i) =>
    dips.includes(i) ? Math.max(0, base - 0.5 - Math.random() * 0.2) : Math.min(1, base + (Math.random() - 0.5) * 0.06),
  );
}

function Index() {
  // tick every second to keep "relative" labels alive
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0b10] text-zinc-100 font-mono">
      <header className="border-b border-white/5 px-8 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-sm tracking-[0.3em] text-zinc-400 uppercase">Platform / Health</h1>
          <p className="text-2xl font-semibold mt-1 tracking-tight">6 timestamp concepts</p>
        </div>
        <div className="text-xs text-zinc-500">
          <span className="inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            live · {new Date().toLocaleTimeString()}
          </span>
        </div>
      </header>

      <main className="px-8 py-10 grid gap-10 max-w-[1400px] mx-auto">
        <Section
          n="01"
          title="Dual Stamp — relative + absolute"
          note="Big human-readable relative time, exact timestamp whispered below. Hover-friendly for log-divers."
        >
          <div className="grid grid-cols-2 gap-3">
            {services.slice(0, 4).map((s) => (
              <div key={s.name} className="flex items-center justify-between rounded-md border border-white/5 bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-3">
                  <Dot status={s.status} />
                  <span className="text-sm">{s.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-zinc-100">{relative(s.last)}</div>
                  <div className="text-[10px] text-zinc-500 tabular-nums">{abs(s.last)}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          n="02"
          title="Heartbeat Trail — pulse every signal"
          note="Each tick is a request. A widening gap is a failing service before any alert fires."
        >
          <div className="space-y-2">
            {services.map((s) => (
              <div key={s.name} className="grid grid-cols-[180px_1fr_120px] items-center gap-4 rounded-md bg-white/[0.02] px-4 py-3 border border-white/5">
                <div className="flex items-center gap-2">
                  <Dot status={s.status} />
                  <span className="text-xs">{s.name}</span>
                </div>
                <HeartbeatTrail status={s.status} />
                <div className="text-right text-[11px] text-zinc-400 tabular-nums">last {relative(s.last)}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          n="03"
          title="Lifespan Bar — first → now"
          note="Compresses entire service lifetime into one bar. The cursor is 'now'. Tells you age, recency, and silence at a glance."
        >
          <div className="space-y-3">
            {services.map((s) => (
              <LifespanBar key={s.name} s={s} />
            ))}
          </div>
        </Section>

        <Section
          n="04"
          title="Sparkline + Stamp — uptime over 24h"
          note="24 hourly buckets next to the timestamp. Density beats decoration."
        >
          <div className="grid grid-cols-2 gap-3">
            {services.map((s) => (
              <div key={s.name} className="rounded-md border border-white/5 bg-white/[0.02] px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Dot status={s.status} />
                    <span className="text-xs">{s.name}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 tabular-nums">{relative(s.last)} · {s.latencyMs}ms</span>
                </div>
                <Sparkline data={s.uptime} status={s.status} />
              </div>
            ))}
          </div>
        </Section>

        <Section
          n="05"
          title="Countdown Since — a stopwatch of silence"
          note="Reframes the question: not 'when' but 'how long has it been quiet?'. Reds itself as it climbs."
        >
          <div className="grid grid-cols-3 gap-3">
            {services.map((s) => (
              <SilenceTimer key={s.name} s={s} />
            ))}
          </div>
        </Section>

        <Section
          n="06"
          title="Timeline Lane — all services on one ruler"
          note="One time axis, one row per service. Spot fleet-wide patterns: cascade failures, deploy windows, quiet hours."
        >
          <TimelineLane services={services} />
        </Section>
      </main>

      <footer className="px-8 py-10 text-center text-[11px] text-zinc-600">
        concepts · pick one, mix two, or specify your own data shape
      </footer>
    </div>
  );
}

/* ---------- atoms ---------- */

function Section({ n, title, note, children }: { n: string; title: string; note: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline gap-4 mb-4">
        <span className="text-[10px] tracking-[0.3em] text-zinc-600">{n}</span>
        <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
      </div>
      <p className="text-xs text-zinc-500 mb-4 max-w-2xl leading-relaxed">{note}</p>
      {children}
    </section>
  );
}

function Dot({ status }: { status: Service["status"] }) {
  const color =
    status === "healthy" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" :
    status === "degraded" ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" :
    "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]";
  return <span className={`size-2 rounded-full ${color}`} />;
}

function relative(date: Date) {
  const s = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function abs(date: Date) {
  return date.toISOString().replace("T", " ").slice(0, 19) + "Z";
}

function HeartbeatTrail({ status }: { status: Service["status"] }) {
  const ticks = 40;
  return (
    <div className="flex items-end gap-[3px] h-8">
      {Array.from({ length: ticks }).map((_, i) => {
        const recent = i > ticks - 4;
        const dropout = status === "down" && i > ticks - 12;
        const degraded = status === "degraded" && i % 5 === 0;
        const h = dropout ? 2 : degraded ? 6 : 8 + Math.round(Math.random() * 14);
        const color =
          dropout ? "bg-rose-500/40" :
          degraded ? "bg-amber-400/70" :
          recent ? "bg-emerald-300" :
          "bg-emerald-400/40";
        return <span key={i} className={`w-[3px] rounded-sm ${color} ${recent ? "animate-pulse" : ""}`} style={{ height: h }} />;
      })}
    </div>
  );
}

function LifespanBar({ s }: { s: Service }) {
  const lifetimeMs = Date.now() - s.first.getTime();
  const sinceLast = Date.now() - s.last.getTime();
  const lastPct = 100 - (sinceLast / lifetimeMs) * 100;
  return (
    <div className="rounded-md border border-white/5 bg-white/[0.02] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Dot status={s.status} />
          <span className="text-xs">{s.name}</span>
        </div>
        <span className="text-[10px] text-zinc-500 tabular-nums">
          born {abs(s.first).slice(0, 10)} · {Math.floor(lifetimeMs / 86_400_000)}d alive
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500/40 via-indigo-400/60 to-emerald-400/80"
          style={{ width: `${Math.max(2, lastPct)}%` }}
        />
        <span
          className="absolute -top-1 size-3.5 -translate-x-1/2 rounded-full bg-emerald-300 ring-2 ring-[#0b0b10] shadow-[0_0_8px_rgba(52,211,153,0.8)]"
          style={{ left: `${lastPct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-zinc-500 tabular-nums">
        <span>first seen</span>
        <span>last signal · {relative(s.last)}</span>
      </div>
    </div>
  );
}

function Sparkline({ data, status }: { data: number[]; status: Service["status"] }) {
  const color =
    status === "healthy" ? "bg-emerald-400" :
    status === "degraded" ? "bg-amber-400" :
    "bg-rose-500";
  return (
    <div className="flex items-end gap-[2px] h-10">
      {data.map((v, i) => (
        <span
          key={i}
          className={`w-1.5 rounded-sm ${v < 0.7 ? "bg-rose-500/70" : v < 0.9 ? "bg-amber-400/80" : color}`}
          style={{ height: `${Math.max(8, v * 100)}%`, opacity: 0.4 + (i / data.length) * 0.6 }}
        />
      ))}
    </div>
  );
}

function SilenceTimer({ s }: { s: Service }) {
  const sec = Math.floor((Date.now() - s.last.getTime()) / 1000);
  const tone =
    sec < 60 ? "text-emerald-300" :
    sec < 600 ? "text-zinc-100" :
    sec < 3600 ? "text-amber-300" :
    "text-rose-400";
  const hh = String(Math.floor(sec / 3600)).padStart(2, "0");
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return (
    <div className="rounded-md border border-white/5 bg-white/[0.02] px-4 py-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-400">{s.name}</span>
        <Dot status={s.status} />
      </div>
      <div className={`mt-2 text-3xl tabular-nums tracking-tight ${tone}`}>
        {hh}<span className="text-zinc-600">:</span>{mm}<span className="text-zinc-600">:</span>{ss}
      </div>
      <div className="text-[10px] text-zinc-500 mt-1">since last heartbeat</div>
    </div>
  );
}

function TimelineLane({ services }: { services: Service[] }) {
  const windowMs = 6 * 3_600_000; // last 6h
  const start = Date.now() - windowMs;
  const ticks = [0, 1, 2, 3, 4, 5, 6];
  return (
    <div className="rounded-md border border-white/5 bg-white/[0.02] p-4">
      <div className="relative ml-32 mr-2 h-4 border-b border-white/10">
        {ticks.map((t) => (
          <div key={t} className="absolute -bottom-0 text-[10px] text-zinc-500 tabular-nums" style={{ left: `${(t / 6) * 100}%`, transform: "translateX(-50%)" }}>
            <span className="block h-2 w-px bg-white/15 mx-auto" />
            <span>-{6 - t}h</span>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {services.map((s) => {
          // synthesize events across the 6h window
          const events = Array.from({ length: 26 }, () => start + Math.random() * windowMs)
            .concat([s.last.getTime()])
            .filter((t) => t >= start && t <= Date.now());
          return (
            <div key={s.name} className="grid grid-cols-[128px_1fr] items-center gap-3">
              <div className="flex items-center gap-2 text-[11px]">
                <Dot status={s.status} />
                <span className="truncate">{s.name}</span>
              </div>
              <div className="relative h-6 rounded-sm bg-white/[0.02] overflow-hidden">
                <div className="absolute inset-y-0 left-0 right-0 bg-[linear-gradient(90deg,transparent_0,transparent_calc(100%/6_-_1px),rgba(255,255,255,0.05)_calc(100%/6_-_1px),rgba(255,255,255,0.05)_calc(100%/6))]" />
                {events.map((t, i) => {
                  const left = ((t - start) / windowMs) * 100;
                  const color =
                    s.status === "down" ? "bg-rose-500" :
                    s.status === "degraded" ? "bg-amber-400" :
                    "bg-emerald-400";
                  return <span key={i} className={`absolute top-1/2 -translate-y-1/2 size-1.5 rounded-full ${color}`} style={{ left: `${left}%`, opacity: 0.55 + Math.random() * 0.4 }} />;
                })}
                {/* now cursor */}
                <span className="absolute inset-y-0 right-0 w-px bg-emerald-300/70" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
