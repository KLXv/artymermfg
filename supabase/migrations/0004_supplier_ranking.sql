-- Supplier ranking attributes — score OEM partners by recorded traits:
--   quality / communication / price (1–5 ratings; price 5 = most competitive)
--   capabilities (comma-separated tags: dials, cases, engraving…)
-- Idempotent. Without these columns the supplier save fails once they're set.

alter table suppliers add column if not exists quality text default '';
alter table suppliers add column if not exists communication text default '';
alter table suppliers add column if not exists price text default '';
alter table suppliers add column if not exists capabilities text default '';
