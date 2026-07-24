-- 009: Production audit remediations (ERR-102–106, 113, 119–120)
-- OTP: never trust client otp_verified; atomic resend claim; presets GRANT;
-- tokens: service-role atomic consume/refund; payment unique; signup allotment from catalog

-- ---------------------------------------------------------------------------
-- ERR-113: studio_presets readable via Data API
-- ---------------------------------------------------------------------------
grant select on public.studio_presets to anon, authenticated;

-- ---------------------------------------------------------------------------
-- ERR-105: one success txn per Razorpay payment
-- ---------------------------------------------------------------------------
create unique index if not exists transactions_razorpay_payment_id_uidx
  on public.transactions (razorpay_payment_id)
  where razorpay_payment_id is not null and status = 'success';

-- ---------------------------------------------------------------------------
-- ERR-103: upsert_auth_pending — ignore client otp_verified (always false)
-- ---------------------------------------------------------------------------
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
  -- p_otp_verified is intentionally ignored (ERR-103). Clients must use
  -- mark_auth_pending_verified after a real Supabase OTP/recovery session.
  insert into public.auth_pending (email, kind, name, otp_verified, expires_at, last_sent_at, updated_at)
  values (
    lower(trim(p_email)),
    p_kind,
    nullif(trim(coalesce(p_name, '')), ''),
    false,
    now() + make_interval(mins => greatest(1, coalesce(p_ttl_minutes, 10))),
    now(),
    now()
  )
  on conflict (email, kind) do update
    set name = coalesce(excluded.name, public.auth_pending.name),
        -- Never elevate otp_verified from upsert; preserve existing verified flag.
        otp_verified = public.auth_pending.otp_verified,
        expires_at = excluded.expires_at,
        last_sent_at = now(),
        updated_at = now();
end;
$$;

-- Mark verified only when caller has an authenticated session for that email
create or replace function public.mark_auth_pending_verified(p_email text, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if p_kind not in ('signup', 'reset') then
    raise exception 'invalid_kind';
  end if;

  caller_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  if caller_email = '' or caller_email <> lower(trim(p_email)) then
    raise exception 'email_mismatch';
  end if;

  update public.auth_pending
  set otp_verified = true,
      expires_at = now() + interval '30 minutes',
      updated_at = now()
  where email = lower(trim(p_email))
    and kind = p_kind
    and expires_at > now();

  if not found then
    raise exception 'pending_not_found';
  end if;
end;
$$;

revoke all on function public.mark_auth_pending_verified(text, text) from public;
grant execute on function public.mark_auth_pending_verified(text, text) to authenticated;

-- clear_auth_pending: if authenticated, email must match; anon still allowed (cleanup)
create or replace function public.clear_auth_pending(p_email text, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text;
begin
  if p_kind not in ('signup', 'reset') then
    raise exception 'invalid_kind';
  end if;
  if auth.uid() is not null then
    caller_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
    if caller_email <> '' and caller_email <> lower(trim(p_email)) then
      raise exception 'email_mismatch';
    end if;
  end if;
  delete from public.auth_pending
  where email = lower(trim(p_email)) and kind = p_kind;
end;
$$;

revoke all on function public.clear_auth_pending(text, text) from public;
grant execute on function public.clear_auth_pending(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- ERR-119: atomic OTP resend claim
-- ---------------------------------------------------------------------------
create or replace function public.claim_otp_resend(
  p_email text,
  p_kind text,
  p_force_initial boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.auth_pending;
  cooldown integer;
  elapsed numeric;
  retry integer;
  normalized text := lower(trim(p_email));
  updated_count integer;
begin
  if p_kind not in ('signup', 'reset') then
    raise exception 'invalid_kind';
  end if;

  cooldown := public.otp_resend_cooldown_seconds();

  insert into public.auth_pending (email, kind, otp_verified, expires_at, last_sent_at, updated_at)
  values (
    normalized,
    p_kind,
    false,
    now() + interval '10 minutes',
    case when p_force_initial then now() - make_interval(secs => cooldown) else now() end,
    now()
  )
  on conflict (email, kind) do nothing;

  select * into row
  from public.auth_pending
  where email = normalized and kind = p_kind
  for update;

  if row.expires_at <= now() then
    update public.auth_pending
    set expires_at = now() + interval '10 minutes',
        updated_at = now()
    where email = normalized and kind = p_kind
    returning * into row;
  end if;

  elapsed := extract(epoch from (now() - row.last_sent_at));
  if elapsed < cooldown and not p_force_initial then
    retry := greatest(1, ceil(cooldown - elapsed)::integer);
    return jsonb_build_object(
      'ok', false,
      'retry_after_seconds', retry,
      'cooldown_seconds', cooldown,
      'last_sent_at', row.last_sent_at
    );
  end if;

  update public.auth_pending
  set last_sent_at = now(),
      expires_at = now() + interval '10 minutes',
      updated_at = now()
  where email = normalized
    and kind = p_kind
    and (p_force_initial or last_sent_at <= now() - make_interval(secs => cooldown))
  returning * into row;

  get diagnostics updated_count = row_count;
  if updated_count = 0 then
    select * into row from public.auth_pending where email = normalized and kind = p_kind;
    elapsed := extract(epoch from (now() - row.last_sent_at));
    retry := greatest(1, ceil(cooldown - elapsed)::integer);
    return jsonb_build_object(
      'ok', false,
      'retry_after_seconds', retry,
      'cooldown_seconds', cooldown,
      'last_sent_at', row.last_sent_at
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'retry_after_seconds', 0,
    'cooldown_seconds', cooldown,
    'last_sent_at', row.last_sent_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- ERR-102: service-role atomic consume / refund by user id
-- ---------------------------------------------------------------------------
create or replace function public.consume_tokens_for_user(p_user_id uuid, p_cost integer)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.profiles;
begin
  if p_user_id is null then
    raise exception 'invalid_user';
  end if;
  if p_cost is null or p_cost <= 0 then
    raise exception 'invalid_cost';
  end if;

  select * into row from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'profile_not_found';
  end if;

  if row.tokens is null then
    return row;
  end if;

  if row.tokens < p_cost then
    raise exception 'insufficient_tokens';
  end if;

  update public.profiles
  set tokens = row.tokens - p_cost
  where id = p_user_id and tokens >= p_cost
  returning * into row;

  if not found then
    raise exception 'insufficient_tokens';
  end if;

  return row;
end;
$$;

create or replace function public.refund_tokens_for_user(p_user_id uuid, p_cost integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_cost is null or p_cost <= 0 then
    return;
  end if;
  update public.profiles
  set tokens = tokens + p_cost
  where id = p_user_id and tokens is not null;
end;
$$;

revoke all on function public.consume_tokens_for_user(uuid, integer) from public;
revoke all on function public.refund_tokens_for_user(uuid, integer) from public;
grant execute on function public.consume_tokens_for_user(uuid, integer) to service_role;
grant execute on function public.refund_tokens_for_user(uuid, integer) to service_role;

-- ---------------------------------------------------------------------------
-- ERR-120: signup tokens from catalog allotment
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, plan_id, tokens)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    'free',
    public.plan_token_allotment('free')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- ERR-106: apply_plan — set plan; reset allotment only for paid plans
-- (idempotent payment path must NOT call this twice — see Edge/Express)
-- free allotment null is rejected → 30 (ERR-121 guard in SQL)
-- ---------------------------------------------------------------------------
create or replace function public.plan_token_allotment(p_plan text)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  catalog jsonb;
  allotment jsonb;
  n integer;
  normalized text;
begin
  normalized := case
    when p_plan in ('free', 'starter', 'pro', 'enterprise') then p_plan
    else 'free'
  end;

  select value into catalog from public.app_settings where key = 'app_catalog';
  allotment := catalog -> 'token_allotments';

  if normalized = 'enterprise' then
    -- explicit null = unlimited
    if allotment ? 'enterprise' and (allotment ->> 'enterprise') is null then
      return null;
    end if;
    if allotment ? 'enterprise' and nullif(allotment ->> 'enterprise', '') is not null then
      return (allotment ->> 'enterprise')::integer;
    end if;
    return null;
  end if;

  n := nullif(allotment ->> normalized, '')::integer;
  if n is null or n < 0 then
    -- Never treat free/starter/pro null as unlimited
    return case normalized
      when 'starter' then 1000
      when 'pro' then 4500
      else 30
    end;
  end if;
  return n;
end;
$$;
