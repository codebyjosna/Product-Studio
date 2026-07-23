import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRENCY_COUNTRY } from './currencyCountryMap.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rates = JSON.parse(fs.readFileSync(path.join(__dirname, 'usd-rates-seed.json'), 'utf8'));

const esc = (s) => String(s).replace(/'/g, "''");

const rows = [];
for (const [currency, rate] of Object.entries(rates)) {
  const meta = CURRENCY_COUNTRY[currency];
  if (!meta) {
    console.warn('Missing map for', currency);
    continue;
  }
  const [name, a2, a3] = meta;
  rows.push(
    `  ('${esc(name)}', '${a2}', '${a3}', '${currency}', ${Number(rate)}, now(), now())`
  );
}

// Extra EUR countries sharing EUR rate (common checkout countries)
const eurRate = rates.EUR;
const eurExtras = [
  ['France', 'FR', 'FRA'],
  ['Italy', 'IT', 'ITA'],
  ['Spain', 'ES', 'ESP'],
  ['Netherlands', 'NL', 'NLD'],
  ['Ireland', 'IE', 'IRL'],
  ['Belgium', 'BE', 'BEL'],
  ['Austria', 'AT', 'AUT'],
  ['Portugal', 'PT', 'PRT'],
  ['Finland', 'FI', 'FIN'],
  ['Greece', 'GR', 'GRC'],
];
for (const [name, a2, a3] of eurExtras) {
  rows.push(
    `  ('${esc(name)}', '${a2}', '${a3}', 'EUR', ${Number(eurRate)}, now(), now())`
  );
}

const sql = `-- Auto-generated seed — countries + USD FX rates
-- Base currency: USD

create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code_alpha2 char(2) not null,
  code_alpha3 char(3) not null,
  currency_code char(3) not null,
  fx_rate numeric(24, 8) not null default 1,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists countries_currency_alpha2_uidx
  on public.countries (currency_code, code_alpha2);

create index if not exists countries_currency_code_idx on public.countries (currency_code);
create index if not exists countries_name_idx on public.countries (name);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- App base pricing in USD
insert into public.app_settings (key, value, updated_at)
values (
  'base_pricing_usd',
  '{
    "base_currency": "USD",
    "plans": {
      "free": { "monthly": 0 },
      "starter": { "monthly": 3 },
      "pro": { "monthly": 10 },
      "enterprise": { "monthly": 50 }
    },
    "annual_multiplier": 10
  }'::jsonb,
  now()
)
on conflict (key) do update
  set value = excluded.value,
      updated_at = now();

insert into public.app_settings (key, value, updated_at)
values (
  'fx_meta',
  '{
    "base_code": "USD",
    "provider": "exchangerate-api",
    "last_update_utc": "Thu, 23 Jul 2026 00:00:01 +0000"
  }'::jsonb,
  now()
)
on conflict (key) do update
  set value = excluded.value,
      updated_at = now();

alter table public.countries enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "countries_public_read" on public.countries;
create policy "countries_public_read"
  on public.countries for select
  to anon, authenticated
  using (true);

drop policy if exists "app_settings_public_read" on public.app_settings;
create policy "app_settings_public_read"
  on public.app_settings for select
  to anon, authenticated
  using (true);

-- Seed / upsert countries
insert into public.countries (name, code_alpha2, code_alpha3, currency_code, fx_rate, updated_at, created_at)
values
${rows.join(',\n')}
on conflict (currency_code, code_alpha2) do update
  set name = excluded.name,
      code_alpha3 = excluded.code_alpha3,
      fx_rate = excluded.fx_rate,
      updated_at = now();
`;

const out = path.join(__dirname, '..', 'supabase', 'migrations', '002_countries_fx.sql');
fs.writeFileSync(out, sql);
console.log('Wrote', out, 'rows:', rows.length);
