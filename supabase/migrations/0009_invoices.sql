-- Official invoicing: the company's legal/fiscal identity + the invoices table.
-- Idempotent.

-- Fiscal identity (CUI/CIF, Reg. Com., IBAN, VAT status, invoice series) as one
-- JSONB blob on the company singleton.
alter table company add column if not exists fiscal jsonb default '{}'::jsonb;

create table if not exists invoices (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  number text default '',
  series text default '',
  kind text default 'Factură',
  status text default 'draft',
  account_id text,
  project_id text,
  currency text default 'RON',
  issue_date date,
  due_date date,
  paid_date date,
  notes text default '',
  lines jsonb default '[]'::jsonb,
  buyer jsonb default '{}'::jsonb,
  seller jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table invoices enable row level security;

drop policy if exists invoices_owner on invoices;
create policy invoices_owner on invoices
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
