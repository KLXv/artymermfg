-- Home/base currency for the cockpit (the currency every figure is kept and
-- shown in). Defaults to RON. Idempotent.

alter table company add column if not exists base_currency text default 'RON';
