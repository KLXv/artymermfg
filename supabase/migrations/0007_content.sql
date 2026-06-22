-- Marketing content calendar — posts/campaigns across channels. Owner-scoped
-- like the rest of the workspace. Idempotent.

create table if not exists content (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text default '',
  channel text default '',
  status text default 'idea',
  date date,
  link text default '',
  notes text default '',
  project_id text,
  created_at timestamptz not null default now()
);

alter table content enable row level security;

drop policy if exists content_owner on content;
create policy content_owner on content
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
