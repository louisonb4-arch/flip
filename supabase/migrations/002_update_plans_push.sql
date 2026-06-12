-- Migration 002 : renommage plans + table push_subscriptions

-- ============ PLANS : mise à jour contrainte + valeurs ============

alter table public.users
  drop constraint if exists users_plan_check;

update public.users
  set plan = case plan
    when 'starter'     then 'flip_mini'
    when 'premium'     then 'flip_plus'
    when 'social_plus' then 'flip_ultra'
    else plan
  end;

alter table public.users
  alter column plan set default 'flip_mini',
  add constraint users_plan_check check (plan in ('flip_mini', 'flip_plus', 'flip_ultra'));

-- ============ PUSH SUBSCRIPTIONS ============

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null,
  subscription text not null,  -- JSON sérialisé (PushSubscription)
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "push select own" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "push insert own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "push delete own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

create index idx_push_user on public.push_subscriptions(user_id);
