# Decisions

A short, running log of architectural choices. Newest phase on top.

## Phase 5 — Auth, cloud sync, deploy

The last phase wires persistence, login and shipping — without disturbing the
offline-first model.

### Local-first, cloud-optional

The Zustand store (localStorage) stays the live copy in every mode. Three clean
supersets: local-only → +AI → +cloud, each gated on env vars, so the app is
fully usable before any backend exists. When Supabase is configured, a sign-in
gate appears and `SyncProvider` activates; when it isn't, nothing changes.

### The repo mapping (deferred from Phase 1)

`src/data/mappers.ts` — the pure flat-domain ↔ relational+JSONB transforms, with
a unit-tested round-trip (+6 tests, 67 total). Queryable fields are columns; the
deep spec/presentation/costs/controls/images/qc are JSONB groups. Postgres
`date` columns reject "", so empties are nulled on write and restored on read.
`src/data/repo.ts` loads the workspace and pushes **minimal diffs** in FK-safe
phases (parents before children on upsert; children first on delete).

### Sync engine

`SyncProvider` loads (and, on a fresh account, seeds) the cloud on sign-in, then
write-throughs debounced diffs against a last-synced snapshot. Failures degrade
gracefully — the local copy stays authoritative and the sidebar shows the
status. Auth is Supabase email+password; the AI proxy already verified the JWT,
so the model was correct from Phase 0.

### Polish & deploy

Mobile viewport + web-app meta, the Newsreader serif URL fixed, and `SETUP.md`
documenting the Supabase schema, env vars, and the Vercel deploy.

## Phase 4 — Assistant as operator

The assistant moves from a chat box to an operator that proposes actions the
human applies. Logic is pure and tested (`src/domain/operator.ts`, +8 tests, 61
total).

### Human-in-the-loop, not autonomous tool-use

The serverless proxy is a plain SSE passthrough, and a solo operator wants to
approve changes — so rather than wire Anthropic tool-use round-trips, the
assistant emits a fenced `artymer-actions` JSON block which `parseAssistantReply`
extracts, validates and strips from the prose. The UI renders each action as a
confirm card; **nothing touches the store until the operator taps Apply.** During
streaming the prose is rendered through the same parser, so a half-written fence
never flashes.

### Handles, not raw ids

The operator prompt lists live entities as `[P1] … [A1] …` and the model
references those handles only. A handle→entity map is **snapshotted at send
time** and attached to the assistant turn; apply resolves through it, so a stale
or fabricated reference simply can't be applied (the Apply button disables). This
keeps the model from ever fabricating a target id.

### Action set

create_task (optionally linked), advance_stage (reuses the Phase-2 engine),
set_price, log_contact, set_next_action, and draft (finished copy → clipboard).
The operator prompt extends `assistantSystemPrompt`, so the "designs + directs,
does NOT hand-assemble" rule and the Private-Label voice carry through to drafts.

## Phase 3 — Money engine

Money stops being flat totals and becomes forward-looking. All logic is a pure,
tested module (`src/domain/money.ts`, +9 tests, 53 total) over the existing
finance derivations — no new persisted fields.

### Cash-flow forecast (`cashFlowForecast`)

Monthly inflow (scheduled, committed, unpaid deposits/balances bucketed by their
expected date) vs the overhead burn, as a running cumulative position. Overdue
and undated receivables are pulled into the first month so nothing is lost; the
cumulative line's slope is the runway. Rendered as a recharts `ComposedChart`
(inflow + burn bars, position line) on the Money screen.

### Receivables aging (`receivablesAging`)

Outstanding committed receivables split per leg (deposit/balance) and bucketed by
how overdue the expected date is — not due / 0–30 / 31–60 / 60+ — so cash at risk
is explicit rather than a single "outstanding" number.

### Margin health (`marginAnalysis`)

Per-project margin worst-first, the blended margin across all priced work, and a
count of projects under the thin threshold (30%). Surfaces underpriced jobs.

### Inline payment tracking

The ledger's deposit/balance legs are tappable on the Money screen — mark paid
without opening the project. Flows straight back into the forecast, aging, the
deck queue and cash events, since they all read the same `committed`/`owed`
derivations.

## Phase 2 — Pipeline engine

The board stops being a display and starts driving work. All the engine logic
is a pure, tested module (`src/domain/pipeline.ts`, +11 tests) consumed by a
thin store action and UI.

### Stage advance has effects (`planAdvance`)

Advancing a project returns an `AdvanceEffect` — the stage patch, the canonical
next-action task (from `NEXT`, deduped against open tasks, tagged `source:
"stage"`), and expected payment dates *filled in only when blank* (deposit on
entering Won, balance on entering QC). It's a pure planner: the store's
`advanceProject` applies stage + task atomically and returns human notes for the
confirmation toast. So the engine is testable and never double-creates tasks.

### Forecast over the open pipeline (`pipelineMetrics`)

Probability-weighted value by stage (`STAGE_PROB`), speculative vs committed
value, win rate (committed ÷ decided). Surfaced as the forecast strip on the
pipeline. Uses the existing finance derivations — no new persisted fields.

### Outreach cadence (`contactsDue`)

Turns the deck's outreach *count* into an actionable list: never-contacted
prospects, due follow-ups, and active accounts gone cold past a threshold,
most-urgent first. "Log contact" (pipeline + client header) stamps `lastContact`
to today in one tap.

### Tasks become first-class

The `Task` entity and the deck queue already existed; Phase 2 adds the `/tasks`
surface to manage them (add, complete, delete, jump to linked project/client),
and stage advances now feed it. Overdue floats up; done sinks.

## Phase 1 — Parity & polish

### State: one Zustand store, persisted to localStorage

The original derived everything from a single state object mirrored to
localStorage. We preserve that model exactly: one `useStore` (Zustand +
`persist`), selector-level subscriptions, no whole-tree re-renders. **Auth-gated
Supabase sync is deferred to a later phase** — until then the app is fully usable
offline and the JSON export/import is the data bridge. `useDashboard` memoizes
`buildDashboard` over the live store; every view is a thin surface over the pure
domain layer, so no business logic leaked into React.

### Field binding preserves the raw-string model

Projects carry ~80 mostly-string fields. The editor binds them with a tiny
`makeBind(p, patch)` helper that shuttles strings to `patchProject` and coerces
only at calculation time (via `num()`), exactly as the original did. The project
workbench is five tabs — Build (the spec), Commercial, QC, Presentation,
Documents — over a header instrument carrying the stage `IndexRing` and the live
money line.

### Real PDF, lazy-loaded

The dossier and certificate are real PDFs (`@react-pdf/renderer`), the only place
the serif voice and the full type system appear — the outward "object," distinct
from the inward instrument. The **Private-Label override is enforced in the
documents themselves**: Commission leads with `Σ` and the "designed and directed
by one person" credit; Private Label leads with the client's brand and demotes
`Σ` to a small maker's mark. The renderer (~1.4 MB) is dynamically imported on
export so it never enters the initial bundle (app shell ≈ 222 KB gzip); fonts
load from the Fontsource CDN with a base-14 fallback.

### "The index" as a system, not a logo

The signature tick language recurs as the ring (`IndexRing`) on the project
header and a linear bar (`StageTrack`) in every project row and the pipeline
cards — stage progress reads as a machined bezel everywhere, not a progress bar.

## Phase 0 — Foundation & direction

### Stack

- **Vite + React 18 + TypeScript**, SPA. No SSR/SEO — this is a private internal tool.
- **Tailwind v3** as the utility engine, with a **custom token layer** (`tailwind.config.ts` + `src/ui/tokens.css`) so the app does not read as a stock template.
- **Supabase** for database, auth (single user) and file storage.
- **@react-pdf/renderer** for real client-facing PDF export (replaces `window.print` in Phase 1).
- **framer-motion** for restrained motion; **recharts** for charts (kept from the original).
- **Zustand** for state (chosen over Context): preserves the original "everything derived from one store" model with selector-level subscriptions and no whole-tree re-renders.

### Module structure

The organizing principle is to **quarantine the hard-won logic in a pure `src/domain/` layer** — no React, no Supabase, fully unit-tested — so it is ported faithfully and never entangled with UI or persistence.

- `src/domain/` — types, constants, factories, formatting, i18n, finance, QC, document generators, dashboard derivations, migration, AI prompts.
- `api/` — Vercel serverless functions: the Anthropic proxy.
- `src/data/` — Supabase client, AI client, (Phase 1) the repo mapping.
- `src/ui/` — design-system primitives (tokens, `IndexRing`, `Sigma`, …).
- `src/features/` — the screens (Phase 1+).
- `src/documents/` — PDF documents (Phase 1).
- `supabase/migrations/` — schema as versioned SQL.

### Ported logic (behaviour unchanged, pinned by tests)

`specText`, `termsText`, `qcSignoff` (documents) · `projVerdict` (QC engine) · `projFin`/`unitCOGS`/`dep`/`bal`/`owed`/`committed` (finance) · the action queue + cash events + outreach counting (dashboard) · EN/HU/RO i18n · JSON backup/restore + legacy migration · the AI voice/Private-Label prompts. 33 unit tests assert the thresholds, payment splits, FX, verdict logic, queue ordering, the spec/terms exact phrasing, and the legacy migration.

The domain `Project` type is **kept flat** (matching the original object the generators index into) so the port is truly behaviour-preserving. The relational/JSONB split is a persistence concern handled in the data/repo mapping (Phase 1), not in the domain.

### Supabase schema — hybrid relational + JSONB

Of the project's ~80 fields, only ~15 are ever queried or used in derivations (stage, qty, price, currency, dates, payment flags, links, service path, lost). Those are **columns**; the deep spec/presentation/images/costs/qc are **JSONB**. Rationale: keeps derivations and queries clean, avoids an unmaintainable wide table, loses nothing. Every row is `owner_id`-scoped with RLS = `auth.uid()` from day one.

### Secure Anthropic pattern

Direct browser → `api.anthropic.com` only works in the artifact sandbox and would leak the key in a real deploy. Instead:

- Serverless functions at **`/api/ai/chat`** (streaming SSE) and **`/api/ai/generate`** (one-shot). `ANTHROPIC_API_KEY` lives server-side only.
- Each function **verifies the caller's Supabase JWT** before proxying, so the endpoint is not an open relay.
- The **model is an env var** (`ANTHROPIC_MODEL`, default `claude-sonnet-4-6`) — swappable without a redeploy; heavier Phase-4 tool-use calls can route to a stronger model through the same proxy.
- The browser client (`src/data/ai.ts`) calls our endpoints with the session token, never Anthropic directly.

### Design direction

- **Tokens:** brass `#C9A24B` on graphite grounds (`#15171C`/`#1B1E25`); Space Grotesk (display) / IBM Plex Mono (every measured value, as `value ± tol`) / Inter (body). Newsreader serif **reserved for the client-facing dossier/certificate only**, to separate the outward "object" from the inward instrument.
- **Signature element — "the index":** a machined chapter-ring of index ticks (`src/ui/IndexRing.tsx`) that renders stage/progress as engraved ticks rather than a generic bar; the same tick language will mark nav, QC and pipeline. Paired with the `Σ` maker's mark. Motion: the active tick settles on stage advance, disabled under `prefers-reduced-motion`.
- **Private Label override (preserved, non-negotiable):** Commission → `Σ` leads, credit "Designed and directed by one person · Artymer." Private Label → client brand leads the cover; `Σ` is a small side maker's mark ("Crafted by Artymer"); Artymer is never the headline and is unnamed in the AI story.

### Quality floor

Reduced-motion respected globally; visible keyboard focus; mobile-first layout.

### Deferred to Phase 1

The data/repo mapping (flat domain `Project` ↔ relational+JSONB row), the app shell + all views, real PDF export, and migrating LóFő/HFN via JSON import.
