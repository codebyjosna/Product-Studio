-- ERR-133: FX cron URL from vault (not hardcoded project host)
-- ERR-124: per-user AI rate limit for Edge studio-api / Express

create or replace function public.invoke_update_fx_rates()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  request_id bigint;
  project_url text;
  service_key text;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  if project_url is null or length(trim(project_url)) = 0 then
    -- Fallback: derive from API settings when vault project_url is unset
    project_url := nullif(trim(current_setting('app.settings.supabase_url', true)), '');
  end if;

  if project_url is null or length(trim(project_url)) = 0 then
    raise notice 'invoke_update_fx_rates: set vault secret project_url (e.g. https://YOUR_REF.supabase.co)';
    return null;
  end if;

  project_url := rtrim(project_url, '/');

  select decrypted_secret into service_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  if service_key is null or length(service_key) = 0 then
    raise notice 'invoke_update_fx_rates: vault service_role_key missing — schedule via scripts/schedule-fx-cron.mjs';
    return null;
  end if;

  select net.http_post(
    url := project_url || '/functions/v1/update-fx-rates',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.invoke_update_fx_rates() from public;
grant execute on function public.invoke_update_fx_rates() to postgres;
grant execute on function public.invoke_update_fx_rates() to service_role;

create table if not exists public.ai_rate_limits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0
);

alter table public.ai_rate_limits enable row level security;

create or replace function public.enforce_ai_rate_limit(
  p_user_id uuid,
  p_max_per_window integer default 30,
  p_window_seconds integer default 60
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.ai_rate_limits%rowtype;
  window_start timestamptz;
begin
  if p_user_id is null then
    raise exception 'invalid_user';
  end if;
  if p_max_per_window is null or p_max_per_window < 1 then
    p_max_per_window := 30;
  end if;
  if p_window_seconds is null or p_window_seconds < 1 then
    p_window_seconds := 60;
  end if;

  select * into rec
  from public.ai_rate_limits
  where user_id = p_user_id
  for update;

  if not found then
    insert into public.ai_rate_limits (user_id, window_started_at, request_count)
    values (p_user_id, now(), 1);
    return;
  end if;

  window_start := rec.window_started_at;
  if window_start < now() - make_interval(secs => p_window_seconds) then
    update public.ai_rate_limits
    set window_started_at = now(), request_count = 1
    where user_id = p_user_id;
    return;
  end if;

  if rec.request_count >= p_max_per_window then
    raise exception 'rate_limited';
  end if;

  update public.ai_rate_limits
  set request_count = request_count + 1
  where user_id = p_user_id;
end;
$$;

revoke all on function public.enforce_ai_rate_limit(uuid, integer, integer) from public;
grant execute on function public.enforce_ai_rate_limit(uuid, integer, integer) to service_role;

comment on function public.invoke_update_fx_rates() is
  'ERR-133: posts to vault project_url + /functions/v1/update-fx-rates';
comment on function public.enforce_ai_rate_limit(uuid, integer, integer) is
  'ERR-124: sliding-window AI request limiter (service_role)';
