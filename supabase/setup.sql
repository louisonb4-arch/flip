-- ============================================================
-- FLIP — setup complet (coller dans Supabase SQL Editor → Run)
-- Ordre : 001 init → 002 plans/push → 003 referrals → 004 activity
-- ============================================================

-- ============ 001_init ============
-- Flip — schema initial + RLS
-- DISCLAIMER : Flip ne suit que des informations PUBLIQUES observables.
-- Aucun identifiant Instagram n'est demandé ni stocké.
--
-- Modèle GLOBAL : un profil n'est stocké et fetché qu'UNE fois (platform_profiles),
-- quel que soit le nombre de users qui le suivent (user_tracked_profiles).
-- Les changements sont détectés une fois (profile_changes) puis distribués
-- à chaque abonné (user_notifications).

-- ============ TABLES ============

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  plan text not null default 'starter' check (plan in ('starter', 'premium', 'social_plus')),
  created_at timestamptz not null default now()
);

-- Profil GLOBAL partagé (1 ligne par @username/plateforme).
create table public.platform_profiles (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'instagram',
  username text not null,
  display_name text,
  profile_image_url text,
  bio text,
  bio_link text,
  followers_count integer,
  following_count integer,
  posts_count integer,
  is_private boolean,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (platform, username)
);

-- Lien user ↔ profil global.
create table public.user_tracked_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  platform_profile_id uuid not null references public.platform_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, platform_profile_id)
);

-- Snapshots liés au profil GLOBAL.
create table public.profile_snapshots (
  id uuid primary key default gen_random_uuid(),
  platform_profile_id uuid not null references public.platform_profiles(id) on delete cascade,
  username text not null,
  display_name text,
  profile_image_url text,
  bio text,
  bio_link text,
  followers_count integer,
  following_count integer,
  posts_count integer,
  is_private boolean,
  raw_data jsonb,
  created_at timestamptz not null default now()
);

-- Changement GLOBAL détecté une seule fois.
create table public.profile_changes (
  id uuid primary key default gen_random_uuid(),
  platform_profile_id uuid not null references public.platform_profiles(id) on delete cascade,
  change_type text not null check (change_type in
    ('bio','photo','display_name','bio_link','username','privacy','followers','following','posts')),
  severity text not null default 'major' check (severity in ('major','minor')),
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

-- Distribution d'un changement à un user abonné (sa "feed").
create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  profile_change_id uuid not null references public.profile_changes(id) on delete cascade,
  platform_profile_id uuid not null references public.platform_profiles(id) on delete cascade,
  seen boolean not null default false,
  digested boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  bio_enabled boolean not null default true,
  photo_enabled boolean not null default true,
  name_enabled boolean not null default true,
  link_enabled boolean not null default true,
  private_public_enabled boolean not null default true,
  followers_enabled boolean not null default true,
  posts_enabled boolean not null default true,
  push_enabled boolean not null default false,
  email_enabled boolean not null default true
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',
  plan text not null default 'premium',
  created_at timestamptz not null default now()
);

-- ============ INDEX ============

create index idx_utp_user on public.user_tracked_profiles(user_id);
create index idx_utp_profile on public.user_tracked_profiles(platform_profile_id);
create index idx_snapshots_profile on public.profile_snapshots(platform_profile_id, created_at desc);
create index idx_changes_profile on public.profile_changes(platform_profile_id, created_at desc);
create index idx_notif_user on public.user_notifications(user_id, created_at desc);
create index idx_notif_user_unseen on public.user_notifications(user_id) where seen = false;
create index idx_notif_user_digest on public.user_notifications(user_id) where digested = false;
create index idx_platform_check on public.platform_profiles(last_checked_at nulls first);

-- ============ RLS ============

alter table public.users enable row level security;
alter table public.platform_profiles enable row level security;
alter table public.user_tracked_profiles enable row level security;
alter table public.profile_snapshots enable row level security;
alter table public.profile_changes enable row level security;
alter table public.user_notifications enable row level security;
alter table public.notification_settings enable row level security;
alter table public.subscriptions enable row level security;

create policy "users read own" on public.users
  for select using (auth.uid() = id);
create policy "users update own" on public.users
  for update using (auth.uid() = id);

-- Profil global : lisible seulement s'il est suivi par le user courant.
create policy "platform read if tracked" on public.platform_profiles
  for select using (
    exists (select 1 from public.user_tracked_profiles utp
            where utp.platform_profile_id = id and utp.user_id = auth.uid())
  );

create policy "utp select own" on public.user_tracked_profiles
  for select using (auth.uid() = user_id);
create policy "utp insert own" on public.user_tracked_profiles
  for insert with check (auth.uid() = user_id);
create policy "utp delete own" on public.user_tracked_profiles
  for delete using (auth.uid() = user_id);

create policy "snapshots read if tracked" on public.profile_snapshots
  for select using (
    exists (select 1 from public.user_tracked_profiles utp
            where utp.platform_profile_id = profile_snapshots.platform_profile_id
              and utp.user_id = auth.uid())
  );

create policy "changes read if tracked" on public.profile_changes
  for select using (
    exists (select 1 from public.user_tracked_profiles utp
            where utp.platform_profile_id = profile_changes.platform_profile_id
              and utp.user_id = auth.uid())
  );

create policy "notif select own" on public.user_notifications
  for select using (auth.uid() = user_id);
create policy "notif update own" on public.user_notifications
  for update using (auth.uid() = user_id);

create policy "notif_settings select own" on public.notification_settings
  for select using (auth.uid() = user_id);
create policy "notif_settings update own" on public.notification_settings
  for update using (auth.uid() = user_id);
create policy "notif_settings insert own" on public.notification_settings
  for insert with check (auth.uid() = user_id);

create policy "subs select own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Écritures snapshots/changes/notifications/cron : service_role uniquement (bypass RLS côté backend).

-- ============ TRIGGER : nouveau user auth → ligne users + settings ============

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email) values (new.id, new.email);
  insert into public.notification_settings (user_id) values (new.id);
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============ 002_update_plans_push ============
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


-- ============ 003_referrals ============
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


-- ============ 004_activity_score ============
-- Migration 004 : score d'activité pour le backoff adaptatif

alter table public.platform_profiles
  add column activity_score integer not null default 50
    check (activity_score >= 0 and activity_score <= 100);

-- File d'attente du cron : profils les plus en retard d'abord.
-- (le tri par priorité de plan se fait côté application via subscribersOf)
create index idx_platform_activity on public.platform_profiles(activity_score desc, last_checked_at nulls first);


