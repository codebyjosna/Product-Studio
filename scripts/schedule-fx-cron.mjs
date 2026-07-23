/**
 * Enable pg_cron / pg_net / vault, then schedule FX updates.
 * Usage: node --env-file=.env.local scripts/schedule-fx-cron.mjs
 */
const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF || 'cszskydtgrsocmtgteik';

if (!url || !serviceKey || !token) {
  console.error('Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

async function runSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${body}`);
  }
  return body;
}

console.log('1) Enabling extensions...');
try {
  console.log(await runSql(`create extension if not exists pg_cron with schema pg_catalog;`));
} catch (e) {
  console.warn('pg_cron:', e.message);
}
try {
  console.log(await runSql(`create extension if not exists pg_net with schema extensions;`));
} catch (e) {
  console.warn('pg_net:', e.message);
}
try {
  console.log(await runSql(`create extension if not exists supabase_vault with schema vault;`));
} catch (e) {
  console.warn('vault:', e.message);
}

console.log('2) Extensions present:');
console.log(
  await runSql(
    `select extname from pg_extension where extname in ('pg_cron','pg_net','supabase_vault','pgcrypto');`,
  ),
);

console.log('3) Upsert vault secret + function + cron...');
const sql = `
do $vault$
declare
  existing uuid;
begin
  select id into existing from vault.secrets where name = 'service_role_key' limit 1;
  if existing is null then
    perform vault.create_secret(${JSON.stringify(serviceKey)}, 'service_role_key', 'Edge cron Authorization');
  else
    perform vault.update_secret(existing, ${JSON.stringify(serviceKey)}, 'service_role_key', 'Edge cron Authorization');
  end if;
exception
  when others then
    raise notice 'vault upsert: %', SQLERRM;
end;
$vault$;

create or replace function public.invoke_update_fx_rates()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  request_id bigint;
  service_key text;
begin
  select decrypted_secret into service_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  if service_key is null then
    raise exception 'vault secret service_role_key missing';
  end if;

  select net.http_post(
    url := ${JSON.stringify(url + '/functions/v1/update-fx-rates')},
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb
  ) into request_id;

  return request_id;
end;
$fn$;

revoke all on function public.invoke_update_fx_rates() from public;
grant execute on function public.invoke_update_fx_rates() to postgres;
grant execute on function public.invoke_update_fx_rates() to service_role;

do $cron$
declare
  jid bigint;
begin
  select jobid into jid from cron.job where jobname = 'update-fx-rates-1am-1pm' limit 1;
  if jid is not null then
    perform cron.unschedule(jid);
  end if;
  perform cron.schedule(
    'update-fx-rates-1am-1pm',
    '0 1,13 * * *',
    $job$ select public.invoke_update_fx_rates(); $job$
  );
end;
$cron$;

select jobid, jobname, schedule, command
from cron.job
where jobname = 'update-fx-rates-1am-1pm';
`;

console.log(await runSql(sql));
console.log('Done: FX cron at 01:00 & 13:00 UTC');
