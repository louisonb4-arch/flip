// Coeur métier : check d'un profil suivi.
// fetch public → snapshot → diff vs dernier snapshot → événements → notification.

import { getFetcher } from "./fetcher";
import { diffSnapshots, shouldNotify } from "./diff";
import { getStore } from "./store";
import { CHANGE_LABELS, type ProfileChange, type TrackedProfile } from "./types";

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

export async function checkAllProfiles(): Promise<{ checked: number; changes: number }> {
  const store = getStore();
  const profiles = await store.allProfilesForCheck();
  let changes = 0;
  for (const p of profiles) {
    try {
      changes += (await checkProfile(p)).length;
    } catch (e) {
      console.error(`[cron] check échoué @${p.username}:`, e);
    }
  }
  return { checked: profiles.length, changes };
}

// Notification : email/push branchables plus tard (Resend / web push).
// MVP : log structuré + l'événement apparaît dans l'app.
async function notify(profile: TrackedProfile, change: ProfileChange) {
  console.log(
    `[notify] @${profile.username} — ${CHANGE_LABELS[change.change_type]} ` +
      `(${change.old_value ?? "∅"} → ${change.new_value ?? "∅"})`,
  );
}
