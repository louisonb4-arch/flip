// Coeur métier : check d'un profil suivi.
// fetch public → snapshot → diff vs dernier snapshot → événements → notification.

import { getFetcher } from "./fetcher";
import { diffSnapshots, shouldNotify } from "./diff";
import { getStore } from "./store";
import { CHANGE_LABELS, PLAN_LIMITS, type ProfileChange, type TrackedProfile } from "./types";

export async function checkProfile(profile: TrackedProfile): Promise<ProfileChange[]> {
  const store = getStore();
  const fetcher = getFetcher();

  const fresh = await fetcher.fetchProfile(profile.username);
  if (!fresh) {
    console.warn(`[checker] profil introuvable: @${profile.username}`);
    await store.touchChecked(profile.id);
    return [];
  }

  const prev = await store.latestSnapshot(profile.id);
  const created: ProfileChange[] = [];

  if (prev) {
    const changes = diffSnapshots(prev, fresh);
    if (changes.length > 0) {
      const settings = await store.getSettings(profile.user_id);
      for (const ch of changes) {
        const saved = await store.addChange({
          tracked_profile_id: profile.id,
          user_id: profile.user_id,
          ...ch,
        });
        created.push(saved);
        if (shouldNotify(ch, settings)) {
          await notify(profile, saved);
        }
      }
      // nouveau snapshot uniquement si changement → pas de doublons
      await store.addSnapshot(profile.id, fresh);
      await store.updateProfile(profile.id, fresh);
    }
  } else {
    // premier check → snapshot baseline, pas d'événement
    await store.addSnapshot(profile.id, fresh);
    await store.updateProfile(profile.id, fresh);
  }

  await store.touchChecked(profile.id);
  return created;
}

// Le cron tourne souvent (ex. toutes les heures) mais ne fetch un profil
// que si son intervalle de plan est écoulé → maîtrise du coût data.
function isDue(profile: TrackedProfile, intervalMin: number): boolean {
  if (!profile.last_checked_at) return true;
  const elapsedMin = (Date.now() - new Date(profile.last_checked_at).getTime()) / 60_000;
  return elapsedMin >= intervalMin;
}

export async function checkAllProfiles(): Promise<{
  scanned: number;
  checked: number;
  changes: number;
}> {
  const store = getStore();
  const profiles = await store.allProfilesForCheck();
  let checked = 0;
  let changes = 0;
  const planCache = new Map<string, number>();

  for (const p of profiles) {
    try {
      let intervalMin = planCache.get(p.user_id);
      if (intervalMin === undefined) {
        const user = await store.getUser(p.user_id);
        intervalMin = PLAN_LIMITS[user.plan]?.checkIntervalMin ?? PLAN_LIMITS.starter.checkIntervalMin;
        planCache.set(p.user_id, intervalMin);
      }
      if (!isDue(p, intervalMin)) continue;
      checked++;
      changes += (await checkProfile(p)).length;
    } catch (e) {
      console.error(`[cron] check échoué @${p.username}:`, e);
    }
  }
  return { scanned: profiles.length, checked, changes };
}

// Notification : email/push branchables plus tard (Resend / web push).
// MVP : log structuré + l'événement apparaît dans l'app.
async function notify(profile: TrackedProfile, change: ProfileChange) {
  console.log(
    `[notify] @${profile.username} — ${CHANGE_LABELS[change.change_type]} ` +
      `(${change.old_value ?? "∅"} → ${change.new_value ?? "∅"})`,
  );
}
