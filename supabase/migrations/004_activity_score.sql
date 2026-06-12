-- Migration 004 : score d'activité pour le backoff adaptatif

alter table public.platform_profiles
  add column activity_score integer not null default 50
    check (activity_score >= 0 and activity_score <= 100);

-- File d'attente du cron : profils les plus en retard d'abord.
-- (le tri par priorité de plan se fait côté application via subscribersOf)
create index idx_platform_activity on public.platform_profiles(activity_score desc, last_checked_at nulls first);
