-- Schema repair — brings any database up to what the app writes today.
--
-- Why this exists: until now a rejected write was swallowed silently (the sync
-- engine never inspected the PostgREST response), so a workspace could run for
-- months against a database that was missing a column, showing "synced" the
-- whole time. Now that failures surface, the fix is to guarantee every table
-- and column the sync engine touches actually exists.
--
-- This restates the additive DDL from 0002–0011 in one block. Every statement
-- is idempotent — anything already present is skipped — so it is safe to run
-- on any database, in any state, more than once. It only ever ADDS; it never
-- drops a column or deletes a row.

/* ---- company (singleton) ------------------------------------------------ */
alter table company add column if not exists logo          text  default '';
alter table company add column if not exists letterhead    text  default '';
alter table company add column if not exists base_currency text  default 'RON';
alter table company add column if not exists fiscal        jsonb default '{}'::jsonb;
alter table company add column if not exists icp           jsonb default '{}'::jsonb;

/* ---- accounts ----------------------------------------------------------- */
alter table accounts add column if not exists referred_by text default '';
alter table accounts add column if not exists testimonial text default '';

/* ---- suppliers ---------------------------------------------------------- */
alter table suppliers add column if not exists quality       text default '';
alter table suppliers add column if not exists communication text default '';
alter table suppliers add column if not exists price         text default '';
alter table suppliers add column if not exists capabilities  text default '';

/* ---- projects ----------------------------------------------------------- */
alter table projects add column if not exists files    jsonb default '{}'::jsonb;
alter table projects add column if not exists warranty jsonb default '{}'::jsonb;

/* ---- content (marketing calendar) --------------------------------------- */
create table if not exists content (
  id         text primary key,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  title      text default '',
  channel    text default '',
  status     text default 'idea',
  date       date,
  link       text default '',
  notes      text default '',
  project_id text,
  created_at timestamptz not null default now()
);
alter table content enable row level security;
drop policy if exists content_owner on content;
create policy content_owner on content
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

/* ---- invoices ----------------------------------------------------------- */
create table if not exists invoices (
  id         text primary key,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  number     text default '',
  series     text default '',
  kind       text default 'Factură',
  status     text default 'draft',
  account_id text,
  project_id text,
  currency   text default 'RON',
  issue_date date,
  due_date   date,
  paid_date  date,
  notes      text default '',
  lines      jsonb default '[]'::jsonb,
  buyer      jsonb default '{}'::jsonb,
  seller     jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table invoices enable row level security;
drop policy if exists invoices_owner on invoices;
create policy invoices_owner on invoices
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

/* ---- outbound engine ----------------------------------------------------- */
create table if not exists prospects (
  id          text primary key,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text default '',
  org         text default '',
  role        text default '',
  segment     text default '',
  city        text default '',
  market      text default 'RO',
  lang        text default 'EN',
  channel     text default 'Email',
  email       text default '',
  phone       text default '',
  signal      text default '',
  source_url  text default '',
  status      text default 'Not Contacted',
  notes       text default '',
  account_id  text,
  created_at  date,
  touches     jsonb default '[]'::jsonb,
  drafts      jsonb default '[]'::jsonb,
  prospector  jsonb
);
alter table prospects enable row level security;
drop policy if exists prospects_owner on prospects;
create policy prospects_owner on prospects
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists discovery_candidates (
  id           text primary key,
  owner_id     uuid not null references auth.users(id) on delete cascade,
  org          text default '',
  segment      text default '',
  city         text default '',
  market       text default 'RO',
  signal       text default '',
  signal_type  text default 'other',
  source_url   text default '',
  contact_hint text default '',
  rationale    text default '',
  status       text default 'pending',
  created_at   date,
  source       text default 'discovery',
  score        numeric,
  prospector   jsonb
);
alter table discovery_candidates enable row level security;
drop policy if exists discovery_candidates_owner on discovery_candidates;
create policy discovery_candidates_owner on discovery_candidates
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

/* ---- client portal + public collection ----------------------------------- */
create table if not exists shares (
  id         text primary key,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  project_id text,
  title      text default '',
  client     text default '',
  payload    jsonb not null,
  approval   jsonb,
  revoked    boolean not null default false,
  created_at timestamptz not null default now()
);
alter table shares enable row level security;
drop policy if exists shares_owner on shares;
create policy shares_owner on shares
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists collection (
  id         text primary key,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  project_id text,
  payload    jsonb not null,
  rank       int not null default 0,
  revoked    boolean not null default false,
  created_at timestamptz not null default now()
);
alter table collection enable row level security;
drop policy if exists collection_owner on collection;
create policy collection_owner on collection
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists inquiries (
  id         text primary key default gen_random_uuid()::text,
  owner_id   uuid not null,
  name       text default '',
  email      text default '',
  message    text default '',
  source     text default 'Website',
  status     text default 'new',
  created_at timestamptz not null default now()
);
alter table inquiries enable row level security;
drop policy if exists inquiries_owner on inquiries;
create policy inquiries_owner on inquiries
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
