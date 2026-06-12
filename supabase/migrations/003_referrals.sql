-- Migration 003 : système de parrainage

-- ============ TABLES ============

create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

-- Un utilisateur invité ne peut avoir qu'un seul parrain (unique referred_user_id).
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.users(id) on delete cascade,
  referred_user_id uuid not null unique references public.users(id) on delete cascade,
  status text not null default 'completed' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now()
);

-- Paliers débloqués (idempotent : unique user_id + milestone).
create table public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  milestone integer not null check (milestone in (3, 6, 10)),
  reward_days integer not null,
  unlocked_at timestamptz not null default now(),
  claimed_at timestamptz,
  unique (user_id, milestone)
);

-- Total jours bonus accumulés (append-only pour audit).
create table public.user_bonus_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  total_days integer not null default 0,
  source text not null default 'referral',
  created_at timestamptz not null default now()
);

-- ============ INDEX ============

create index idx_referral_codes_code on public.referral_codes(code);
create index idx_referrals_referrer on public.referrals(referrer_user_id);
create index idx_referral_rewards_user on public.referral_rewards(user_id);

-- ============ RLS ============

alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.user_bonus_days enable row level security;

create policy "referral_codes select own" on public.referral_codes
  for select using (auth.uid() = user_id);
create policy "referral_codes insert own" on public.referral_codes
  for insert with check (auth.uid() = user_id);

-- lecture publique du code (pour valider un lien d'invitation)
create policy "referral_codes select public" on public.referral_codes
  for select using (true);

create policy "referrals select own" on public.referrals
  for select using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);

create policy "referral_rewards select own" on public.referral_rewards
  for select using (auth.uid() = user_id);

create policy "bonus_days select own" on public.user_bonus_days
  for select using (auth.uid() = user_id);

-- Écritures par service_role uniquement (logique backend, bypass RLS).
