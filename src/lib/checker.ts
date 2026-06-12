// Coeur métier : check d'un profil GLOBAL.
// fetch public 1× → snapshot → diff → changements globaux → distribution à
// chaque abonné selon ses préférences. Si 50 users suivent le même @,
// on fetch/compare UNE fois, puis on crée 50 notifications.

import { getFetcher } from "./fetcher";
import { diffSnapshots, isEnabled } from "./diff";
import { getStore } from "./store";
import { CHANGE_LABELS, PLAN_LIMITS, type NotificationSettings, type PlatformProfile, type ProfileChange } from "./types";

export interface CheckResult {
  profile: string;
  changes: number;
  notified: number;
}

export async function checkPlatformProfile(profile: PlatformProfile): Promise<CheckResult> {
  const store = getStore();
  const fetcher = getFetcher();

  const fresh = await fetcher.fetchProfile(profile.username); // 1 SEUL fetch
  if (!fresh) {
    console.warn(`[checker] profil introuvable: @${profile.username}`);
    await store.touchChecked(profile.id);
    return { profile: profile.username, changes: 0, notified: 0 };
  }

  const prev = await store.latestSnapshot(profile.id);
  let notified = 0;
  let changeCount = 0;

  if (prev) {
    const detected = diffSnapshots(prev, fresh); // 1 SEULE comparaison
    if (detected.length > 0) {
      const subscribers = await store.subscribersOf(profile.id);
      // pré-charge les settings de chaque abonné une fois
      const settingsByUser = new Map<string, NotificationSettings>();
      for (const s of subscribers) {
        settingsByUser.set(s.user_id, await store.getSettings(s.user_id));
      }

      for (const d of detected) {
        const change = await store.addChange(profile.id, d); // changement GLOBAL unique
        changeCount++;
        // distribution : seulement aux abonnés qui ont activé ce type
        const targets = subscribers
          .filter((s) => isEnabled(d.change_type, settingsByUser.get(s.user_id)!))
          .map((s) => s.user_id);
        await store.distribute(change, targets);
        notified += targets.length;
        if (d.severity === "major") logNotify(profile.username, change);
      }
      await store.addSnapshot(profile.id, fresh); // nouveau snapshot uniquement si changement
      await store.updatePlatformProfile(profile.id, fresh);
    }
  } else {
    // premier check → baseline, pas d'événement
    await store.addSnapshot(profile.id, fresh);
    await store.updatePlatformProfile(profile.id, fresh);
  }

  await store.touchChecked(profile.id);
  return { profile: profile.username, changes: changeCount, notified };
}

// Le cron tourne souvent mais ne fetch un profil que si son intervalle est écoulé.
// Intervalle = le PLUS COURT parmi les abonnés (si un premium suit → 6 h, sinon 24 h).
function dueIntervalMin(plans: ("starter" | "premium")[]): number {
  return Math.min(...plans.map((p) => PLAN_LIMITS[p].checkIntervalMin));
}

function isDue(profile: PlatformProfile, intervalMin: number): boolean {
  if (!profile.last_checked_at) return true;
  const elapsedMin = (Date.now() - new Date(profile.last_checked_at).getTime()) / 60_000;
  return elapsedMin >= intervalMin;
}

export async function checkAllProfiles(): Promise<{
  scanned: number;
  fetched: number;
  changes: number;
  notifications: number;
}> {
  const store = getStore();
  const profiles = await store.allPlatformProfilesForCheck();
  let fetched = 0;
  let changes = 0;
  let notifications = 0;

  for (const p of profiles) {
    try {
      const subs = await store.subscribersOf(p.id);
      if (subs.length === 0) continue; // orphelin
      if (!isDue(p, dueIntervalMin(subs.map((s) => s.plan)))) continue;
      fetched++;
      const r = await checkPlatformProfile(p);
      changes += r.changes;
      notifications += r.notified;
    } catch (e) {
      console.error(`[cron] check échoué @${p.username}:`, e);
    }
  }
  return { scanned: profiles.length, fetched, changes, notifications };
}

// Notification instantanée (major). Email/push branchables plus tard (Resend / web push).
function logNotify(username: string, change: ProfileChange) {
  console.log(
    `[notify] @${username} — ${CHANGE_LABELS[change.change_type]} ` +
      `(${change.old_value ?? "∅"} → ${change.new_value ?? "∅"})`,
  );
}
