# Decisions

A short, running log of architectural choices. Newest phase on top.

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
