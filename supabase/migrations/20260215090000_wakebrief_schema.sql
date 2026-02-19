create extension if not exists pgcrypto;
create extension if not exists pg_net;
create extension if not exists pg_cron;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'Europe/Rome',
  wake_time_local time not null default '07:30:00',
  active_days int[] not null default '{1,2,3,4,5,6,7}',
  interests text[] not null default '{World,Markets,Tech}',
  avoid_keywords text[] not null default '{}',
  show_portfolio boolean not null default true,
  hide_amounts_in_push boolean not null default true,
  expo_push_token text null,
  last_brief_date date null,
  next_run_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Main',
  base_currency text not null default 'EUR',
  created_at timestamptz not null default now()
);

create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  symbol text not null,
  quantity numeric not null,
  avg_cost numeric null,
  currency text null,
  updated_at timestamptz not null default now(),
  unique (portfolio_id, symbol)
);

create table if not exists public.briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brief_date date not null,
  created_at timestamptz not null default now(),
  payload jsonb not null,
  citations jsonb not null,
  unique (user_id, brief_date)
);

create table if not exists public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brief_id uuid null references public.briefs(id) on delete set null,
  channel text not null check (channel in ('expo_push')),
  status text not null check (status in ('queued', 'sent', 'failed')),
  sent_at timestamptz null,
  error text null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.portfolios enable row level security;
alter table public.holdings enable row level security;
alter table public.briefs enable row level security;
alter table public.notifications_log enable row level security;

create policy "profiles own rows" on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "portfolios own rows" on public.portfolios for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "holdings through portfolios" on public.holdings for all
using (
  exists (
    select 1 from public.portfolios p
    where p.id = holdings.portfolio_id and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.portfolios p
    where p.id = holdings.portfolio_id and p.user_id = auth.uid()
  )
);
create policy "briefs own rows" on public.briefs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications own rows" on public.notifications_log for select using (auth.uid() = user_id);

create index if not exists idx_profiles_next_run_at on public.profiles(next_run_at);
create index if not exists idx_briefs_user_date on public.briefs(user_id, brief_date desc);

create or replace function public.compute_next_run_at(
  p_timezone text,
  p_wake_time time,
  p_active_days int[],
  p_from timestamptz default now()
) returns timestamptz
language plpgsql
as $$
declare
  candidate timestamptz;
  local_candidate timestamp;
  local_now timestamp;
  day_idx int;
begin
  local_now := p_from at time zone p_timezone;

  for day_idx in 0..14 loop
    local_candidate := date_trunc('day', local_now) + make_interval(days => day_idx) + p_wake_time;
    candidate := local_candidate at time zone p_timezone;
    if extract(isodow from local_candidate)::int = any(p_active_days) and candidate > p_from then
      return candidate;
    end if;
  end loop;

  return (date_trunc('day', local_now) + interval '1 day' + p_wake_time) at time zone p_timezone;
end;
$$;

create or replace function public.ensure_profile_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, next_run_at)
  values (new.id, public.compute_next_run_at('Europe/Rome', '07:30:00'::time, '{1,2,3,4,5,6,7}'::int[]))
  on conflict (user_id) do nothing;

  insert into public.portfolios (user_id)
  values (new.id)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.ensure_profile_defaults();

select cron.schedule(
  'wakebrief-generate-daily-brief',
  '*/15 * * * *',
  $$
  select
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-daily-brief',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
)
on conflict do nothing;
