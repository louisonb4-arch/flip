-- Flip — schema initial + RLS
-- DISCLAIMER : Flip ne suit que des informations PUBLIQUES observables.
-- Aucun identifiant Instagram n'est demandé ni stocké.

-- ============ TABLES ============

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  created_at timestamptz not null default now()
);

create table public.tracked_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
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
  unique (user_id, platform, username)
);

create table public.profile_snapshots (
  id uuid primary key default gen_random_uuid(),
  tracked_profile_id uuid not null references public.tracked_profiles(id) on delete cascade,
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

create table public.profile_changes (
  id uuid primary key default gen_random_uuid(),
  tracked_profile_id uuid not null references public.tracked_profiles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  change_type text not null check (change_type in
    ('bio', 'photo', 'display_name', 'bio_link', 'username', 'privacy')),
  old_value text,
  new_value text,
  seen boolean not null default false,
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

create index idx_tracked_profiles_user on public.tracked_profiles(user_id);
create index idx_snapshots_profile on public.profile_snapshots(tracked_profile_id, created_at desc);
create index idx_changes_user on public.profile_changes(user_id, created_at desc);
create index idx_changes_profile on public.profile_changes(tracked_profile_id, created_at desc);
create index idx_tracked_profiles_check on public.tracked_profiles(last_checked_at nulls first);

-- ============ RLS ============

alter table public.users enable row level security;
alter table public.tracked_profiles enable row level security;
alter table public.profile_snapshots enable row level security;
alter table public.profile_changes enable row level security;
alter table public.notification_settings enable row level security;
alter table public.subscriptions enable row level security;

create policy "users read own" on public.users
  for select using (auth.uid() = id);
create policy "users update own" on public.users
  for update using (auth.uid() = id);

create policy "tracked select own" on public.tracked_profiles
  for select using (auth.uid() = user_id);
create policy "tracked insert own" on public.tracked_profiles
  for insert with check (auth.uid() = user_id);
create policy "tracked delete own" on public.tracked_profiles
  for delete using (auth.uid() = user_id);

create policy "snapshots select own" on public.profile_snapshots
  for select using (
    exists (select 1 from public.tracked_profiles tp
            where tp.id = tracked_profile_id and tp.user_id = auth.uid())
  );

create policy "changes select own" on public.profile_changes
  for select using (auth.uid() = user_id);
create policy "changes update own" on public.profile_changes
  for update using (auth.uid() = user_id);

create policy "notif select own" on public.notification_settings
  for select using (auth.uid() = user_id);
create policy "notif update own" on public.notification_settings
  for update using (auth.uid() = user_id);
create policy "notif insert own" on public.notification_settings
  for insert with check (auth.uid() = user_id);

create policy "subs select own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Écritures snapshots/changes/cron : service_role uniquement (bypass RLS côté backend).

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
