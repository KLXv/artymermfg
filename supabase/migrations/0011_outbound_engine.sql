-- Outbound Engine — ICP config on the company + the cold-outbound funnel.
-- Idempotent.

-- Ideal Customer Profile (segments, target cities, size bands) as one JSONB
-- blob on the company singleton, alongside `fiscal`.
alter table company add column if not exists icp jsonb default '{}'::jsonb;

-- Cold-outbound prospects: the new top-of-funnel entity, distinct from
-- `accounts` (a prospect only becomes an account when it engages). Queryable
-- fields are columns; the touch dates + drafted messages are JSONB.
create table if not exists prospects (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text default '',
  org text default '',
  role text default '',
  segment text default '',
  city text default '',
  market text default 'RO',
  lang text default 'EN',
  channel text default 'Email',
  email text default '',
  phone text default '',
  signal text default '',
  source_url text default '',
  status text default 'Not Contacted',
  notes text default '',
  account_id text,
  created_at date,
  touches jsonb default '[]'::jsonb,
  drafts jsonb default '[]'::jsonb,
  -- Scoring + brief carried over from an imported PROSPECTOR lead (docs/prospector-import.md).
  prospector jsonb
);

alter table prospects enable row level security;

drop policy if exists prospects_owner on prospects;
create policy prospects_owner on prospects
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Discovery review queue: agent-proposed candidates awaiting manual approval.
-- Approving one creates a prospect (in app logic); rejecting keeps the record.
create table if not exists discovery_candidates (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  org text default '',
  segment text default '',
  city text default '',
  market text default 'RO',
  signal text default '',
  signal_type text default 'other',
  source_url text default '',
  contact_hint text default '',
  rationale text default '',
  status text default 'pending',
  created_at date,
  source text default 'discovery',   -- 'discovery' (web search) | 'prospector' (imported)
  score numeric,                      -- PROSPECTOR rubric total, for ranking; null for web-search discovery
  prospector jsonb                    -- full scoring blob + brief on imported leads
);

alter table discovery_candidates enable row level security;

drop policy if exists discovery_candidates_owner on discovery_candidates;
create policy discovery_candidates_owner on discovery_candidates
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
