# Artymer Cockpit

Internal operations workspace for **Artymer** — a B2B bespoke watch design house on an OEM model. Single user, mobile-first, used daily.

This is the rebuild of the original single-file `ArtymerCockpit.jsx` into a real, maintainable app. Built in phases with sign-off between them — see `DECISIONS.md` and the kickoff brief.

## Stack

Vite · React + TypeScript · Tailwind (custom token layer) · Supabase (db/auth/storage) · @react-pdf/renderer · framer-motion · recharts. AI via a secure serverless Anthropic proxy.

## Develop

```bash
npm install
npm run dev        # SPA dev server
npm test           # domain unit tests
npm run typecheck  # tsc --noEmit
npm run build      # production build
```

Copy `.env.example` → `.env` and fill in Supabase + Anthropic values to enable auth and AI. The app boots without them (foundation screen).

## Layout

```
api/            serverless Anthropic proxy (key stays server-side)
src/domain/     pure, tested business logic — the IP (no React, no Supabase)
src/data/       Supabase + AI clients (repo mapping lands in Phase 1)
src/ui/         design system: tokens + signature components
src/features/   screens (Phase 1+)
src/documents/  client-facing PDFs (Phase 1)
supabase/       schema migrations
```

## Status

**Phase 4 — Assistant as operator.** The assistant proposes confirmable actions
grounded in live state — create a task, advance a stage, set a price, log
contact, schedule a follow-up, or draft copy. It references entities by handles
([P1]/[A1]) resolved through a map snapshotted at send time; nothing touches the
store until you tap Apply. Pure parsing/protocol (`src/domain/operator.ts`); 61
tests green.

**Phase 3 — Money engine.** Money is forward-looking: a 6-month cash-flow
forecast (scheduled receivables vs overhead burn, cumulative position/runway),
receivables aging (cash at risk by overdue bucket), margin health (worst-first +
blended, thin-margin flags), and inline payment tracking on the ledger. Pure and
tested (`src/domain/money.ts`); 53 tests green.

**Phase 2 — Pipeline engine.** The board drives work, not just displays it:
advancing a stage generates its canonical next-action task and fills in expected
payment dates; a forecast strip shows probability-weighted pipeline value and win
rate; an outreach cadence lists who needs a touch with one-tap "Log contact"; and
Tasks are a first-class surface (`/tasks`). All engine logic is pure and tested
(`src/domain/pipeline.ts`); 44 tests green.

**Phase 1 — Parity & polish.** The full app rebuilt on the foundation:

- **Shell + routing** — the brass-on-graphite instrument frame, "the index" tick language throughout (`IndexRing`, `StageTrack`), mobile-first.
- **Views** — Command Deck (action queue, cash runway, pulse), Pipeline board, Projects register + the five-tab project workbench (Build/spec · Commercial · QC · Presentation · Documents), Clients CRM, Suppliers bench, Money engine, AI Assistant (streaming), Settings.
- **Real PDF export** — dossier + certificate via `@react-pdf/renderer`, with the Private-Label override baked in. Lazy-loaded so the renderer stays out of the initial bundle.
- **Data vehicle** — JSON import/export round-trip preserved, with the one-time legacy migration applied on import, so existing data (LóFő, HFN) drops straight in. Persists to `localStorage`; cloud sync arrives with auth in a later phase.

State lives in one Zustand store (`src/state/`); every view is a faithful surface over the pure `src/domain/` layer (33 passing tests). **Phase 0** laid the foundation: stack, schema, secure AI proxy, design language, and the ported logic.
