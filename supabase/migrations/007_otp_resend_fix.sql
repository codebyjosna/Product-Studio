-- Fix get_auth_pending return type (must drop first) + ensure OTP resend RPCs

alter table public.auth_pending
  add column if not exists last_sent_at timestamptz not null default now();

update public.app_settings
set value = coalesce(value, '{}'::jsonb) || '{"otp_resend_cooldown_seconds": 60}'::jsonb,
    updated_at = now()
where key = 'app_catalog';

create or replace function public.otp_resend_cooldown_seconds()
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  n integer;
begin
  select nullif((value ->> 'otp_resend_cooldown_seconds'), '')::integer into n
  from public.app_settings
  where key = 'app_catalog';
  if n is null or n < 1 then
    return 60;
  end if;
  return n;
end;
$$;

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
begin
  if p_kind not in ('signup', 'reset') then
    raise exception 'invalid_kind';
  end if;

  cooldown := public.otp_resend_cooldown_seconds();

  select * into row
  from public.auth_pending
  where email = normalized and kind = p_kind;

  if not found then
    insert into public.auth_pending (email, kind, otp_verified, expires_at, last_sent_at, updated_at)
    values (
      normalized,
      p_kind,
      false,
      now() + interval '10 minutes',
      case when p_force_initial then now() - make_interval(secs => cooldown) else now() end,
      now()
    )
    returning * into row;
  end if;

  if row.expires_at <= now() then
    update public.auth_pending
    set expires_at = now() + interval '10 minutes',
        updated_at = now()
    where email = normalized and kind = p_kind;
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
  where email = normalized and kind = p_kind
  returning * into row;

  return jsonb_build_object(
    'ok', true,
    'retry_after_seconds', 0,
    'cooldown_seconds', cooldown,
    'last_sent_at', row.last_sent_at
  );
end;
$$;

create or replace function public.get_otp_resend_status(p_email text, p_kind text)
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
begin
  cooldown := public.otp_resend_cooldown_seconds();

  select * into row
  from public.auth_pending
  where email = normalized and kind = p_kind;

  if not found then
    return jsonb_build_object(
      'ok', true,
      'retry_after_seconds', 0,
      'cooldown_seconds', cooldown,
      'last_sent_at', null
    );
  end if;

  elapsed := extract(epoch from (now() - row.last_sent_at));
  if elapsed >= cooldown then
    retry := 0;
  else
    retry := greatest(1, ceil(cooldown - elapsed)::integer);
  end if;

  return jsonb_build_object(
    'ok', retry = 0,
    'retry_after_seconds', retry,
    'cooldown_seconds', cooldown,
    'last_sent_at', row.last_sent_at
  );
end;
$$;

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
  insert into public.auth_pending (email, kind, name, otp_verified, expires_at, last_sent_at, updated_at)
  values (
    lower(trim(p_email)),
    p_kind,
    nullif(trim(coalesce(p_name, '')), ''),
    coalesce(p_otp_verified, false),
    now() + make_interval(mins => greatest(1, coalesce(p_ttl_minutes, 10))),
    now(),
    now()
  )
  on conflict (email, kind) do update
    set name = coalesce(excluded.name, public.auth_pending.name),
        otp_verified = excluded.otp_verified,
        expires_at = excluded.expires_at,
        last_sent_at = case
          when excluded.otp_verified then public.auth_pending.last_sent_at
          else now()
        end,
        updated_at = now();
end;
$$;

drop function if exists public.get_auth_pending(text, text);

create function public.get_auth_pending(p_email text, p_kind text)
returns table (
  email text,
  kind text,
  name text,
  otp_verified boolean,
  expires_at timestamptz,
  last_sent_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select a.email, a.kind, a.name, a.otp_verified, a.expires_at, a.last_sent_at
  from public.auth_pending a
  where a.email = lower(trim(p_email))
    and a.kind = p_kind
    and a.expires_at > now();
end;
$$;

revoke all on function public.otp_resend_cooldown_seconds() from public;
revoke all on function public.claim_otp_resend(text, text, boolean) from public;
revoke all on function public.get_otp_resend_status(text, text) from public;
revoke all on function public.get_auth_pending(text, text) from public;

grant execute on function public.otp_resend_cooldown_seconds() to anon, authenticated;
grant execute on function public.claim_otp_resend(text, text, boolean) to anon, authenticated;
grant execute on function public.get_otp_resend_status(text, text) to anon, authenticated;
grant execute on function public.upsert_auth_pending(text, text, text, boolean, integer) to anon, authenticated;
grant execute on function public.get_auth_pending(text, text) to anon, authenticated;
