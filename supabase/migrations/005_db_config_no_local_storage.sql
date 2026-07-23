-- Move config + client drafts off local/session storage into Postgres

-- ---------------------------------------------------------------------------
-- Countries: fiscal fields (replaces hardcoded taxCurrency map)
-- ---------------------------------------------------------------------------
alter table public.countries
  add column if not exists currency_symbol text not null default '',
  add column if not exists tax_rate numeric(8, 4) not null default 0,
  add column if not exists tax_label text not null default 'Tax',
  add column if not exists is_billing boolean not null default true;

-- Seed fiscal by country name (idempotent updates)
update public.countries set currency_symbol = '₹', tax_rate = 0.18, tax_label = 'GST' where name = 'India';
update public.countries set currency_symbol = '$', tax_rate = 0, tax_label = 'Sales tax' where name = 'United States';
update public.countries set currency_symbol = '£', tax_rate = 0.20, tax_label = 'VAT' where name = 'United Kingdom';
update public.countries set currency_symbol = 'AED ', tax_rate = 0.05, tax_label = 'VAT' where name = 'United Arab Emirates';
update public.countries set currency_symbol = 'SAR ', tax_rate = 0.15, tax_label = 'VAT' where name = 'Saudi Arabia';
update public.countries set currency_symbol = 'QAR ', tax_rate = 0, tax_label = 'VAT' where name = 'Qatar';
update public.countries set currency_symbol = 'KWD ', tax_rate = 0, tax_label = 'VAT' where name = 'Kuwait';
update public.countries set currency_symbol = 'BHD ', tax_rate = 0.10, tax_label = 'VAT' where name = 'Bahrain';
update public.countries set currency_symbol = 'OMR ', tax_rate = 0.05, tax_label = 'VAT' where name = 'Oman';
update public.countries set currency_symbol = '€', tax_rate = 0.19, tax_label = 'VAT' where name = 'Germany';
update public.countries set currency_symbol = '€', tax_rate = 0.20, tax_label = 'VAT' where name = 'France';
update public.countries set currency_symbol = '€', tax_rate = 0.22, tax_label = 'VAT' where name = 'Italy';
update public.countries set currency_symbol = '€', tax_rate = 0.21, tax_label = 'VAT' where name = 'Spain';
update public.countries set currency_symbol = '€', tax_rate = 0.21, tax_label = 'VAT' where name = 'Netherlands';
update public.countries set currency_symbol = '€', tax_rate = 0.23, tax_label = 'VAT' where name = 'Ireland';
update public.countries set currency_symbol = '€', tax_rate = 0.21, tax_label = 'VAT' where name = 'Belgium';
update public.countries set currency_symbol = '€', tax_rate = 0.20, tax_label = 'VAT' where name = 'Austria';
update public.countries set currency_symbol = '€', tax_rate = 0.23, tax_label = 'VAT' where name = 'Portugal';
update public.countries set currency_symbol = '€', tax_rate = 0.255, tax_label = 'VAT' where name = 'Finland';
update public.countries set currency_symbol = '€', tax_rate = 0.24, tax_label = 'VAT' where name = 'Greece';
update public.countries set currency_symbol = 'zł ', tax_rate = 0.23, tax_label = 'VAT' where name = 'Poland';
update public.countries set currency_symbol = 'Kč ', tax_rate = 0.21, tax_label = 'VAT' where name = 'Czech Republic';
update public.countries set currency_symbol = 'Ft ', tax_rate = 0.27, tax_label = 'VAT' where name = 'Hungary';
update public.countries set currency_symbol = 'lei ', tax_rate = 0.19, tax_label = 'VAT' where name = 'Romania';
update public.countries set currency_symbol = 'лв ', tax_rate = 0.20, tax_label = 'VAT' where name = 'Bulgaria';
update public.countries set currency_symbol = '€', tax_rate = 0.25, tax_label = 'VAT' where name = 'Croatia';
update public.countries set currency_symbol = 'SEK ', tax_rate = 0.25, tax_label = 'VAT' where name = 'Sweden';
update public.countries set currency_symbol = 'NOK ', tax_rate = 0.25, tax_label = 'VAT' where name = 'Norway';
update public.countries set currency_symbol = 'DKK ', tax_rate = 0.25, tax_label = 'VAT' where name = 'Denmark';
update public.countries set currency_symbol = 'CHF ', tax_rate = 0.081, tax_label = 'VAT' where name = 'Switzerland';
update public.countries set currency_symbol = 'CA$', tax_rate = 0.05, tax_label = 'GST' where name = 'Canada';
update public.countries set currency_symbol = 'A$', tax_rate = 0.10, tax_label = 'GST' where name = 'Australia';
update public.countries set currency_symbol = 'NZ$', tax_rate = 0.15, tax_label = 'GST' where name = 'New Zealand';
update public.countries set currency_symbol = 'S$', tax_rate = 0.09, tax_label = 'GST' where name = 'Singapore';
update public.countries set currency_symbol = 'HK$', tax_rate = 0, tax_label = 'Tax' where name = 'Hong Kong';
update public.countries set currency_symbol = '¥', tax_rate = 0.10, tax_label = 'Consumption tax' where name = 'Japan';
update public.countries set currency_symbol = '₩', tax_rate = 0.10, tax_label = 'VAT' where name = 'South Korea';
update public.countries set currency_symbol = '¥', tax_rate = 0.06, tax_label = 'VAT' where name = 'China';
update public.countries set currency_symbol = 'RM ', tax_rate = 0.08, tax_label = 'SST' where name = 'Malaysia';
update public.countries set currency_symbol = 'Rp ', tax_rate = 0.11, tax_label = 'VAT' where name = 'Indonesia';
update public.countries set currency_symbol = '฿', tax_rate = 0.07, tax_label = 'VAT' where name = 'Thailand';
update public.countries set currency_symbol = '₱', tax_rate = 0.12, tax_label = 'VAT' where name = 'Philippines';
update public.countries set currency_symbol = '₫', tax_rate = 0.10, tax_label = 'VAT' where name = 'Vietnam';
update public.countries set currency_symbol = 'E£', tax_rate = 0.14, tax_label = 'VAT' where name = 'Egypt';
update public.countries set currency_symbol = 'R ', tax_rate = 0.15, tax_label = 'VAT' where name = 'South Africa';
update public.countries set currency_symbol = '₺', tax_rate = 0.20, tax_label = 'VAT' where name = 'Turkey';
update public.countries set currency_symbol = '₪', tax_rate = 0.17, tax_label = 'VAT' where name = 'Israel';
update public.countries set currency_symbol = 'R$', tax_rate = 0, tax_label = 'Tax' where name = 'Brazil';
update public.countries set currency_symbol = 'MX$', tax_rate = 0.16, tax_label = 'IVA' where name = 'Mexico';

-- Default symbol from currency when empty
update public.countries
set currency_symbol = trim(currency_code) || ' '
where coalesce(currency_symbol, '') = '';

-- ---------------------------------------------------------------------------
-- App catalog settings (plans + tokens) — replaces hardcoded plans.ts / tokens.ts
-- ---------------------------------------------------------------------------
insert into public.app_settings (key, value, updated_at)
values (
  'app_catalog',
  '{
    "base_currency": "USD",
    "tokens_per_generation": 10,
    "max_product_images": 1,
    "annual_multiplier": 10,
    "token_allotments": {
      "free": 30,
      "starter": 1000,
      "pro": 4500,
      "enterprise": null
    },
    "plans": [
      {
        "id": "starter",
        "name": "Starter",
        "monthlyPrice": 3,
        "tagline": "Best for trying Product Studio",
        "tokens": "1,000 tokens",
        "duration": "30 days",
        "features": ["1,000 generation tokens", "30-day access window", "Standard render quality", "Email support"],
        "icon": "circle"
      },
      {
        "id": "pro",
        "name": "Pro",
        "monthlyPrice": 10,
        "tagline": "Most popular plan",
        "tokens": "4,500 tokens",
        "duration": "30 days",
        "features": ["4,500 generation tokens", "30-day access window", "Priority render queue", "HD video exports", "Chat support"],
        "popular": true,
        "icon": "triangle"
      },
      {
        "id": "enterprise",
        "name": "Enterprise",
        "monthlyPrice": 50,
        "tagline": "Best for growing brands",
        "tokens": "Unlimited tokens",
        "duration": "30 days",
        "features": ["Unlimited generation tokens", "30-day access window", "Highest priority queue", "Team-ready workflow", "Dedicated support"],
        "icon": "hex"
      }
    ]
  }'::jsonb,
  now()
)
on conflict (key) do update
  set value = excluded.value,
      updated_at = now();

-- Keep base_pricing_usd in sync shape
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
    "annual_multiplier": 10,
    "tokens_per_generation": 10
  }'::jsonb,
  now()
)
on conflict (key) do update
  set value = excluded.value,
      updated_at = now();

-- ---------------------------------------------------------------------------
-- Checkout drafts (replaces sessionStorage ps_checkout_draft)
-- ---------------------------------------------------------------------------
create table if not exists public.checkout_drafts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plan_id text not null,
  billing text not null check (billing in ('monthly', 'annual')),
  address jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.checkout_drafts enable row level security;

drop policy if exists "checkout_drafts_select_own" on public.checkout_drafts;
create policy "checkout_drafts_select_own"
  on public.checkout_drafts for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "checkout_drafts_upsert_own" on public.checkout_drafts;
create policy "checkout_drafts_insert_own"
  on public.checkout_drafts for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "checkout_drafts_update_own" on public.checkout_drafts;
create policy "checkout_drafts_update_own"
  on public.checkout_drafts for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "checkout_drafts_delete_own" on public.checkout_drafts;
create policy "checkout_drafts_delete_own"
  on public.checkout_drafts for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.checkout_drafts to authenticated;
grant all on public.checkout_drafts to service_role;

-- ---------------------------------------------------------------------------
-- Auth pending flows (replaces sessionStorage pending signup/reset)
-- ---------------------------------------------------------------------------
create table if not exists public.auth_pending (
  email text not null,
  kind text not null check (kind in ('signup', 'reset')),
  name text,
  otp_verified boolean not null default false,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (email, kind)
);

alter table public.auth_pending enable row level security;
-- No direct table access for anon/authenticated — only via RPCs below

create or replace function public.upsert_auth_pending(
  p_email text,
  p_kind text,
  p_name text default null,
  p_otp_verified boolean default false,
  p_ttl_minutes integer default 10
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('signup', 'reset') then
    raise exception 'invalid_kind';
  end if;
  insert into public.auth_pending (email, kind, name, otp_verified, expires_at, updated_at)
  values (
    lower(trim(p_email)),
    p_kind,
    nullif(trim(coalesce(p_name, '')), ''),
    coalesce(p_otp_verified, false),
    now() + make_interval(mins => greatest(1, coalesce(p_ttl_minutes, 10))),
    now()
  )
  on conflict (email, kind) do update
    set name = coalesce(excluded.name, public.auth_pending.name),
        otp_verified = excluded.otp_verified,
        expires_at = excluded.expires_at,
        updated_at = now();
end;
$$;

create or replace function public.get_auth_pending(p_email text, p_kind text)
returns table (
  email text,
  kind text,
  name text,
  otp_verified boolean,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select a.email, a.kind, a.name, a.otp_verified, a.expires_at
  from public.auth_pending a
  where a.email = lower(trim(p_email))
    and a.kind = p_kind
    and a.expires_at > now();
end;
$$;

create or replace function public.clear_auth_pending(p_email text, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.auth_pending
  where email = lower(trim(p_email)) and kind = p_kind;
end;
$$;

revoke all on function public.upsert_auth_pending(text, text, text, boolean, integer) from public;
revoke all on function public.get_auth_pending(text, text) from public;
revoke all on function public.clear_auth_pending(text, text) from public;
grant execute on function public.upsert_auth_pending(text, text, text, boolean, integer) to anon, authenticated;
grant execute on function public.get_auth_pending(text, text) to anon, authenticated;
grant execute on function public.clear_auth_pending(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Studio presets (replaces hardcoded PRODUCTS / ATMOSPHERES)
-- ---------------------------------------------------------------------------
create table if not exists public.studio_presets (
  id text primary key,
  kind text not null check (kind in ('product', 'atmosphere')),
  label text not null,
  prompt text not null,
  description text not null,
  sort_order integer not null default 0
);

alter table public.studio_presets enable row level security;

drop policy if exists "studio_presets_public_read" on public.studio_presets;
create policy "studio_presets_public_read"
  on public.studio_presets for select
  to anon, authenticated
  using (true);

-- plan_token_allotment reads from app_catalog (no hardcoded allotments)
create or replace function public.plan_token_allotment(p_plan text)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  allotment jsonb;
begin
  select value -> 'token_allotments' -> p_plan into allotment
  from public.app_settings
  where key = 'app_catalog';

  -- Missing catalog or key
  if allotment is null then
    raise exception 'token_allotment_missing';
  end if;

  -- Explicit JSON null = unlimited
  if jsonb_typeof(allotment) = 'null' then
    return null;
  end if;

  return (allotment #>> '{}')::integer;
end;
$$;


insert into public.studio_presets (id, kind, label, prompt, description, sort_order) values
  ('mug', 'product', 'Artisan Mug',
   'An elegant artisan ceramic mug with a gradient glaze and a large perfectly round handle, studio product photography',
   'Artisan ceramic mug with a gradient glaze featuring a large, perfectly round, thick handle.', 1),
  ('colorful_mug', 'product', 'Colorful Mug',
   'A vibrant colorful hand-painted ceramic coffee mug on a clean surface, studio product photography',
   'A vibrant colorful hand-painted ceramic coffee mug.', 2),
  ('perfume', 'product', 'Perfume Bottle',
   'A luxury ornate glass perfume bottle with sodalite and malachite minerals, studio product photography',
   'A bottle of perfume called ''Nerelle''. The ornate bottle features real stone minerals, sodalite, and malachite.', 3),
  ('sneaker', 'product', 'Running Sneaker',
   'A premium luxury running sneaker with a sculptural modular sole, suede and mesh panels, studio product photography',
   'Premium luxury running sneakers. Sculptural modular sole and an upper made out of suede nubuck leather and mesh sculptural panels.', 4),
  ('marble_plinth', 'atmosphere', 'Marble Plinth',
   'A pristine Carrara marble plinth resting against a soft sage green backdrop, warm directional sunlight with soft shadows',
   'Minimalist craft luxury. A pristine Carrara marble plinth rests against a soft sage backdrop. Crisp directional sunlight casts soft shadows, creating an earthy yet elevated aesthetic. The {product_id} is seen in perfect detail, conveying texture, calm, and sophisticated gradients.', 1),
  ('travertine', 'atmosphere', 'Travertine Blocks',
   'Warm porous travertine blocks under a brilliant azure sky with soft dappled leaf shadows',
   'Mediterranean, modern luxury. Warm, porous travertine blocks create a structured geometric podium beneath a brilliant azure sky, presenting the {product_id} perfectly. Soft dappled leaf shadows contrast the sharp architectural lines, evoking a serene, sun-drenched coastal escape.', 2),
  ('plaster_corner', 'atmosphere', 'Plaster Corner',
   'Warm sun-drenched polished plaster corner with soft rose-tinted floor and crisp palm frond silhouettes',
   'Mediterranean minimalism utilizing a warm sun-drenched, polished plaster corner with a soft rose-tinted floor. Crisp palm frond silhouettes cast dramatic yet serene shadows evoking a premium organic golden-hour mood.', 3)
on conflict (id) do update
  set label = excluded.label,
      prompt = excluded.prompt,
      description = excluded.description,
      sort_order = excluded.sort_order,
      kind = excluded.kind;
