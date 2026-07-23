-- Harden billing, grants, token consume, transactions RLS

-- Explicit grants (Data API)
grant select, update on public.profiles to authenticated;
grant select on public.profiles to service_role;
grant all on public.profiles to service_role;

grant select on public.transactions to authenticated;
grant all on public.transactions to service_role;

grant select, insert, delete on public.media_assets to authenticated;
grant all on public.media_assets to service_role;

grant execute on function public.apply_plan(uuid, text) to service_role;

-- consume_tokens: cost must be > 0
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
  if p_cost is null or p_cost <= 0 then
    raise exception 'invalid_cost';
  end if;

  select * into row from public.profiles where id = auth.uid() for update;
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
  where id = auth.uid()
  returning * into row;

  return row;
end;
$$;

-- Clients must not insert fake success transactions
drop policy if exists "transactions_insert_own" on public.transactions;

-- Optional: clients can insert pending only (rarely used); prefer service_role inserts
create policy "transactions_insert_pending_own"
  on public.transactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and razorpay_payment_id is null
  );

-- Payment ownership map for generated files (optional helper table)
create table if not exists public.generation_files (
  file_id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  interaction_id text,
  created_at timestamptz not null default now()
);

create index if not exists generation_files_user_id_idx on public.generation_files (user_id);

alter table public.generation_files enable row level security;

drop policy if exists "generation_files_select_own" on public.generation_files;
create policy "generation_files_select_own"
  on public.generation_files for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.generation_files to authenticated;
grant all on public.generation_files to service_role;
