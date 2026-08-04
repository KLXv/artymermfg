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

In daily use. The domain layer is pure and tested (172 tests); every screen is a
surface over it.

**The money model.** Every figure is normalised to **EUR** internally and rendered in
the operator's home currency (**RON**) on the way out; amounts typed by hand — overheads,
the monthly target — are already in the home currency and use a separate formatter. A
project carries two currencies: what it **sells** for and what the **supplier quotes**
in, since Artymer sells in lei and buys in dollars. Invoices keep their own currency on
the document and convert when summed. `src/domain/finance.ts` is the authority.

**Cost capture** matches how a job is actually quoted: one factory price for a finished
watch by default, with the per-part build-up available for the rare job costed that way.
A committed project with no cost entered is chased from the deck's action queue —
without it, margin and break-even are computing against zero.

**Cloud sync** is offline-first: the local store is always the live copy, diffs are
written through debounced, and every write is checked. A rejected write surfaces as
`sync error` with the database's own message and a retry, and never advances the synced
baseline — the local copy stays authoritative.

**Outbound** runs a target list with a real contact log (what was said, what came back),
follow-ups that appear on the deck as ordinary tasks, and promotion to a client that
carries the conversation across.

**Not yet done:** RO e-Factura XML export (Romanian B2B invoicing is legally required to
go through ANAF, and PDFs alone are not sufficient), and live FX from BNR instead of
rates typed into Settings.

See `STATE.md` for current live state, the deploy rules and the migration ledger, and
`DECISIONS.md` for why things are built the way they are.
