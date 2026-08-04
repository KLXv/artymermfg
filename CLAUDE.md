# CLAUDE.md — read this first

**Before doing anything in this repo, read [`STATE.md`](./STATE.md).** It is the
operational runbook: current live state, the deploy rules, and how the owner (Bence,
non-technical) works with you. Then skim `README.md`, `SETUP.md`, and `DECISIONS.md` as
needed.

## Non-negotiable rules

1. **Two-part deploys.** A change can need both **code** (pushed to `main` → Vercel
   auto-deploys) and a **database migration** (a new file in `supabase/migrations/` that
   a human must run by hand in the Supabase SQL Editor). If a change adds a migration,
   say so loudly and make sure it gets run — code alone will error at runtime.

2. **`main` is production.** Pushing to `main` updates the live site. Verify
   `npm run build` is clean before pushing — a red build blocks the deploy.

3. **Pushing needs a token.** Web sessions can't `git push` (403). Ask Bence for a
   short-lived fine-grained PAT (Contents: Read/Write on `KLXv/artymermfg`), push via
   `https://x-access-token:<TOKEN>@github.com/...`, then remind him to revoke it. Never
   store the token.

4. **Don't rewrite the owner's commits.** Commits authored on Bence's Mac may show as
   "Unverified" — that's cosmetic. Do **not** amend/reset-author them; it misattributes
   his work and diverges from what's on GitHub. Use the Anthropic identity only for
   commits you create yourself.

5. **Explain simply.** Bence is not technical and has been overwhelmed by this before.
   Diagnose calmly, say what you're doing and why, and confirm before touching the live
   site or the database.

6. **Keep STATE.md true.** When you change something real, update `STATE.md` (current
   state + migration ledger) so the next session isn't lost.

7. **Money is EUR inside, lei on screen.** Every domain figure is normalised to EUR;
   `baseMoney()` converts on render. Amounts the operator *types* — overheads, the
   monthly target — are already in the home currency and use `homeMoney()` /
   `homeToEur()`. Mixing the two either inflates a number by the rate or subtracts lei
   from euros, and both have shipped before. A project sells in `currency` and buys in
   `costCurrency` (RON out, USD in) — never assume one rate covers both. See `STATE.md` §4.

8. **Check every database write.** supabase-js *resolves* when the database refuses a
   write; the error is on the response. Anything that writes must go through the checked
   path in `src/data/repo.ts` — an unchecked write is indistinguishable from a
   successful one and silently loses data behind a green status light.

9. **Verify before claiming.** Run the build and the tests, and for anything visual,
   render it and look. Several bugs here were invisible in code and obvious on screen —
   and the test suite passed through a timezone bug for months because it ran in UTC
   (`TZ=Europe/Bucharest npx vitest run` is the honest check).

## Quick facts
- Stack: Vite + React + TypeScript · Tailwind · Supabase (db/auth) · Vercel · Anthropic AI proxy.
- Build: `npm install && npm run build` (this is exactly what Vercel runs).
- Tests: `npm test` (also run under `TZ=Europe/Bucharest`). Typecheck: `npm run typecheck`.
- `npm run typecheck` is looser than the build — `tsc -b` catches unused imports and
  duplicate keys that `--noEmit` lets through. Trust the build.
- Screens: `SHOTS_OUT=/tmp/shots node scripts/shots.mjs` against `npx vite preview`
  captures every route with demo data loaded.
