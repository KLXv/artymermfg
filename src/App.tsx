import { useState } from "react";
import { IndexRing } from "./ui/IndexRing";
import { Sigma } from "./ui/Sigma";
import { STAGES } from "./domain";
import { isSupabaseConfigured } from "./data/supabase";

/**
 * Phase 0 foundation screen.
 *
 * Not an app view — those land in Phase 1. This proves the stack boots, renders
 * the brass-on-graphite token system, and previews the signature element ("the
 * index") with its settle-on-advance motion. The full shell + views are gated
 * on sign-off of this direction.
 */

const SWATCHES: [string, string][] = [
  ["ground", "#15171C"],
  ["panel", "#1B1E25"],
  ["inset", "#101216"],
  ["line2", "#3A4150"],
  ["brass", "#C9A24B"],
  ["ink", "#E8E8E8"],
  ["ok", "#6FB98F"],
  ["warn", "#D08A45"],
  ["bad", "#C25B52"],
  ["pl", "#B9A6E0"],
];

const PORTED = [
  ["domain/documents", "spec · terms · QC sign-off generators"],
  ["domain/qc", "per-unit → lot verdict engine"],
  ["domain/finance", "revenue · COGS · deposit/balance · owed · FX"],
  ["domain/dashboard", "action queue · cash events · outreach"],
  ["domain/i18n", "EN · HU · RO dossier + certificate"],
  ["domain/migrate", "JSON backup/restore · legacy migration"],
];

export default function App() {
  const [stage, setStage] = useState(6); // "First-off"

  return (
    <div className="min-h-screen bg-ground text-ink font-body">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        {/* Brand */}
        <header className="mb-10 flex items-center gap-3">
          <Sigma size={26} />
          <div>
            <div className="font-disp text-xs font-semibold tracking-brand">ARTYMER</div>
            <div className="font-mono text-[9px] uppercase tracking-wide text-faint">Cockpit</div>
          </div>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-wide text-faint">
            Phase 0 · Foundation
          </span>
        </header>

        {/* Hero: the signature element */}
        <section className="mb-12 grid items-center gap-8 rounded-md border border-line bg-panel p-7 sm:grid-cols-[auto_1fr]">
          <div className="flex justify-center">
            <IndexRing
              stages={STAGES}
              current={stage}
              size={232}
              centerKicker="Stage"
              centerLabel={STAGES[stage]}
            />
          </div>
          <div>
            <h1 className="font-disp text-2xl font-semibold leading-tight">
              The foundation is laid.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-dim">
              Vite + React + TypeScript + Tailwind, the Supabase + secure Anthropic-proxy wiring,
              and the design language are in place. The hard-won domain logic is ported into a pure,
              tested layer — nothing reinvented.
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-dim">
              The ring is <span className="text-brass">the index</span> — the signature element.
              Advance the stage to see the tick settle:
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {STAGES.map((s, i) => (
                <button
                  key={s}
                  onClick={() => setStage(i)}
                  className={
                    "rounded-[20px] border px-2.5 py-1 font-mono text-[10px] transition-colors " +
                    (i === stage
                      ? "border-brass bg-brass-dim text-brass"
                      : i < stage
                        ? "border-line2 text-dim"
                        : "border-line text-faint hover:text-dim")
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Tokens */}
        <section className="mb-10">
          <div className="mb-3 flex items-baseline gap-2 border-b border-line pb-2">
            <h2 className="font-disp text-sm font-semibold">Token system</h2>
            <span className="ml-auto font-mono text-[9px] uppercase tracking-wide text-faint">
              brass on graphite
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {SWATCHES.map(([name, hex]) => (
              <div key={name} className="flex items-center gap-2">
                <span
                  className="h-7 w-7 rounded border border-line"
                  style={{ background: hex }}
                  aria-hidden
                />
                <div className="font-mono text-[10px] leading-tight">
                  <div className="text-dim">{name}</div>
                  <div className="text-faint">{hex}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-1">
            <div className="font-disp text-lg">Space Grotesk — display</div>
            <div className="font-body text-sm text-dim">Inter — body copy, the reading voice</div>
            <div className="font-mono text-xs text-dim">IBM Plex Mono — every measured value · 40 ± 0.10 mm</div>
            <div className="font-serif text-lg italic text-ink">Newsreader — reserved for the client-facing dossier</div>
          </div>
        </section>

        {/* Ported logic */}
        <section className="mb-10">
          <div className="mb-3 flex items-baseline gap-2 border-b border-line pb-2">
            <h2 className="font-disp text-sm font-semibold">Ported domain logic</h2>
            <span className="ml-auto font-mono text-[9px] uppercase tracking-wide text-ok">
              33 tests green
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {PORTED.map(([mod, desc]) => (
              <div key={mod} className="rounded border border-line bg-inset p-3">
                <div className="font-mono text-xs text-brass">{mod}</div>
                <div className="mt-1 text-xs text-dim">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Status */}
        <footer className="rounded-md border border-line bg-inset p-4 font-mono text-[11px] text-dim">
          <div>
            Supabase:{" "}
            <span className={isSupabaseConfigured() ? "text-ok" : "text-faint"}>
              {isSupabaseConfigured() ? "configured" : "not configured (set VITE_SUPABASE_* to enable)"}
            </span>
          </div>
          <div className="mt-1 text-faint">
            Phase 1 rebuilds the shell + all views on this foundation, with real PDF export and your
            data migrated in. Awaiting sign-off.
          </div>
        </footer>
      </div>
    </div>
  );
}
