-- Artymer Cockpit — initial schema.
-- Six entities: company (singleton) · accounts · suppliers · projects · tasks · expenses.
--
-- Hybrid model: fields that are queried or used in derivations are columns;
-- the deep specification, presentation, images, costs and QC live in JSONB.
-- This keeps derivations fast and the schema maintainable without a ~80-column
-- projects table. See DECISIONS.md.
--
-- Single user, but every row is owned and RLS-gated to auth.uid() so the model
-- is correct from day one (Phase 5 just wires the login).

-- ---------- company (singleton per owner) ----------------------------------
create table if not exists company (
  id              text primary key default 'company',
  owner_id        uuid not null references auth.users (id) on delete cascade,
  brand           text default 'Artymer',
  fx              jsonb default '{"RON":0.20,"USD":0.92}'::jsonb,
  deposit         text,
  lot_fail        text,
  rework          text,
  window          text,
  buffer_weeks    text,
  weekly_outreach text,
  monthly_revenue text,
  migrated        boolean default false,
  updated_at      timestamptz default now(),
  unique (owner_id)
);

-- ---------- accounts (lead → client → repeat) -------------------------------
create table if not exists accounts (
  id            text primary key,
  owner_id      uuid not null references auth.users (id) on delete cascade,
  name          text,
  type          text,
  service_path  text,
  status        text,
  market        text,
  contact_name  text,
  contact_role  text,
  email         text,
  phone         text,
  source        text,
  notes         text,
  testimonial   text,
  last_contact  date,
  next_action   text,
  next_date     date,
  created_at    timestamptz default now()
);
create index if not exists accounts_owner_idx on accounts (owner_id);

-- ---------- suppliers -------------------------------------------------------
create table if not exists suppliers (
  id             text primary key,
  owner_id       uuid not null references auth.users (id) on delete cascade,
  name           text,
  status         text,
  platform       text,
  lead_time      text,
  moq            text,
  contact        text,
  golden_samples text,
  notes          text,
  created_at     timestamptz default now()
);
create index if not exists suppliers_owner_idx on suppliers (owner_id);

-- ---------- projects --------------------------------------------------------
create table if not exists projects (
  id               text primary key,
  owner_id         uuid not null references auth.users (id) on delete cascade,
  account_id       text references accounts (id) on delete set null,
  supplier_id      text references suppliers (id) on delete set null,
  name             text,
  service_path     text,
  stage            text,
  lost             boolean default false,
  qty              text,
  unit_price       text,
  currency         text,
  deadline         date,
  deposit_expected date,
  balance_expected date,
  rev              text,
  maker            text,
  deposit_paid     boolean default false,
  deposit_date     date,
  balance_paid     boolean default false,
  balance_date     date,
  -- commercial overrides (blank = inherit company)
  controls         jsonb default '{}'::jsonb,   -- {deposit, lotFail, rework, window}
  spec             jsonb default '{}'::jsonb,    -- case · movement · crystal · dial · texture · markers · engraving · tolerances
  presentation     jsonb default '{}'::jsonb,    -- {pieceName, edition, story, highlights, lang, colors}
  images           jsonb default '{}'::jsonb,    -- {hero, dial, caseImg, back, clientLogo} → Storage URLs
  costs            jsonb default '{}'::jsonb,    -- tooling + per-unit cost lines
  qc               jsonb default '{"received":false,"results":{},"signed":false,"signedDate":""}'::jsonb,
  schema_v         int default 3,
  created_at       timestamptz default now()
);
create index if not exists projects_owner_idx on projects (owner_id);
create index if not exists projects_account_idx on projects (account_id);
create index if not exists projects_stage_idx on projects (stage);

-- ---------- tasks -----------------------------------------------------------
create table if not exists tasks (
  id         text primary key,
  owner_id   uuid not null references auth.users (id) on delete cascade,
  title      text,
  due        date,
  done       boolean default false,
  link_type  text,
  link_id    text,
  source     text,
  created_at timestamptz default now()
);
create index if not exists tasks_owner_idx on tasks (owner_id);

-- ---------- expenses (promoted from the single array blob) ------------------
create table if not exists expenses (
  id         text primary key,
  owner_id   uuid not null references auth.users (id) on delete cascade,
  label      text,
  amount     text,
  created_at timestamptz default now()
);
create index if not exists expenses_owner_idx on expenses (owner_id);

-- ---------- row-level security ---------------------------------------------
-- Every table: an owner only ever sees and writes their own rows.
alter table company   enable row level security;
alter table accounts  enable row level security;
alter table suppliers enable row level security;
alter table projects  enable row level security;
alter table tasks     enable row level security;
alter table expenses  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['company','accounts','suppliers','projects','tasks','expenses']
  loop
    execute format('drop policy if exists %1$s_owner_all on %1$s;', t);
    execute format(
      'create policy %1$s_owner_all on %1$s for all
         using (owner_id = auth.uid())
         with check (owner_id = auth.uid());', t);
  end loop;
end $$;

-- ---------- storage bucket for project images -------------------------------
-- Replaces the base64 uploads in the original. Created via the dashboard or:
--   insert into storage.buckets (id, name, public) values ('project-images','project-images', true)
--   on conflict (id) do nothing;
