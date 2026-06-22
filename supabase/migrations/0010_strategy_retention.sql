-- Strategy & retention: warranty/after-sales record per piece, and referral
-- attribution on clients. Idempotent.

alter table projects add column if not exists warranty jsonb default '{}'::jsonb;
alter table accounts add column if not exists referred_by text default '';
