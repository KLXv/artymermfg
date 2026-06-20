-- Brand identity on the company singleton, used on the factory-document
-- letterhead (production spec / contract terms / QC sign-off PDFs):
--   • logo        — public URL of the uploaded brand logo (attachments bucket)
--   • letterhead  — free-text contact block shown under the brand name
-- Idempotent: safe to run on any existing database. Without these columns the
-- company save fails once a logo/letterhead is set, so this migration is the fix.

alter table company add column if not exists logo text default '';
alter table company add column if not exists letterhead text default '';
