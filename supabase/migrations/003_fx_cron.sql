-- Schedule Edge Function update-fx-rates at 01:00 and 13:00 UTC daily.
-- Invocation uses service role via vault secret `service_role_key` when present;
-- otherwise run scripts/schedule-fx-cron.mjs after deploy to install the job.

create extension if not exists pg_net with schema extensions;

-- Helper: invoke FX update edge function (Authorization injected by schedule-fx-cron.mjs
-- or by vault when available).
create or replace function public.invoke_update_fx_rates()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  request_id bigint;
  project_url text := 'https://cszskydtgrsocmtgteik.supabase.co';
  service_key text;
begin
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

-- Cron: 1 AM and 1 PM UTC
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'update-fx-rates-1am-1pm';

    perform cron.schedule(
      'update-fx-rates-1am-1pm',
      '0 1,13 * * *',
      $cron$ select public.invoke_update_fx_rates(); $cron$
    );
  else
    raise notice 'pg_cron not available — enable it in Dashboard → Database → Extensions';
  end if;
exception
  when others then
    raise notice 'Could not schedule FX cron: %', SQLERRM;
end;
$$;
