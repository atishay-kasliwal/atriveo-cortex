import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atriveo — Brand Book" },
      { name: "description", content: "The complete identity system for Atriveo: foundation, logo, color, type, voice, and product design tokens." },
      { property: "og:title", content: "Atriveo — Brand Book" },
      { property: "og:description", content: "Software that amplifies human capability through intelligent automation." },
    ],
  }),
  component: Index,
});

/* ---------- Atomic primitives ---------- */

function Mark({
  size = 28,
  color = "var(--bone)",
  accent = "var(--signal)",
}: {
  size?: number;
  color?: string;
  accent?: string;
}) {
  // Atriveo "Directional Apex" mark — a serif-weighted capital A whose
  // crossbar is a compass needle pointing north. Single solid form, no
  // ring, reads as A + compass + ascent. Pairs with the editorial
  // serif wordmark and holds shape at 16px.
  void accent;
  const fill = color === "var(--bone)" ? "var(--ink)" : color;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-label="Atriveo"
      role="img"
    >
      {/* Apex — serif A silhouette */}
      <path d="M50 12L88 88H76L50 38L24 88H12L50 12Z" fill={fill} />
      {/* Compass needle crossbar */}
      <path d="M43 65L50 56L57 65L50 61L43 65Z" fill={fill} />
    </svg>
  );
}

function Wordmark({ className = "" }: { className?: string }) {
  // Fully custom monoline wordmark: hand-drawn lowercase "atriveo" on a 32-unit
  // baseline. Uniform 2.4 stroke, round caps, soft humanist proportions.
  // The dot of the "i" is rendered in Signal blue — the only colored gesture.
  return (
    <svg
      className={`text-ink ${className}`}
      width="148"
      height="32"
      viewBox="0 0 148 32"
      fill="none"
      role="img"
      aria-label="atriveo"
    >
      <g
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* a — single-story: bowl + right stem */}
        <circle cx="10" cy="20" r="7.6" />
        <path d="M17.6 12.4 L17.6 27.6" />

        {/* t — ascender stem with bottom curl + crossbar */}
        <path d="M30 6 L30 24 Q30 27.6 33.6 27.6" />
        <path d="M25.2 12 L34.8 12" />

        {/* r — stem + soft shoulder */}
        <path d="M41 12.4 L41 27.6" />
        <path d="M41 15.6 Q43 12.4 47.6 12.4" />

        {/* i — stem + Signal dot */}
        <path d="M54 12.4 L54 27.6" />

        {/* v — soft valley */}
        <path d="M60 12.4 L68 27.6 L76 12.4" />

        {/* e — open bowl with crossbar */}
        <path d="M81 20 L96 20" />
        <path d="M96 20 A 7.6 7.6 0 1 0 94.4 25.6" />

        {/* o — closed bowl */}
        <circle cx="109" cy="20" r="7.6" />
      </g>
      {/* Signal dot on the "i" — the only chroma in the wordmark */}
      <circle cx="54" cy="6.4" r="2.2" fill="var(--signal)" />
    </svg>
  );
}

function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-hairline">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 py-20 md:py-28">
        <div className="grid md:grid-cols-12 gap-8 mb-12">
          <div className="md:col-span-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-ink-3">
              <span className="h-px w-6 bg-ink-3/40" />
              {eyebrow}
            </div>
          </div>
          <div className="md:col-span-8">
            <h2 className="font-display text-4xl md:text-6xl text-ink leading-[1.02]">{title}</h2>
            {intro && (
              <p className="mt-5 text-ink-3 text-lg max-w-2xl leading-relaxed">{intro}</p>
            )}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-hairline bg-card ${className}`}>{children}</div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-3">
      {children}
    </span>
  );
}

/* ---------- Page ---------- */

function Index() {
  return (
    <main className="bg-bone text-ink min-h-screen selection:bg-ink selection:text-bone">
      <Nav />
      <Hero />
      <Foundation />
      <Logo />
      <Color />
      <Typography />
      <VisualLanguage />
      <ProductSystem />
      <Voice />
      <Marketing />
      <Positioning />
      <Tokens />
      <Footer />
    </main>
  );
}

/* ---------- Nav ---------- */

function Nav() {
  const items = [
    ["Foundation", "foundation"],
    ["Logo", "logo"],
    ["Color", "color"],
    ["Type", "typography"],
    ["Language", "language"],
    ["Product", "product"],
    ["Voice", "voice"],
    ["Tokens", "tokens"],
  ];
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-bone/75 border-b border-hairline">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 h-14 flex items-center justify-between">
        <Wordmark />
        <nav className="hidden md:flex items-center gap-7 text-[13px] text-ink-3">
          {items.map(([label, id]) => (
            <a key={id} href={`#${id}`} className="hover:text-ink transition-colors">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[11px] font-mono uppercase tracking-[0.18em] text-ink-3">
            v1.0 · 2026
          </span>
          <a
            href="#tokens"
            className="text-[13px] px-3 py-1.5 rounded-md bg-ink text-bone hover:bg-ink-2 transition-colors"
          >
            Get tokens
          </a>
        </div>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 grain opacity-60 pointer-events-none" />
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 pt-24 md:pt-36 pb-24 md:pb-40 relative">
        <div className="flex items-center gap-3 mb-10">
          <span className="h-1.5 w-1.5 rounded-full bg-signal" />
          <Label>Brand Book · Atriveo</Label>
        </div>
        <h1 className="font-display text-[56px] md:text-[120px] leading-[0.94] tracking-[-0.025em] text-ink">
          Software that <em className="italic text-ink-3">amplifies</em>
          <br />
          human capability.
        </h1>
        <div className="mt-12 grid md:grid-cols-12 gap-8">
          <p className="md:col-span-7 text-lg md:text-xl text-ink-2 leading-relaxed max-w-2xl">
            Atriveo is a modern platform for intelligent automation, workflows, and digital experiences.
            This is the complete system that shapes how we look, sound, and behave — built to last a decade.
          </p>
          <div className="md:col-span-5 md:pl-8 md:border-l border-hairline grid grid-cols-2 gap-y-5 self-end">
            {[
              ["Vision", "Amplify capability"],
              ["Posture", "Premium · Minimal"],
              ["Audience", "Builders · Teams"],
              ["Era", "Software · 2026 →"],
            ].map(([k, v]) => (
              <div key={k}>
                <Label>{k}</Label>
                <div className="mt-1 text-ink">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Big mark composition */}
        <div className="mt-20 md:mt-28 relative aspect-[16/7] rounded-2xl bg-card border border-hairline overflow-hidden shadow-[var(--shadow-ring)]">
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--ink) 1px, transparent 1px), linear-gradient(to bottom, var(--ink) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Mark size={260} />
          </div>
          <div className="absolute left-5 top-5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-signal" />
            <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-3">
              Primary mark · safe area 1x
            </span>
          </div>
          <div className="absolute right-5 bottom-5 font-mono text-[11px] text-ink-3">
            32 × 32 grid
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 01 Foundation ---------- */

function Foundation() {
  return (
    <Section
      id="foundation"
      eyebrow="01 · Foundation"
      title="A company built around one belief."
      intro="Atriveo exists to make intelligent software feel inevitable — quiet on the surface, profound underneath."
    >
      <div className="grid md:grid-cols-12 gap-6">
        <Card className="md:col-span-7 p-8 md:p-10">
          <Label>Mission</Label>
          <p className="mt-3 font-display text-3xl md:text-4xl text-ink leading-tight">
            Give every person and team the leverage of a great engineer, a tireless operator, and a
            world-class designer — in software.
          </p>
          <div className="mt-10 grid sm:grid-cols-2 gap-8">
            <div>
              <Label>Vision</Label>
              <p className="mt-2 text-ink-2 leading-relaxed">
                A world where the boring work disappears and human attention is spent only on what is
                creative, strategic, and irreplaceable.
              </p>
            </div>
            <div>
              <Label>Positioning</Label>
              <p className="mt-2 text-ink-2 leading-relaxed">
                For builders and teams who refuse to choose between power and elegance, Atriveo is the
                software platform where intelligent automation feels native — not bolted on.
              </p>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-5 p-8 md:p-10 bg-ink text-bone border-ink">
          <Label>
            <span className="text-bone/60">Elevator Pitch</span>
          </Label>
          <p className="mt-3 font-display text-2xl md:text-3xl leading-tight">
            Atriveo is the modern platform for intelligent work. Automate the routine, design the
            exceptional, and ship at the speed of thought — without compromise.
          </p>
          <div className="mt-10 h-px bg-bone/10" />
          <div className="mt-6 grid grid-cols-2 gap-4">
            {["Simplicity", "Excellence", "Innovation", "Reliability", "Scalability", "Human-Centered"].map(
              (v) => (
                <div key={v} className="flex items-center gap-2 text-bone/85 text-sm">
                  <span className="h-1 w-1 rounded-full bg-signal" />
                  {v}
                </div>
              ),
            )}
          </div>
        </Card>

        <Card className="md:col-span-12 p-8 md:p-10">
          <Label>Core Messaging</Label>
          <div className="mt-6 grid md:grid-cols-3 gap-10">
            {[
              ["The headline", "Work, multiplied.", "Used on landing, decks, brand films."],
              ["The promise", "Less effort. Better outcomes.", "Use in product, onboarding, sales."],
              ["The proof", "Quiet software, loud results.", "Use in case studies, comparisons."],
            ].map(([k, v, note]) => (
              <div key={k}>
                <Label>{k}</Label>
                <p className="mt-2 font-display text-3xl text-ink leading-tight">{v}</p>
                <p className="mt-2 text-sm text-ink-3">{note}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Section>
  );
}

/* ---------- 02 Logo ---------- */

function Logo() {
  return (
    <Section
      id="logo"
      eyebrow="02 · Logo System"
      title="One mark. Many surfaces."
      intro="The Atriveo mark is a precise geometric A, constructed on a 32-unit grid. It works at 12px in a browser tab and 200ft on a billboard."
    >
      <div className="grid md:grid-cols-12 gap-6">
        <Card className="md:col-span-7 aspect-[16/10] flex items-center justify-center relative">
          <div className="absolute left-5 top-5"><Label>Primary lockup</Label></div>
          <div className="flex items-center gap-4">
            <Mark size={64} />
            <span className="font-display text-6xl md:text-7xl tracking-[-0.02em]">atriveo</span>
          </div>
        </Card>

        <Card className="md:col-span-5 aspect-[16/10] flex items-center justify-center bg-ink text-bone border-ink relative">
          <div className="absolute left-5 top-5"><Label><span className="text-bone/60">Inverse lockup</span></Label></div>
          <div className="flex items-center gap-4">
            <Mark size={64} color="currentColor" />
            <span className="font-display text-6xl md:text-7xl tracking-[-0.02em]">atriveo</span>
          </div>
        </Card>

        <Card className="md:col-span-3 aspect-square flex items-center justify-center relative">
          <div className="absolute left-5 top-5"><Label>Icon mark</Label></div>
          <Mark size={120} />
        </Card>

        <Card className="md:col-span-3 aspect-square flex items-center justify-center relative bg-[var(--grad-ink)] border-ink">
          <div className="absolute left-5 top-5"><Label><span className="text-bone/60">App icon</span></Label></div>
          <div className="h-32 w-32 rounded-[28px] bg-ink shadow-[var(--shadow-ring)] flex items-center justify-center text-bone">
            <Mark size={72} />
          </div>
        </Card>

        <Card className="md:col-span-3 aspect-square flex items-center justify-center relative">
          <div className="absolute left-5 top-5"><Label>Favicon · 32</Label></div>
          <div className="h-12 w-12 rounded-md border border-hairline flex items-center justify-center">
            <Mark size={22} />
          </div>
        </Card>

        <Card className="md:col-span-3 aspect-square flex items-center justify-center relative bg-signal-soft">
          <div className="absolute left-5 top-5"><Label>Signal lockup</Label></div>
          <Mark size={120} color="var(--signal-deep)" />
        </Card>

        {/* Rules */}
        <Card className="md:col-span-12 p-8 md:p-10">
          <Label>Usage rules</Label>
          <div className="mt-6 grid md:grid-cols-3 gap-6 text-sm">
            {[
              ["Clear space", "Maintain padding equal to the height of the counter of the A on all sides."],
              ["Minimum size", "16px digital · 8mm print for the icon mark. 80px for the full lockup."],
              ["Backgrounds", "Use ink on bone, bone on ink, or signal on signal-soft. Never on photography without a scrim."],
              ["Don't recolor", "Only ink, bone, or signal. No gradients on the mark itself."],
              ["Don't distort", "Never stretch, skew, rotate, outline, or add effects."],
              ["Don't compose", "Never lock with other logos without a divider — see co-brand rules."],
            ].map(([k, v]) => (
              <div key={k} className="border-t border-hairline pt-4">
                <div className="text-ink">{k}</div>
                <div className="mt-1 text-ink-3">{v}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Section>
  );
}

/* ---------- 03 Color ---------- */

type Swatch = {
  name: string;
  hex: string;
  rgb: string;
  hsl: string;
  tw: string;
  ink?: boolean;
};

const palette: Record<string, Swatch[]> = {
  Primary: [
    { name: "Ink", hex: "#0B0D12", rgb: "11 13 18", hsl: "225 24% 6%", tw: "ink", ink: true },
    { name: "Bone", hex: "#FAFAF7", rgb: "250 250 247", hsl: "60 17% 97%", tw: "bone" },
    { name: "Signal", hex: "#2B59FF", rgb: "43 89 255", hsl: "227 100% 58%", tw: "signal", ink: true },
  ],
  Secondary: [
    { name: "Ink 2", hex: "#1E2230", rgb: "30 34 48", hsl: "227 23% 15%", tw: "ink-2", ink: true },
    { name: "Ink 3", hex: "#5A6172", rgb: "90 97 114", hsl: "223 12% 40%", tw: "ink-3", ink: true },
    { name: "Ink 4", hex: "#A8ADBA", rgb: "168 173 186", hsl: "224 9% 69%", tw: "ink-4" },
    { name: "Signal Soft", hex: "#E5ECFF", rgb: "229 236 255", hsl: "224 100% 95%", tw: "signal-soft" },
    { name: "Signal Deep", hex: "#1638C7", rgb: "22 56 199", hsl: "227 80% 43%", tw: "signal-deep", ink: true },
  ],
  Neutral: [
    { name: "Bone 2", hex: "#F1F1EC", rgb: "241 241 236", hsl: "60 11% 94%", tw: "bone-2" },
    { name: "Hairline", hex: "#E5E5DF", rgb: "229 229 223", hsl: "50 11% 89%", tw: "hairline" },
    { name: "Stone", hex: "#C9C9C2", rgb: "201 201 194", hsl: "51 8% 77%", tw: "ink-4" },
    { name: "Slate", hex: "#3A3F4D", rgb: "58 63 77", hsl: "224 14% 26%", tw: "ink-2", ink: true },
  ],
};

function Color() {
  return (
    <Section
      id="color"
      eyebrow="03 · Color"
      title="Restraint, with one signal."
      intro="Atriveo's palette is built on ink and bone. A single Signal blue carries every action, link, and moment of focus."
    >
      <div className="space-y-10">
        {Object.entries(palette).map(([group, swatches]) => (
          <div key={group}>
            <Label>{group} palette</Label>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
              {swatches.map((s) => (
                <div
                  key={s.name}
                  className="rounded-xl border border-hairline overflow-hidden bg-card"
                >
                  <div
                    className="aspect-[5/3] flex items-end p-4"
                    style={{ background: s.hex, color: s.ink ? "#FAFAF7" : "#0B0D12" }}
                  >
                    <div>
                      <div className="text-lg">{s.name}</div>
                      <div className="text-[11px] font-mono opacity-70">{s.hex}</div>
                    </div>
                  </div>
                  <div className="p-3 text-[11px] font-mono text-ink-3 space-y-0.5">
                    <div>rgb({s.rgb})</div>
                    <div>hsl({s.hsl})</div>
                    <div>tw: bg-{s.tw}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Mode pair */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-6">
            <Label>Light mode</Label>
            <div className="mt-4 rounded-lg bg-bone p-6 border border-hairline">
              <div className="font-display text-2xl text-ink">Work, multiplied.</div>
              <p className="text-ink-3 text-sm mt-2">Surfaces stay quiet so content can lead.</p>
              <button className="mt-4 px-3 py-1.5 rounded-md bg-ink text-bone text-sm">Primary</button>
              <button className="ml-2 px-3 py-1.5 rounded-md text-signal text-sm border border-signal/30">
                Signal
              </button>
            </div>
          </Card>
          <Card className="p-6 bg-ink border-ink">
            <Label><span className="text-bone/60">Dark mode</span></Label>
            <div className="mt-4 rounded-lg p-6 border border-bone/10" style={{ background: "#14171F" }}>
              <div className="font-display text-2xl text-bone">Work, multiplied.</div>
              <p className="text-bone/60 text-sm mt-2">Ink stays ink. The Signal carries focus.</p>
              <button className="mt-4 px-3 py-1.5 rounded-md bg-bone text-ink text-sm">Primary</button>
              <button className="ml-2 px-3 py-1.5 rounded-md text-sm" style={{ color: "#7E9CFF", border: "1px solid #2A3A6F" }}>
                Signal
              </button>
            </div>
          </Card>
        </div>

        {/* A11y */}
        <Card className="p-8">
          <Label>Accessibility · WCAG 2.2 AA</Label>
          <div className="mt-5 grid md:grid-cols-4 gap-3 text-sm">
            {[
              ["Ink on Bone", "16.8 : 1", "AAA"],
              ["Bone on Ink", "16.8 : 1", "AAA"],
              ["Ink-3 on Bone", "5.2 : 1", "AA"],
              ["Signal on Bone", "4.7 : 1", "AA"],
              ["Bone on Signal", "4.7 : 1", "AA"],
              ["Signal Deep on Bone", "8.1 : 1", "AAA"],
              ["Bone on Ink-2", "12.4 : 1", "AAA"],
              ["Signal on Ink", "6.9 : 1", "AAA"],
            ].map(([pair, ratio, grade]) => (
              <div key={pair} className="flex items-center justify-between border border-hairline rounded-md px-3 py-2">
                <span className="text-ink">{pair}</span>
                <span className="font-mono text-ink-3">{ratio}</span>
                <span className="text-[11px] font-mono text-signal-deep">{grade}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Section>
  );
}

/* ---------- 04 Typography ---------- */

function Typography() {
  const scale = [
    ["Display XL", "120 / 0.94 / -2.5%", "120px"],
    ["Display", "72 / 0.98 / -2%", "72px"],
    ["H1", "56 / 1.02 / -2%", "56px"],
    ["H2", "40 / 1.08 / -1.5%", "40px"],
    ["H3", "28 / 1.2 / -1%", "28px"],
    ["Body L", "18 / 1.55 / -0.5%", "18px"],
    ["Body", "16 / 1.6 / 0%", "16px"],
    ["Caption", "13 / 1.5 / 0.5%", "13px"],
    ["Mono · Eyebrow", "11 / 1 / 18%", "11px"],
  ];
  return (
    <Section
      id="typography"
      eyebrow="04 · Typography"
      title="Editorial display. Engineered body."
      intro="Instrument Serif carries voice. Inter carries information. JetBrains Mono carries proof."
    >
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-8">
          <Label>Display · Instrument Serif</Label>
          <div className="mt-6 font-display text-7xl text-ink leading-[0.9]">Aa</div>
          <p className="mt-4 text-ink-3 text-sm">For hero moments, brand headlines, editorial.</p>
        </Card>
        <Card className="p-8">
          <Label>Body · Inter</Label>
          <div className="mt-6 text-7xl text-ink leading-[0.9] tracking-[-0.04em] font-medium">Aa</div>
          <p className="mt-4 text-ink-3 text-sm">For UI, product surfaces, marketing body.</p>
        </Card>
        <Card className="p-8">
          <Label>Mono · JetBrains Mono</Label>
          <div className="mt-6 text-7xl text-ink leading-[0.9] font-mono">Aa</div>
          <p className="mt-4 text-ink-3 text-sm">For data, code, labels, micro UI.</p>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] text-sm">
          {scale.map(([name, meta, size], i) => (
            <div
              key={name}
              className={`contents ${i % 2 ? "" : ""}`}
            >
              <div className={`px-6 py-5 border-t border-hairline ${i === 0 ? "border-t-0" : ""}`}>
                <div
                  className={
                    name.startsWith("Display") || name.startsWith("H1")
                      ? "font-display text-ink"
                      : name.startsWith("Mono")
                        ? "font-mono uppercase tracking-[0.18em] text-ink"
                        : "text-ink"
                  }
                  style={{ fontSize: size }}
                >
                  Work, multiplied.
                </div>
              </div>
              <div className={`px-6 py-5 border-t border-hairline font-mono text-[11px] text-ink-3 self-center ${i === 0 ? "border-t-0" : ""}`}>
                {name}
              </div>
              <div className={`px-6 py-5 border-t border-hairline font-mono text-[11px] text-ink-3 self-center ${i === 0 ? "border-t-0" : ""}`}>
                {meta}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6 p-8">
        <Label>Responsive guidelines</Label>
        <div className="mt-4 grid md:grid-cols-3 gap-6 text-sm text-ink-2">
          <p><span className="text-ink">Mobile</span> — clamp display headlines to 56–72px. Body 16/1.55. Reduce mono eyebrow tracking to 0.14em.</p>
          <p><span className="text-ink">Tablet</span> — display 72–96px. Body 17/1.6. Maintain 8-col grid.</p>
          <p><span className="text-ink">Desktop</span> — display 96–144px. Body 18/1.6 on marketing, 14/1.5 in product UI.</p>
        </div>
      </Card>
    </Section>
  );
}

/* ---------- 05 Visual Language ---------- */

function VisualLanguage() {
  return (
    <Section
      id="language"
      eyebrow="05 · Visual Language"
      title="Geometry, hairlines, and one quiet glow."
      intro="The system is built from thin lines, generous whitespace, and a single warm-cool gradient reserved for moments of intelligence."
    >
      <div className="grid md:grid-cols-12 gap-4">
        {/* Iconography */}
        <Card className="md:col-span-5 p-8">
          <Label>Iconography · 1.5px stroke, 24 grid</Label>
          <div className="mt-6 grid grid-cols-6 gap-4 text-ink">
            {iconPaths.map((d, i) => (
              <div key={i} className="aspect-square flex items-center justify-center border border-hairline rounded-md">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {d}
                </svg>
              </div>
            ))}
          </div>
        </Card>

        {/* Shapes */}
        <Card className="md:col-span-4 p-8">
          <Label>Shape language</Label>
          <div className="mt-6 flex items-end gap-5">
            <div className="h-24 w-24 rounded-[14px] bg-ink" />
            <div className="h-20 w-20 rounded-full border border-ink" />
            <div className="h-16 w-16 rounded-md bg-signal" />
            <div className="h-12 w-12 rounded-sm bg-bone-2 border border-hairline" />
          </div>
          <p className="mt-6 text-sm text-ink-3">
            Rounded squares (radius = 28% of side), perfect circles, and crisp 6px rectangles. No
            organic blobs.
          </p>
        </Card>

        {/* Gradient */}
        <Card className="md:col-span-3 p-0 overflow-hidden">
          <div className="h-full min-h-[260px] flex flex-col justify-between p-6 text-bone" style={{ background: "var(--grad-signal)" }}>
            <Label><span className="text-bone/70">Signal gradient</span></Label>
            <div>
              <div className="font-display text-3xl">Intelligence</div>
              <div className="text-bone/70 text-sm mt-1">Reserved for AI surfaces.</div>
            </div>
          </div>
        </Card>

        {/* Pattern */}
        <Card className="md:col-span-7 p-0 overflow-hidden relative h-[260px]">
          <div className="absolute left-6 top-6 z-10"><Label>Grid pattern</Label></div>
          <div className="absolute inset-0" style={{
            backgroundImage:
              "linear-gradient(to right, var(--ink) 1px, transparent 1px), linear-gradient(to bottom, var(--ink) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            opacity: 0.06,
          }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-20 w-20 rounded-full bg-signal blur-[60px] opacity-70" />
          </div>
        </Card>

        {/* Motion */}
        <Card className="md:col-span-5 p-8">
          <Label>Motion principles</Label>
          <ul className="mt-5 space-y-3 text-sm text-ink-2">
            <li><span className="text-ink">Intent</span> — easing cubic-bezier(0.2, 0.7, 0.1, 1). 180–320ms.</li>
            <li><span className="text-ink">Stillness</span> — animations exist to clarify, never to decorate.</li>
            <li><span className="text-ink">Continuity</span> — elements transform, they do not appear.</li>
            <li><span className="text-ink">Restraint</span> — never more than one motion focus on screen.</li>
          </ul>
        </Card>

        {/* Illustration */}
        <Card className="md:col-span-12 p-8">
          <Label>Illustration style — diagrammatic, not decorative</Label>
          <div className="mt-6 grid md:grid-cols-3 gap-6">
            <DiagramFlow />
            <DiagramNodes />
            <DiagramStack />
          </div>
          <p className="mt-6 text-sm text-ink-3 max-w-2xl">
            Illustrations explain systems. They are built from the same primitives as the product:
            hairlines, dots, rounded rectangles, and a single Signal accent. No characters, no
            mascots, no robots.
          </p>
        </Card>
      </div>
    </Section>
  );
}

const iconPaths = [
  <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  <><path d="M3 12h18" /><path d="M3 6h18" /><path d="M3 18h12" /></>,
  <><path d="M4 4h7v7H4z" /><path d="M13 4h7v7h-7z" /><path d="M4 13h7v7H4z" /><path d="M13 13h7v7h-7z" /></>,
  <><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></>,
  <><path d="M21 12a9 9 0 11-9-9" /><path d="M21 3v6h-6" /></>,
  <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></>,
  <><path d="M4 6h16M4 12h16M4 18h7" /></>,
  <><path d="M12 2v20M2 12h20" /></>,
  <><path d="M4 14l5-5 4 4 7-7" /><path d="M14 6h6v6" /></>,
  <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18" /></>,
  <><path d="M12 3l3 6 6 .9-4.5 4.3 1 6.3L12 17.8 6.5 20.5l1-6.3L3 9.9 9 9z" /></>,
  <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
];

function DiagramFlow() {
  return (
    <div className="rounded-lg border border-hairline p-6 bg-bone-2/40">
      <svg viewBox="0 0 220 120" className="w-full h-auto">
        <g stroke="currentColor" strokeWidth="1.2" fill="none" className="text-ink">
          <rect x="10" y="46" width="44" height="28" rx="6" />
          <rect x="88" y="46" width="44" height="28" rx="6" />
          <rect x="166" y="46" width="44" height="28" rx="6" />
          <path d="M54 60h34M132 60h34" />
          <circle cx="68" cy="60" r="2.5" fill="var(--signal)" stroke="none" />
          <circle cx="146" cy="60" r="2.5" fill="var(--signal)" stroke="none" />
        </g>
        <g className="text-ink-3" fontFamily="JetBrains Mono" fontSize="7">
          <text x="20" y="63">Input</text>
          <text x="96" y="63">Reason</text>
          <text x="172" y="63">Action</text>
        </g>
      </svg>
    </div>
  );
}
function DiagramNodes() {
  return (
    <div className="rounded-lg border border-hairline p-6 bg-bone-2/40">
      <svg viewBox="0 0 220 120" className="w-full h-auto">
        <g stroke="currentColor" strokeWidth="1" className="text-ink" fill="none">
          <circle cx="110" cy="60" r="40" />
          <circle cx="110" cy="60" r="22" />
          {[0,1,2,3,4,5].map((i) => {
            const a = (i / 6) * Math.PI * 2;
            const x = 110 + Math.cos(a) * 40;
            const y = 60 + Math.sin(a) * 40;
            return <circle key={i} cx={x} cy={y} r="3" fill={i === 0 ? "var(--signal)" : "currentColor"} stroke="none" />;
          })}
          <circle cx="110" cy="60" r="3" fill="var(--signal)" stroke="none" />
        </g>
      </svg>
    </div>
  );
}
function DiagramStack() {
  return (
    <div className="rounded-lg border border-hairline p-6 bg-bone-2/40">
      <svg viewBox="0 0 220 120" className="w-full h-auto">
        <g stroke="currentColor" strokeWidth="1" fill="none" className="text-ink">
          <rect x="40" y="20" width="140" height="20" rx="4" />
          <rect x="40" y="50" width="140" height="20" rx="4" />
          <rect x="40" y="80" width="140" height="20" rx="4" fill="var(--signal-soft)" />
        </g>
      </svg>
    </div>
  );
}

/* ---------- 06 Product Design System ---------- */

function ProductSystem() {
  return (
    <Section
      id="product"
      eyebrow="06 · Product"
      title="The system, applied."
      intro="A coherent kit of components, surfaces, and tokens — the same primitives that build Atriveo products."
    >
      <div className="grid md:grid-cols-12 gap-4">
        {/* Buttons */}
        <Card className="md:col-span-5 p-8">
          <Label>Buttons</Label>
          <div className="mt-6 space-y-3">
            {[
              ["Primary", "bg-ink text-bone hover:bg-ink-2"],
              ["Signal", "bg-signal text-bone hover:bg-signal-deep"],
              ["Secondary", "bg-bone-2 text-ink border border-hairline hover:bg-bone"],
              ["Ghost", "text-ink hover:bg-bone-2"],
              ["Destructive", "bg-destructive text-bone"],
            ].map(([name, cls]) => (
              <div key={name} className="flex items-center gap-3">
                <button className={`px-4 py-2 rounded-md text-sm ${cls}`}>{name}</button>
                <span className="text-[11px] font-mono text-ink-3">btn/{name.toLowerCase()}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Form */}
        <Card className="md:col-span-7 p-8">
          <Label>Form</Label>
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-ink-3 mb-1.5">Workspace name</div>
              <input
                className="w-full px-3 py-2 rounded-md border border-hairline bg-card text-ink focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/20"
                placeholder="Atriveo HQ"
              />
            </div>
            <div>
              <div className="text-xs text-ink-3 mb-1.5">Region</div>
              <select className="w-full px-3 py-2 rounded-md border border-hairline bg-card text-ink">
                <option>Auto (closest)</option>
                <option>US East</option>
                <option>EU West</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-ink-3 mb-1.5">What will you build?</div>
              <textarea rows={3} className="w-full px-3 py-2 rounded-md border border-hairline bg-card text-ink resize-none" placeholder="A workflow that triages new leads and drafts replies." />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between">
              <label className="text-sm text-ink-3 flex items-center gap-2">
                <input type="checkbox" className="accent-signal" defaultChecked /> Enable intelligence
              </label>
              <button className="px-4 py-2 rounded-md bg-ink text-bone text-sm">Create workspace →</button>
            </div>
          </div>
        </Card>

        {/* Card list */}
        <Card className="md:col-span-7 p-8">
          <Label>Cards · workspace overview</Label>
          <div className="mt-6 grid sm:grid-cols-3 gap-3">
            {[
              ["Active runs", "1,284", "+8.2%"],
              ["Time saved", "92h", "this week"],
              ["Success rate", "99.4%", "30d"],
            ].map(([k, v, n]) => (
              <div key={k} className="rounded-lg border border-hairline p-4 bg-card">
                <div className="text-xs text-ink-3">{k}</div>
                <div className="mt-2 font-display text-3xl text-ink">{v}</div>
                <div className="text-[11px] font-mono text-signal-deep mt-1">{n}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Table */}
        <Card className="md:col-span-5 p-0 overflow-hidden">
          <div className="p-6 pb-3"><Label>Table</Label></div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-3 border-t border-hairline">
                <th className="text-left px-6 py-2 font-normal">Workflow</th>
                <th className="text-left px-6 py-2 font-normal">Status</th>
                <th className="text-right px-6 py-2 font-normal">Runs</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Lead triage", "Live", "842"],
                ["Invoice intake", "Live", "311"],
                ["Daily digest", "Paused", "12"],
              ].map(([w, s, r]) => (
                <tr key={w} className="border-t border-hairline">
                  <td className="px-6 py-3 text-ink">{w}</td>
                  <td className="px-6 py-3">
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${s === "Live" ? "bg-signal-soft text-signal-deep" : "bg-bone-2 text-ink-3"}`}>
                      {s}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-ink-3">{r}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Dashboard preview */}
        <Card className="md:col-span-12 p-0 overflow-hidden">
          <div className="grid grid-cols-[200px_1fr] min-h-[360px]">
            <aside className="border-r border-hairline bg-bone-2/40 p-4 space-y-1">
              <Wordmark className="mb-5" />
              {["Home", "Workflows", "Runs", "Data", "Models", "Settings"].map((i, idx) => (
                <div key={i} className={`px-2 py-1.5 rounded-md text-sm ${idx === 1 ? "bg-ink text-bone" : "text-ink-3 hover:text-ink"}`}>{i}</div>
              ))}
            </aside>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Dashboard</Label>
                  <div className="font-display text-3xl text-ink mt-1">Workflows</div>
                </div>
                <button className="px-3 py-1.5 rounded-md bg-ink text-bone text-sm">New workflow</button>
              </div>
              <div className="mt-6 rounded-lg border border-hairline overflow-hidden">
                <div className="h-40 relative" style={{ background: "linear-gradient(180deg, var(--bone-2), transparent)" }}>
                  <svg viewBox="0 0 600 160" className="w-full h-full">
                    <path d="M0 130 C 80 90, 140 110, 220 80 S 360 30, 460 60 600 40 600 40" fill="none" stroke="var(--signal)" strokeWidth="2" />
                    <path d="M0 130 C 80 90, 140 110, 220 80 S 360 30, 460 60 600 40 600 40 L600 160 L0 160 Z" fill="var(--signal-soft)" opacity="0.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Empty state + Notif */}
        <Card className="md:col-span-6 p-10 flex flex-col items-center text-center">
          <Label>Empty state</Label>
          <div className="mt-6 h-14 w-14 rounded-xl border border-hairline flex items-center justify-center"><Mark size={26} /></div>
          <div className="font-display text-2xl text-ink mt-5">Nothing here, yet.</div>
          <p className="text-ink-3 text-sm mt-1 max-w-xs">Create your first workflow and Atriveo will run it on your behalf.</p>
          <button className="mt-5 px-4 py-2 rounded-md bg-ink text-bone text-sm">Create workflow</button>
        </Card>

        <Card className="md:col-span-6 p-8 space-y-3">
          <Label>Notifications</Label>
          <div className="rounded-lg border border-hairline p-4 flex items-start gap-3">
            <span className="h-2 w-2 rounded-full bg-signal mt-2" />
            <div className="flex-1">
              <div className="text-ink text-sm">Lead triage completed 142 runs.</div>
              <div className="text-ink-3 text-xs mt-0.5">2 minutes ago · 0 errors</div>
            </div>
            <button className="text-xs text-ink-3 hover:text-ink">View</button>
          </div>
          <div className="rounded-lg border border-hairline p-4 flex items-start gap-3 bg-bone-2/40">
            <span className="h-2 w-2 rounded-full bg-ink-4 mt-2" />
            <div className="flex-1">
              <div className="text-ink text-sm">New model available — atriveo-pro 2.</div>
              <div className="text-ink-3 text-xs mt-0.5">Improved reasoning, lower cost.</div>
            </div>
            <button className="text-xs text-ink-3 hover:text-ink">Dismiss</button>
          </div>
        </Card>
      </div>
    </Section>
  );
}

/* ---------- 07 Voice ---------- */

function Voice() {
  return (
    <Section
      id="voice"
      eyebrow="07 · Voice"
      title="Confident. Quiet. Specific."
      intro="Atriveo writes the way good engineers think — short sentences, real verbs, no theater."
    >
      <div className="grid md:grid-cols-12 gap-4">
        <Card className="md:col-span-6 p-8">
          <Label>Tone</Label>
          <div className="mt-6 space-y-3">
            {[
              ["We are", "Direct · Considered · Warm · Precise"],
              ["We are not", "Cute · Hype-driven · Jargon-heavy · Salesy"],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-4 border-t border-hairline pt-3">
                <div className="w-28 text-ink-3 text-sm">{k}</div>
                <div className="text-ink">{v}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="md:col-span-6 p-8">
          <Label>CTA library</Label>
          <div className="mt-6 grid grid-cols-2 gap-2 text-sm">
            {["Start building", "See it work", "Try a workflow", "Open a workspace", "Read the system", "Talk to founders"].map((c) => (
              <div key={c} className="border border-hairline rounded-md px-3 py-2 text-ink">{c} →</div>
            ))}
          </div>
        </Card>

        <Card className="md:col-span-12 p-8">
          <Label>Voice in context</Label>
          <div className="mt-6 grid md:grid-cols-3 gap-6">
            {[
              ["Product", "“Workflow saved. It will run on the next event.”", "Always state what happened and what's next."],
              ["Marketing", "“The boring work, gone. The good work, multiplied.”", "Lead with outcome. Earn the headline."],
              ["Website", "“Atriveo is the platform for intelligent work.” — One sentence. No fluff. No hero adjectives."],
            ].map(([k, q, n]) => (
              <div key={k}>
                <Label>{k}</Label>
                <p className="mt-3 font-display text-2xl text-ink leading-snug">{q}</p>
                <p className="mt-2 text-sm text-ink-3">{n}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Section>
  );
}

/* ---------- 08 Marketing ---------- */

function Marketing() {
  return (
    <Section
      id="marketing"
      eyebrow="08 · Marketing"
      title="How the brand shows up in the world."
      intro="Templates designed once, used everywhere — from a LinkedIn banner to a pitch deck cover."
    >
      <div className="grid md:grid-cols-12 gap-4">
        {/* Landing concept */}
        <Card className="md:col-span-12 p-0 overflow-hidden">
          <div className="aspect-[16/8] bg-bone relative border-b border-hairline">
            <div className="absolute inset-0 grain opacity-50" />
            <div className="absolute top-5 left-6 right-6 flex items-center justify-between">
              <Wordmark />
              <div className="hidden md:flex items-center gap-6 text-xs text-ink-3">
                <span>Product</span><span>Customers</span><span>Pricing</span><span>Docs</span>
                <span className="px-3 py-1 rounded-md bg-ink text-bone">Start →</span>
              </div>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-3 mb-4">A new kind of software</span>
              <h3 className="font-display text-5xl md:text-7xl text-ink leading-[0.98]">
                Work, <em className="italic text-ink-3">multiplied</em>.
              </h3>
              <p className="mt-5 max-w-xl text-ink-3">
                Atriveo turns the routine into infrastructure, so your team can spend its hours on what only
                humans can do.
              </p>
              <div className="mt-7 flex gap-3">
                <span className="px-4 py-2 rounded-md bg-ink text-bone text-sm">Start building →</span>
                <span className="px-4 py-2 rounded-md border border-hairline text-ink text-sm">See it work</span>
              </div>
            </div>
          </div>
        </Card>

        {/* LinkedIn banner */}
        <Card className="md:col-span-8 p-0 overflow-hidden">
          <div className="aspect-[4/1] bg-ink text-bone relative flex items-center px-10">
            <div className="absolute inset-0 opacity-[0.08]" style={{
              backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }} />
            <div className="relative">
              <Label><span className="text-bone/60">LinkedIn · 1584 × 396</span></Label>
              <div className="font-display text-4xl mt-2">Work, multiplied.</div>
            </div>
            <Mark size={120} color="currentColor" />
          </div>
        </Card>

        {/* Pitch cover */}
        <Card className="md:col-span-4 p-0 overflow-hidden">
          <div className="aspect-[4/3] relative flex flex-col justify-between p-6 text-bone" style={{ background: "var(--grad-ink)" }}>
            <div className="flex items-center justify-between">
              <Wordmark className="!text-bone" />
              <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-bone/60">Series A · 2026</span>
            </div>
            <div>
              <div className="font-display text-4xl leading-tight">A new kind of software.</div>
              <div className="text-bone/60 text-sm mt-2">Pitch deck cover · 4:3</div>
            </div>
          </div>
        </Card>

        {/* Social tiles */}
        {[
          { bg: "bg-bone-2", text: "text-ink", hd: "Quiet software. Loud results.", tag: "Square · 1080" },
          { bg: "bg-ink", text: "text-bone", hd: "The boring work, gone.", tag: "Square · 1080" },
          { bg: "bg-signal", text: "text-bone", hd: "Built for the next decade.", tag: "Square · 1080" },
        ].map((s, i) => (
          <Card key={i} className="md:col-span-4 p-0 overflow-hidden">
            <div className={`${s.bg} ${s.text} aspect-square p-6 flex flex-col justify-between`}>
              <Wordmark className={s.text === "text-bone" ? "!text-bone" : ""} />
              <div>
                <div className="font-display text-3xl leading-tight">{s.hd}</div>
                <div className={`text-xs font-mono uppercase tracking-[0.18em] mt-3 opacity-70`}>{s.tag}</div>
              </div>
            </div>
          </Card>
        ))}

        {/* Email signature */}
        <Card className="md:col-span-12 p-8">
          <Label>Email signature</Label>
          <div className="mt-5 flex items-center gap-5 text-sm">
            <div className="h-12 w-12 rounded-lg bg-ink text-bone flex items-center justify-center"><Mark size={22} color="currentColor" /></div>
            <div className="border-l border-hairline pl-5">
              <div className="text-ink">Avery Chen</div>
              <div className="text-ink-3">Founder · Atriveo</div>
              <div className="text-ink-3 font-mono text-xs mt-1">atriveo.com · avery@atriveo.com</div>
            </div>
          </div>
        </Card>
      </div>
    </Section>
  );
}

/* ---------- 09 Positioning ---------- */

function Positioning() {
  const rows = [
    ["Notion", "Docs & wikis", "Atriveo runs the work the docs describe."],
    ["Linear", "Engineering tasks", "Atriveo turns issues into automated action."],
    ["Airtable", "Structured data", "Atriveo gives that data intelligence and motion."],
    ["Monday", "Project visibility", "Atriveo executes, not just reports."],
    ["Asana", "Team coordination", "Atriveo removes the work coordination was tracking."],
    ["OpenAI", "Raw intelligence", "Atriveo turns intelligence into a product surface."],
  ];
  return (
    <Section
      id="positioning"
      eyebrow="09 · Positioning"
      title="Where Atriveo sits."
      intro="We don't replace these tools — we render most of what they coordinate unnecessary."
    >
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-3">
              <th className="text-left px-6 py-4 font-normal">Reference</th>
              <th className="text-left px-6 py-4 font-normal">Their core</th>
              <th className="text-left px-6 py-4 font-normal">Atriveo's relation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([a, b, c]) => (
              <tr key={a} className="border-t border-hairline">
                <td className="px-6 py-5 text-ink font-medium w-1/4">{a}</td>
                <td className="px-6 py-5 text-ink-3 w-1/4">{b}</td>
                <td className="px-6 py-5 text-ink">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Section>
  );
}

/* ---------- 10 Tokens ---------- */

function Tokens() {
  const css = `:root {
  --bone:        #FAFAF7;
  --bone-2:      #F1F1EC;
  --ink:         #0B0D12;
  --ink-2:       #1E2230;
  --ink-3:       #5A6172;
  --ink-4:       #A8ADBA;
  --hairline:    #E5E5DF;
  --signal:      #2B59FF;
  --signal-soft: #E5ECFF;
  --signal-deep: #1638C7;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;

  --shadow-soft: 0 1px 0 rgba(0,0,0,.04), 0 8px 24px -12px rgba(0,0,0,.12);
  --shadow-ring: 0 0 0 1px rgba(0,0,0,.06), 0 12px 40px -16px rgba(0,0,0,.18);

  --font-display: "Instrument Serif", Georgia, serif;
  --font-sans:    "Inter", system-ui, sans-serif;
  --font-mono:    "JetBrains Mono", ui-monospace, monospace;

  --ease:    cubic-bezier(.2,.7,.1,1);
  --dur-1:   180ms;
  --dur-2:   240ms;
  --dur-3:   320ms;
}`;

  const tw = `// tailwind theme extension (v4 @theme)
@theme {
  --color-bone:        #FAFAF7;
  --color-ink:         #0B0D12;
  --color-ink-3:       #5A6172;
  --color-signal:      #2B59FF;
  --color-signal-soft: #E5ECFF;

  --font-display: "Instrument Serif", serif;
  --font-sans:    "Inter", sans-serif;
  --font-mono:    "JetBrains Mono", monospace;

  --radius-md: 10px;
  --radius-lg: 14px;
}`;

  const figma = `// figma variables — atriveo/1.0
color/ink         = #0B0D12
color/bone        = #FAFAF7
color/signal      = #2B59FF
color/signal-soft = #E5ECFF
space/1           = 4
space/2           = 8
space/3           = 12
space/4           = 16
space/6           = 24
space/8           = 32
radius/md         = 10
radius/lg         = 14
type/display      = Instrument Serif / Regular
type/body         = Inter / 400
type/mono         = JetBrains Mono / 400`;

  return (
    <Section
      id="tokens"
      eyebrow="10 · Tokens"
      title="Take the system with you."
      intro="Copy-paste-ready CSS variables, a Tailwind v4 theme, and Figma variable names. One source of truth."
    >
      <div className="grid md:grid-cols-3 gap-4">
        {[
          ["CSS variables", css],
          ["Tailwind theme", tw],
          ["Figma variables", figma],
        ].map(([title, body]) => (
          <Card key={title} className="p-0 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-hairline">
              <Label>{title}</Label>
              <span className="text-[11px] font-mono text-ink-3">copy</span>
            </div>
            <pre className="p-5 text-[12px] leading-relaxed font-mono text-ink-2 overflow-auto max-h-[420px] whitespace-pre">
{body}
            </pre>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-8 bg-ink text-bone border-ink">
        <div className="grid md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8">
            <Label><span className="text-bone/60">Brand book · v1.0</span></Label>
            <div className="font-display text-3xl mt-2">The Atriveo system is designed to outlast trends.</div>
            <p className="text-bone/60 mt-2 text-sm max-w-xl">
              Built on hairlines, geometry, and one signal — to remain unmistakable as the product changes
              shape over the next decade.
            </p>
          </div>
          <div className="md:col-span-4 md:text-right space-y-2 text-sm text-bone/70">
            <div>Maintained by Atriveo Design</div>
            <div className="font-mono text-xs">brand@atriveo.com</div>
          </div>
        </div>
      </Card>
    </Section>
  );
}

/* ---------- Footer ---------- */

function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-sm text-ink-3">
        <div className="flex items-center gap-4">
          <Wordmark />
          <span className="text-ink-4">·</span>
          <span>Brand Book · v1.0</span>
        </div>
        <div className="flex gap-6">
          <a href="#foundation">Foundation</a>
          <a href="#logo">Logo</a>
          <a href="#color">Color</a>
          <a href="#tokens">Tokens</a>
        </div>
        <span className="font-mono text-xs">© 2026 Atriveo, Inc.</span>
      </div>
    </footer>
  );
}
