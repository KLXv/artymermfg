-- Client portal — published dossiers with client approval capture.
--
-- A share row holds a dossier snapshot under a random token. The public /share
-- page reads it and submits the client's approval through two SECURITY DEFINER
-- functions, so the anon role never touches the table directly (no enumeration,
-- no leakage) — it can only read/sign the one row whose token it already has.

create table if not exists shares (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id text,
  title text default '',
  client text default '',
  payload jsonb not null,
  approval jsonb,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table shares enable row level security;

-- The owner manages their own shares; nobody else gets direct table access.
drop policy if exists shares_owner on shares;
create policy shares_owner on shares
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Public read of a single share by token (skips revoked).
create or replace function get_share(token text)
returns jsonb language sql security definer set search_path = public as $$
  select case
    when s.revoked then null
    else jsonb_build_object('payload', s.payload, 'approval', s.approval, 'title', s.title, 'client', s.client)
  end
  from shares s
  where s.id = token;
$$;

-- Public approval submission by token (writes only the approval column).
create or replace function submit_share_approval(token text, decision text, signer text, note text)
returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if decision not in ('approved', 'changes') then
    return false;
  end if;
  update shares
     set approval = jsonb_build_object('decision', decision, 'signer', signer, 'note', note, 'at', now())
   where id = token and revoked = false
   returning true into ok;
  return coalesce(ok, false);
end;
$$;

grant execute on function get_share(text) to anon, authenticated;
grant execute on function submit_share_approval(text, text, text, text) to anon, authenticated;
