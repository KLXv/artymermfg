# Setup & deploy

The cockpit runs in three modes, each a clean superset of the last:

1. **Local only** — no env vars. Data lives in this browser (localStorage). Fully
   usable; the JSON export/import in Settings is your backup vehicle. AI is off.
2. **+ AI** — set the Anthropic vars on the serverless proxy. The assistant and
   the dossier story generator come alive.
3. **+ Cloud** — set the Supabase vars. Sign-in is required; your workspace syncs
   to Postgres and follows you across devices.

You can stop at any mode.

## 1. Supabase (cloud sync + auth)

1. Create a project at [supabase.com](https://supabase.com).
2. **Schema:** open the SQL editor and run `supabase/migrations/0001_init.sql`.
   It creates the six tables and the row-level-security policies (every row is
   scoped to its owner).
3. **Image storage (optional):** create a public bucket named `project-images`
   (Storage → New bucket), or run the snippet at the bottom of the migration.
4. **Auth:** Authentication → Providers → Email is on by default. For a single
   operator you can turn **off** "Confirm email" (Authentication → Settings) so
   account creation signs you straight in.
5. Copy the **Project URL** and the **anon public** key (Settings → API).

## 2. Environment variables

Copy `.env.example` → `.env` for local dev, and set the same in your host
(Vercel → Project → Settings → Environment Variables) for production.

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | browser | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | browser | Supabase anon key (safe to ship) |
| `ANTHROPIC_API_KEY` | server only | the Anthropic key — never exposed to the browser |
| `ANTHROPIC_MODEL` | server only | optional model override (default `claude-sonnet-4-6`) |
| `SUPABASE_URL` | server only | used by the proxy to verify the caller's JWT |
| `SUPABASE_ANON_KEY` | server only | same |

The `VITE_*` vars are compiled into the client bundle (this is expected — the
anon key is public and gated by RLS). The Anthropic key stays server-side in the
`/api/ai/*` functions, which verify the Supabase JWT before proxying.

## 3. Deploy (Vercel)

```bash
npm install
npm run build        # tsc + vite, must be clean
```

Import the repo in Vercel. `vercel.json` already wires the SPA rewrite and the
`api/ai/*` serverless functions. Set the env vars above, deploy. That's it.

## Develop

```bash
npm run dev          # SPA on :5173 (the /api functions need `vercel dev` to run locally)
npm test             # domain + mapper unit tests
npm run typecheck
```

## How sync behaves

- The local store is always the live copy (offline-first).
- On sign-in: if your cloud is empty, the local workspace is pushed up once;
  otherwise the cloud copy is loaded in.
- Edits write through, debounced, as minimal diffs. The sidebar shows
  `synced` / `saving` / `sync error`. On error the local copy stays authoritative
  — export to JSON if you need a guaranteed backup.
