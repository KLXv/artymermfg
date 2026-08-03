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

## Quick facts
- Stack: Vite + React + TypeScript · Tailwind · Supabase (db/auth) · Vercel · Anthropic AI proxy.
- Build: `npm install && npm run build` (this is exactly what Vercel runs).
- Tests: `npm test`. Typecheck: `npm run typecheck`.
