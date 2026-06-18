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

**Phase 0 — Foundation & direction.** Stack scaffolded, schema + secure AI proxy wired, design language and the signature element ("the index") in place, and the hard-won domain logic ported into `src/domain/` with 33 passing tests. Phase 1 rebuilds the shell and all views and migrates real data.
