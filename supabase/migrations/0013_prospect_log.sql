-- The prospect contact log: what you actually did, and what came back.
--
-- `touches` records *when* each step of the 5-touch sequence went out. This
-- records the substance — the call, the reply, the meeting — so a conversation
-- picked back up weeks later still has its history. Idempotent.

alter table prospects add column if not exists log jsonb default '[]'::jsonb;
