-- Product Studio — Supabase init (Auth profiles, billing, media, storage)
-- Run in Supabase SQL Editor, or: supabase db push

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  plan_id text not null default 'free'
    check (plan_id in ('free', 'starter', 'pro', 'enterprise')),
  -- null tokens = unlimited (enterprise)
  tokens integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);

-- ---------------------------------------------------------------------------
-- Transactions (Razorpay / plan purchases)
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  txn_code text not null unique,
  plan_id text not null check (plan_id in ('free', 'starter', 'pro', 'enterprise')),
  billing text not null default 'monthly' check (billing in ('monthly', 'annual')),
  amount_label text,
  status text not null check (status in ('success', 'failed', 'pending')),
  razorpay_order_id text,
  razorpay_payment_id text,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists transactions_txn_code_idx on public.transactions (txn_code);

-- ---------------------------------------------------------------------------
-- Media assets (Storage object metadata)
-- ---------------------------------------------------------------------------
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  bucket text not null,
  path text not null,
  mime_type text,
  kind text not null check (kind in ('product', 'atmosphere', 'video', 'other')),
  public_url text,
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

create index if not exists media_assets_user_id_idx on public.media_assets (user_id);

-- ---------------------------------------------------------------------------
-- Updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
begin
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(new.email, '@', 1),
    'Creator'
  );

  insert into public.profiles (id, email, name, plan_id, tokens)
  values (
    new.id,
    lower(new.email),
    display_name,
    'free',
    30
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(nullif(profiles.name, ''), excluded.name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Token allotments
-- ---------------------------------------------------------------------------
create or replace function public.plan_token_allotment(p_plan text)
returns integer
language sql
immutable
as $$
  select case p_plan
    when 'free' then 30
    when 'starter' then 1000
    when 'pro' then 4500
    when 'enterprise' then null
    else 30
  end;
$$;

-- ---------------------------------------------------------------------------
-- Consume tokens (atomic). Returns updated profile row.
-- Raises 'insufficient_tokens' when balance too low.
-- ---------------------------------------------------------------------------
create or replace function public.consume_tokens(p_cost integer default 10)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if p_cost is null or p_cost < 0 then
    raise exception 'invalid_cost';
  end if;

  select * into row from public.profiles where id = auth.uid() for update;
  if not found then
    raise exception 'profile_not_found';
  end if;

  -- unlimited
  if row.tokens is null then
    return row;
  end if;

  if row.tokens < p_cost then
    raise exception 'insufficient_tokens';
  end if;

  update public.profiles
  set tokens = row.tokens - p_cost
  where id = auth.uid()
  returning * into row;

  return row;
end;
$$;

revoke all on function public.consume_tokens(integer) from public;
grant execute on function public.consume_tokens(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Apply plan (service role / backend only — do not grant to authenticated)
-- ---------------------------------------------------------------------------
create or replace function public.apply_plan(p_user_id uuid, p_plan_id text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.profiles;
  normalized text;
begin
  normalized := case
    when p_plan_id in ('starter', 'pro', 'enterprise') then p_plan_id
    else 'free'
  end;

  update public.profiles
  set
    plan_id = normalized,
    tokens = public.plan_token_allotment(normalized)
  where id = p_user_id
  returning * into row;

  if not found then
    raise exception 'profile_not_found';
  end if;

  return row;
end;
$$;

revoke all on function public.apply_plan(uuid, text) from public;
-- intentionally NOT granted to authenticated / anon

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.media_assets enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_update_own_name" on public.profiles;
create policy "profiles_update_own_name"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and plan_id = (select p.plan_id from public.profiles p where p.id = auth.uid())
    and tokens is not distinct from (select p.tokens from public.profiles p where p.id = auth.uid())
  );

-- Hard stop: clients cannot mutate plan/tokens even if a policy is loosened later
create or replace function public.protect_profile_billing_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if (new.plan_id is distinct from old.plan_id or new.tokens is distinct from old.tokens)
       and coalesce(auth.role(), '') <> 'service_role' then
      -- allow security-definer RPCs running as the function owner (postgres) /
      -- and block direct authenticated updates
      if current_user not in ('postgres', 'supabase_admin')
         and coalesce(auth.jwt() ->> 'role', '') = 'authenticated' then
        raise exception 'plan_id and tokens are read-only for clients';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_billing on public.profiles;
create trigger protect_profile_billing
  before update on public.profiles
  for each row execute function public.protect_profile_billing_fields();

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own"
  on public.transactions for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own"
  on public.transactions for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "media_select_own" on public.media_assets;
create policy "media_select_own"
  on public.media_assets for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "media_insert_own" on public.media_assets;
create policy "media_insert_own"
  on public.media_assets for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "media_delete_own" on public.media_assets;
create policy "media_delete_own"
  on public.media_assets for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'product-uploads',
    'product-uploads',
    false,
    10485760,
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
  ),
  (
    'atmosphere-uploads',
    'atmosphere-uploads',
    false,
    10485760,
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
  ),
  (
    'generated-videos',
    'generated-videos',
    false,
    104857600,
    array['video/mp4', 'video/webm', 'video/quicktime']
  )
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies: users own files under {user_id}/...
drop policy if exists "product_uploads_select_own" on storage.objects;
create policy "product_uploads_select_own"
  on storage.objects for select to authenticated
  using (bucket_id = 'product-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "product_uploads_insert_own" on storage.objects;
create policy "product_uploads_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "product_uploads_update_own" on storage.objects;
create policy "product_uploads_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "product_uploads_delete_own" on storage.objects;
create policy "product_uploads_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "atmosphere_uploads_select_own" on storage.objects;
create policy "atmosphere_uploads_select_own"
  on storage.objects for select to authenticated
  using (bucket_id = 'atmosphere-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "atmosphere_uploads_insert_own" on storage.objects;
create policy "atmosphere_uploads_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'atmosphere-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "atmosphere_uploads_update_own" on storage.objects;
create policy "atmosphere_uploads_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'atmosphere-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "atmosphere_uploads_delete_own" on storage.objects;
create policy "atmosphere_uploads_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'atmosphere-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "generated_videos_select_own" on storage.objects;
create policy "generated_videos_select_own"
  on storage.objects for select to authenticated
  using (bucket_id = 'generated-videos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "generated_videos_insert_own" on storage.objects;
create policy "generated_videos_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'generated-videos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "generated_videos_update_own" on storage.objects;
create policy "generated_videos_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'generated-videos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "generated_videos_delete_own" on storage.objects;
create policy "generated_videos_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'generated-videos' and (storage.foldername(name))[1] = auth.uid()::text);
