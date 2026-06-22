-- Public presence: a brand Collection (portfolio of featured pieces) and an
-- inquiry inbox. The public /collection page reads + submits only through two
-- SECURITY DEFINER functions, so the anon role never touches the tables.

-- Featured pieces (snapshots, like shares but for the public portfolio).
create table if not exists collection (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id text,
  payload jsonb not null,
  rank int not null default 0,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
alter table collection enable row level security;
drop policy if exists collection_owner on collection;
create policy collection_owner on collection
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Inbound inquiries from the public page.
create table if not exists inquiries (
  id text primary key default gen_random_uuid()::text,
  owner_id uuid not null,
  name text default '',
  email text default '',
  message text default '',
  source text default 'Website',
  status text default 'new',
  created_at timestamptz not null default now()
);
alter table inquiries enable row level security;
drop policy if exists inquiries_owner on inquiries;
create policy inquiries_owner on inquiries
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Public read of the brand + its featured collection.
create or replace function get_collection()
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'owner_id', c.owner_id,
    'brand', c.brand,
    'logo', c.logo,
    'items', coalesce((
      select jsonb_agg(col.payload order by col.rank, col.created_at)
      from collection col
      where col.revoked = false and col.owner_id = c.owner_id
    ), '[]'::jsonb)
  )
  from company c
  limit 1;
$$;

-- Public inquiry submission.
create or replace function submit_inquiry(owner uuid, name text, email text, message text, source text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into inquiries (owner_id, name, email, message, source, status)
  values (owner, name, email, message, coalesce(nullif(source, ''), 'Website'), 'new');
  return true;
end;
$$;

grant execute on function get_collection() to anon, authenticated;
grant execute on function submit_inquiry(uuid, text, text, text, text) to anon, authenticated;
