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

**Phase 1 — Parity & polish.** The full app is rebuilt on the foundation:

- **Shell + routing** — the brass-on-graphite instrument frame, "the index" tick language throughout (`IndexRing`, `StageTrack`), mobile-first.
- **Views** — Command Deck (action queue, cash runway, pulse), Pipeline board, Projects register + the five-tab project workbench (Build/spec · Commercial · QC · Presentation · Documents), Clients CRM, Suppliers bench, Money engine, AI Assistant (streaming), Settings.
- **Real PDF export** — dossier + certificate via `@react-pdf/renderer`, with the Private-Label override baked in. Lazy-loaded so the renderer stays out of the initial bundle.
- **Data vehicle** — JSON import/export round-trip preserved, with the one-time legacy migration applied on import, so existing data (LóFő, HFN) drops straight in. Persists to `localStorage`; cloud sync arrives with auth in a later phase.

State lives in one Zustand store (`src/state/`); every view is a faithful surface over the pure `src/domain/` layer (33 passing tests). **Phase 0** laid the foundation: stack, schema, secure AI proxy, design language, and the ported logic.
