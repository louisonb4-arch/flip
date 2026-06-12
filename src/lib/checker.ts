// Coeur métier : check d'un profil GLOBAL.
// fetch public 1× → snapshot → diff → changements globaux → distribution à
// chaque abonné selon ses préférences. Si 50 users suivent le même @,
// on fetch/compare UNE fois, puis on crée 50 notifications.

import { getFetcher } from "./fetcher";
import { diffSnapshots, isEnabled } from "./diff";
import { getStore } from "./store";
import { getFlipCopy } from "./flip";
import { sendFlipPush } from "./push";
import { ACTIVITY_START, nextScore, effectiveIntervalMin } from "./activity";
import { CHANGE_LABELS, PLAN_LIMITS, type NotificationSettings, type Plan, type PlatformProfile, type ProfileChange } from "./types";

export interface CheckResult {
  profile: string;
  changes: number;
  notified: number;
}

export async function checkPlatformProfile(profile: PlatformProfile): Promise<CheckResult> {
  const store = getStore();
  const fetcher = getFetcher(profile.platform);

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
        if (d.severity === "major") {
          logNotify(profile.username, change);
          // Web Push réel — uniquement les abonnés avec push activé
          const pushTargets = targets.filter(
            (uid) => settingsByUser.get(uid)?.push_enabled,
          );
          const copy = getFlipCopy(d.change_type, profile.username, d.old_value, d.new_value);
          await sendFlipPush(pushTargets, copy).catch((e) =>
            console.warn("[push] envoi échoué:", e),
          );
        }
      }
      await store.addSnapshot(profile.id, fresh); // nouveau snapshot uniquement si changement
      await store.updatePlatformProfile(profile.id, fresh);
    }
  } else {
    // premier check → baseline, pas d'événement
    await store.addSnapshot(profile.id, fresh);
    await store.updatePlatformProfile(profile.id, fresh);
  }

  // Backoff adaptatif : met à jour le score d'activité du profil.
  // Un changement → score monte (check plus agressif) ; rien → score baisse.
  const currentScore = profile.activity_score ?? ACTIVITY_START;
  const updatedScore = nextScore(currentScore, changeCount, profile.last_checked_at);
  if (updatedScore !== currentScore) {
    await store.updateActivityScore(profile.id, updatedScore);
  }

  await store.touchChecked(profile.id);
  return { profile: profile.username, changes: changeCount, notified };
}

// Plancher du plan : le PLUS COURT intervalle parmi les abonnés (meilleur plan gagne).
function planFloorMin(plans: Plan[]): number {
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

  // 1. Construire la file : profils dus, avec leur plancher de plan.
  const queue: { profile: PlatformProfile; floor: number }[] = [];
  for (const p of profiles) {
    const subs = await store.subscribersOf(p.id);
    if (subs.length === 0) continue; // orphelin
    const floor = planFloorMin(subs.map((s) => s.plan));
    const score = p.activity_score ?? ACTIVITY_START;
    // Fréquence réelle = max(plancher plan, intervalle activité).
    if (!isDue(p, effectiveIntervalMin(floor, score))) continue;
    queue.push({ profile: p, floor });
  }

  // 2. Priorité : meilleur plan (plancher le plus court = Ultra) checké en premier.
  //    → ressenti "instantané" pour les abonnés premium sans augmenter le volume total.
  queue.sort((a, b) => a.floor - b.floor);

  let fetched = 0;
  let changes = 0;
  let notifications = 0;

  for (const { profile: p } of queue) {
    try {
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
