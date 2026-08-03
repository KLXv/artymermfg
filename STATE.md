# STATE — the Artymer Cockpit runbook

**This is the "where things stand + how to ship" file. If you read one doc, read this one.**

It exists so that:
- **Bence (the owner)** can drive changes without being technical, and
- **any fresh Claude session** knows the current state and the rules the moment it starts.

Keep it honest. At the end of any session that changes something real (a deploy, a
migration, a new feature), ask Claude: **"update STATE.md."** That one habit is what
keeps future sessions from getting lost.

---

## 1. How to use this file

### If you're Bence, starting a new chat with Claude
Fresh sessions start with no memory of past chats — but they **can** read this repo.
So the very first thing to say in a new session is:

> **"Read STATE.md, then help me with: <what you want>."**

That's it. Claude will load this file, understand the whole setup, and pick up where
the last session left off. You are never starting from zero as long as this file is
current.

### At the end of a session
If anything changed, say: **"Update STATE.md to reflect what we did."**
That keeps this file true for next time.

---

## 2. The 60-second mental model (plain language)

Your cockpit is made of **three separate places**. A change isn't "live" until the
right place has it:

| Place | What it holds | Who changes it |
| --- | --- | --- |
| **GitHub** (`KLXv/artymermfg`) | The source code | Claude pushes here |
| **Vercel** | The **live website** you actually use. It watches GitHub's `main` branch and auto-rebuilds the site whenever `main` changes. | Automatic, when `main` updates |
| **Supabase** | The **database** (your clients, projects, money, prospects). Also handles sign-in. | You run SQL by hand |

Flow of a normal change:
**Claude edits code → pushes to `main` on GitHub → Vercel rebuilds → site is live (~1 min).**

---

## 3. THE GOLDEN RULE — every change can have two halves

This is the thing that bit us and caused the "it didn't deploy right" confusion.
A feature can need **both**:

1. **Code** — lands on the `main` branch → Vercel deploys it automatically.
2. **Database** — a new file in `supabase/migrations/` → **someone has to run it by hand**
   in the Supabase SQL Editor. Vercel does *not* do this for you.

**If you ship the code but skip the migration, the new feature will load but error out**
(the tables it needs don't exist). If you run the migration but never promote the code
to `main`, the site never shows the feature. **You usually need both.**

> Rule of thumb: whenever a change adds a file under `supabase/migrations/`, that SQL
> must be run in Supabase. Always ask Claude: *"does this change need a migration run?"*

---

## 4. Current state (update the date when this changes)

**As of 2026-08-03:**

- **Live production code:** `main` @ `1d698e0` — *"Add Outbound Engine (Phase 1) + PROSPECTOR import bridge."*
- **Database migrations applied:** `0001` → `0011` (the Outbound Engine migration
  `0011_outbound_engine.sql` was run on 2026-08-03). Migrations are **idempotent** —
  re-running one is harmless, it skips whatever already exists.
- **Newest feature live:** the **Outbound Engine** — Prospects, Discovery queue, and
  the PROSPECTOR import bridge. (Screens: `src/features/outreach/`.)
- **Hosting:** Vercel project **ARTYMER** (Hobby plan), auto-deploys `main` to Production.
- **Env vars are set on Vercel** (see §7). AI + cloud sync are both working.

### Branches — only one matters
- **`main`** = production. This is the only branch that affects your live site.
- `feature/outbound-engine`, `claude/optimistic-ride-*`, `claude/ecstatic-volta-*` are
  **old working branches** from past chats. Their useful work is already merged into
  `main`. You can ignore them (or delete them on GitHub later — not urgent).

---

## 5. How to ship a change (the standard recipe)

For Claude to follow, and for Bence to recognize the steps:

1. **Make the code change** and confirm it builds:
   ```bash
   npm install
   npm run build      # MUST be clean — this is exactly what Vercel runs
   ```
   If `npm run build` fails, Vercel will fail too and the site won't update. Never push
   a red build.
2. **Does it add a migration?** Check `supabase/migrations/`. If there's a new file,
   the SQL must be run in Supabase (see §6). Do this **before or right as** the code goes live.
3. **Push to `main`** (see §7 for the token gotcha):
   ```bash
   git push origin main            # or via a token, see §7
   ```
4. **Watch Vercel** → Deployments. A new `main` row builds (~30–45s) → **Ready + Production**.
5. **Hard-refresh the cockpit**: **Cmd + Shift + R** (clears the old cached version).

---

## 6. Running a database migration (you do this by hand)

1. Open the **ARTYMER** project on supabase.com.
2. Left sidebar → **SQL Editor** → **New query**.
3. Open the migration file (e.g. `supabase/migrations/0011_outbound_engine.sql`) and
   paste its full contents. (Or ask Claude to paste the SQL straight into the chat.)
4. Click **Run**. Success or "already exists" skips = both fine.

All migrations are written to be **idempotent** — safe to run more than once.

### Migration ledger
| File | What it adds | Applied? |
| --- | --- | --- |
| `0001_init.sql` | Core tables + row-level security | ✅ |
| `0002`–`0010` | Files, branding, supplier ranking, client portal, base currency, content, inquiries, invoices, strategy/retention | ✅ |
| `0011_outbound_engine.sql` | `prospects`, `discovery_candidates` tables + `icp` on `company` | ✅ (2026-08-03) |

> When a future migration is added, add a row here and mark it applied once you've run it.

---

## 7. Pushing code — the token gotcha (important)

In Claude's **web sessions**, the built-in `git push` is **blocked** (it returns a
`403`). This is an environment limitation, not a broken repo. To push, Claude needs a
**Personal Access Token** from you, one time per session:

**How to make a token (takes ~1 minute):**
1. Go to **https://github.com/settings/personal-access-tokens/new**
2. **Name:** anything (e.g. `artymer-deploy`) · **Expiration:** 7 days
3. **Resource owner:** **KLXv** · **Repository access:** Only select → **`artymermfg`**
4. **Permissions** → **Repository → Contents → Read and write**
5. **Generate token**, copy the `github_pat_…` (or `ghp_…`) string, paste it to Claude.

Claude pushes with:
```bash
git push "https://x-access-token:<TOKEN>@github.com/KLXv/artymermfg.git" main:main
```
**After the deploy goes green, revoke the token** at
https://github.com/settings/tokens (or just let the 7-day expiry kill it). A token is
like a password — one use, then retire it.

> If a push ever fails with *"Invalid username or token"*, the token was revoked/expired —
> just make a fresh one.

**Environment variables** (already set on Vercel → Settings → Environment Variables;
listed here so you know what the app needs):

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Browser → Supabase (safe to ship, RLS-gated) |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Server-side AI proxy (never exposed to the browser) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Server-side, used by the AI proxy to verify sign-in |

---

## 8. Troubleshooting (symptom → cause → fix)

**"I made changes but the live site still looks old."**
→ The code didn't reach `main`, or Vercel is still building, or your browser cached it.
Fix: check Vercel Deployments shows a **Ready Production** row for the newest `main`
commit, then **Cmd+Shift+R**.

**"A new feature shows up but errors / stays empty / says something failed."**
→ Its database migration wasn't run. Fix: run the matching SQL file in Supabase (§6).
The Supabase dashboard showing API errors / a low success rate is the classic sign.

**"Claude can't push — 403."**
→ Normal in web sessions. Give Claude a token (§7).

**"Push failed: Invalid username or token."**
→ The token was revoked or expired. Make a new one (§7).

**"A commit shows as 'Unverified' on GitHub."**
→ Cosmetic. It just means the commit wasn't cryptographically signed (e.g. it came from
your Mac). It does **not** affect the app or the deploy. Do **not** let anyone rewrite
your authored commits to "fix" this — that misattributes your work.

---

## 9. Where things live in the code (quick map)

```
api/                serverless AI proxy (Anthropic key stays server-side)
src/domain/         pure business logic + tests — the real IP (no React/Supabase)
src/data/           Supabase + AI clients, flat↔relational mapping
src/state/          the one Zustand store (offline-first, syncs to Supabase)
src/features/       the screens (Deck, Pipeline, Projects, Money, Outreach, …)
src/features/outreach/   the newest area: Prospects, Discovery, Outreach config
src/ui/             design system (the brass-on-graphite look, components)
supabase/migrations/     database schema — RUN THESE BY HAND in Supabase
```

More detail: `README.md` (overview), `SETUP.md` (first-time setup/deploy),
`DECISIONS.md` (why things are built the way they are).

---

## 10. Copy-paste openers for a new session

**Just catching up:**
> Read STATE.md and tell me the current state of the cockpit in plain language.

**Making a change:**
> Read STATE.md. Then I want to <change>. Tell me if it needs a database migration,
> make the change, confirm the build is clean, and walk me through deploying it.

**Something's broken:**
> Read STATE.md. The cockpit is doing <problem>. Diagnose it and fix it, explaining
> each step simply — I'm not technical.
