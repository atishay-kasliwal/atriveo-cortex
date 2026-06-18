import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hour by hour — Temporal Distribution" },
      {
        name: "description",
        content:
          "A linear decomposition of your daily activity segments across twenty-four hours.",
      },
      { property: "og:title", content: "Hour by hour — Temporal Distribution" },
      {
        property: "og:description",
        content:
          "A linear decomposition of your daily activity segments across twenty-four hours.",
      },
    ],
  }),
  component: Index,
});

type Category = "build" | "research" | "comm" | "planning" | "entertainment";

interface Block {
  id: string;
  category: Category;
  label: string;
  /** minutes from 00:00 */
  start: number;
  /** duration in minutes */
  duration: number;
}

const CATEGORIES: Record<
  Category,
  { name: string; short: string; color: string; glow: string }
> = {
  build: {
    name: "Build",
    short: "Build",
    color: "bg-cat-build",
    glow: "rgba(59,130,246,0.35)",
  },
  research: {
    name: "Research",
    short: "Research",
    color: "bg-cat-research",
    glow: "rgba(20,184,166,0.35)",
  },
  comm: {
    name: "Communication",
    short: "Comm",
    color: "bg-cat-comm",
    glow: "rgba(249,115,22,0.35)",
  },
  planning: {
    name: "Planning",
    short: "Planning",
    color: "bg-cat-planning",
    glow: "rgba(168,85,247,0.35)",
  },
  entertainment: {
    name: "Entertainment",
    short: "Fun",
    color: "bg-cat-entertainment",
    glow: "rgba(236,72,153,0.35)",
  },
};

const DAY_MIN = 24 * 60;

const BLOCKS: Block[] = [
  { id: "1", category: "planning", label: "Daily plan", start: 8 * 60 + 30, duration: 25 },
  { id: "2", category: "research", label: "Tailwind v4 docs", start: 9 * 60, duration: 120 },
  { id: "3", category: "comm", label: "Standup", start: 11 * 60 + 15, duration: 30 },
  { id: "4", category: "build", label: "Timeline refactor", start: 13 * 60, duration: 60 },
  { id: "5", category: "comm", label: "Design sync", start: 14 * 60, duration: 30 },
  { id: "6", category: "build", label: "Component polish", start: 14 * 60 + 30, duration: 60 },
  { id: "7", category: "research", label: "Easing curves", start: 15 * 60 + 30, duration: 45 },
  { id: "8", category: "build", label: "Bug triage", start: 16 * 60 + 30, duration: 45 },
  { id: "9", category: "entertainment", label: "Evening", start: 20 * 60, duration: 90 },
];

function fmtClock(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function fmtDur(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function Index() {
  const [hovered, setHovered] = useState<string | null>(null);

  const totals = useMemo(() => {
    const t: Record<Category, number> = {
      build: 0,
      research: 0,
      comm: 0,
      planning: 0,
      entertainment: 0,
    };
    for (const b of BLOCKS) t[b.category] += b.duration;
    return t;
  }, []);

  const totalActive = useMemo(
    () => Object.values(totals).reduce((a, b) => a + b, 0),
    [totals],
  );

  return (
    <main className="min-h-screen flex items-center justify-center p-6 lg:p-12">
      <div className="w-full max-w-4xl mx-auto">
        <article
          className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]"
          aria-label="Hour by hour temporal distribution"
        >
          <div className="p-8 md:p-10 space-y-12">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight text-balance">
                  Temporal Distribution
                </h1>
                <p className="text-sm text-zinc-400 text-pretty max-w-[48ch]">
                  A linear decomposition of daily activity segments across
                  twenty-four hours.
                </p>
              </div>

              <ul className="flex flex-wrap gap-x-4 gap-y-2">
                {(Object.keys(CATEGORIES) as Category[]).map((key) => (
                  <li key={key} className="flex items-center gap-2">
                    <span
                      className={`size-1.5 rounded-full ${CATEGORIES[key].color}`}
                    />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                      {CATEGORIES[key].short}
                    </span>
                  </li>
                ))}
              </ul>
            </header>

            {/* Master ribbon */}
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                  Master Ribbon / 00:00 — 24:00
                </h2>
                <span className="tabular-nums text-xs text-zinc-400">
                  Total Active:{" "}
                  <span className="text-zinc-100">{fmtDur(totalActive)}</span>
                </span>
              </div>

              <div
                className="relative h-14 w-full bg-zinc-950 ring-1 ring-white/5 rounded-lg overflow-hidden"
                onMouseLeave={() => setHovered(null)}
              >
                {/* Gridlines at 6h intervals */}
                <div className="absolute inset-0 pointer-events-none">
                  {[0.25, 0.5, 0.75].map((p) => (
                    <div
                      key={p}
                      className="absolute top-0 bottom-0 w-px bg-white/5"
                      style={{ left: `${p * 100}%` }}
                    />
                  ))}
                  {/* Noon marker */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-white/10"
                    style={{ left: "50%" }}
                  />
                </div>

                {/* Blocks */}
                {BLOCKS.map((b) => {
                  const left = (b.start / DAY_MIN) * 100;
                  const width = (b.duration / DAY_MIN) * 100;
                  const cat = CATEGORIES[b.category];
                  const isHover = hovered === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onMouseEnter={() => setHovered(b.id)}
                      onFocus={() => setHovered(b.id)}
                      onBlur={() => setHovered(null)}
                      className={`absolute top-0 bottom-0 ${cat.color} animate-ribbon-rise transition-[transform,box-shadow,filter] duration-300 cursor-pointer focus:outline-none`}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        transform: isHover ? "scaleY(1.08)" : undefined,
                        boxShadow: isHover ? `0 0 24px ${cat.glow}` : undefined,
                        filter: hovered && !isHover ? "saturate(0.5) opacity(0.45)" : undefined,
                      }}
                      aria-label={`${cat.name}: ${b.label}, ${fmtClock(b.start)} to ${fmtClock(b.start + b.duration)}, ${fmtDur(b.duration)}`}
                    />
                  );
                })}
              </div>

              {/* Axis */}
              <div className="flex justify-between tabular-nums text-[10px] text-zinc-600 px-1">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>24:00</span>
              </div>

              {/* Hover readout */}
              <div className="h-6 flex items-center text-[11px] text-zinc-400">
                {hovered ? (
                  (() => {
                    const b = BLOCKS.find((x) => x.id === hovered)!;
                    const cat = CATEGORIES[b.category];
                    return (
                      <div className="flex items-center gap-3 tabular-nums">
                        <span className={`size-1.5 rounded-full ${cat.color}`} />
                        <span className="text-zinc-200 font-medium">{b.label}</span>
                        <span className="text-zinc-500">·</span>
                        <span>{cat.name}</span>
                        <span className="text-zinc-500">·</span>
                        <span>
                          {fmtClock(b.start)} → {fmtClock(b.start + b.duration)}
                        </span>
                        <span className="text-zinc-500">·</span>
                        <span className="text-zinc-300">{fmtDur(b.duration)}</span>
                      </div>
                    );
                  })()
                ) : (
                  <span className="text-zinc-600">
                    Hover a segment to inspect.
                  </span>
                )}
              </div>
            </section>

            {/* Decomposition */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div className="col-span-full">
                <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500 mb-6">
                  Category Decomposition
                </h2>
              </div>

              {(Object.keys(CATEGORIES) as Category[]).map((key) => {
                const cat = CATEGORIES[key];
                const cBlocks = BLOCKS.filter((b) => b.category === key);
                return (
                  <div key={key} className="space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-medium text-zinc-300">
                        {cat.name}
                      </span>
                      <span className="tabular-nums text-xs text-zinc-500">
                        {fmtDur(totals[key])}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden relative ring-1 ring-white/5">
                      {cBlocks.map((b) => (
                        <div
                          key={b.id}
                          className={`absolute top-0 bottom-0 ${cat.color}`}
                          style={{
                            left: `${(b.start / DAY_MIN) * 100}%`,
                            width: `${(b.duration / DAY_MIN) * 100}%`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Footer */}
            <footer className="pt-8 border-t border-zinc-800 flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="size-8 rounded-lg bg-zinc-950 ring-1 ring-white/5 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-zinc-400">A-1</span>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-zinc-100">
                    Instrument Precision
                  </p>
                  <p className="text-[10px] text-zinc-500 tabular-nums">
                    Sample size: 1,440 data points / day
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium rounded-md ring-1 ring-zinc-700 transition-colors"
                >
                  View Archive
                </button>
                <button
                  type="button"
                  className="pl-2 pr-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-medium rounded-md ring-1 ring-white flex items-center gap-1.5 transition-colors"
                >
                  <span className="size-4 shrink-0 bg-zinc-950/10 flex items-center justify-center rounded-sm">
                    <span className="size-1.5 bg-zinc-950" />
                  </span>
                  Download Report
                </button>
              </div>
            </footer>
          </div>
        </article>
      </div>
    </main>
  );
}
