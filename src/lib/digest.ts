// Construction du digest : résumé des changements (surtout mineurs) pour
// créer de la rétention même sans gros changement.

import { getStore } from "./store";
import { CHANGE_LABELS, type UserNotification } from "./types";

export interface DigestItem {
  username: string;
  count: number;
  highlights: string[];
}

export interface Digest {
  period: "daily" | "weekly";
  totalChanges: number;
  profilesMoved: number;
  headline: string;
  items: DigestItem[];
}

export async function buildDigest(
  userId: string,
  period: "daily" | "weekly" = "weekly",
): Promise<Digest> {
  const store = getStore();
  // Les changements MAJEURS sont déjà envoyés en push instantané → on ne les répète pas
  // dans le digest. Le digest = uniquement les mineurs (variations d'abonnés, etc.).
  const notifs = (await store.pendingDigest(userId)).filter((n) => n.severity === "minor");

  const byProfile = new Map<string, UserNotification[]>();
  for (const n of notifs) {
    const key = n.username ?? n.platform_profile_id;
    if (!byProfile.has(key)) byProfile.set(key, []);
    byProfile.get(key)!.push(n);
  }

  const items: DigestItem[] = [...byProfile.entries()]
    .map(([username, ns]) => ({
      username,
      count: ns.length,
      highlights: summarize(ns),
    }))
    .sort((a, b) => b.count - a.count);

  const profilesMoved = items.length;
  const totalChanges = notifs.length;

  let headline: string;
  if (totalChanges === 0) headline = "Calme plat cette semaine. On garde l'œil ouvert 👀";
  else if (profilesMoved === 1)
    headline = `@${items[0].username} a bougé ${totalChanges} fois cette semaine`;
  else headline = `${profilesMoved} profils ont bougé cette semaine · ${totalChanges} updates`;

  return { period, totalChanges, profilesMoved, headline, items };
}

function summarize(notifs: UserNotification[]): string[] {
  // regroupe par type, garde la variation nette pour les compteurs
  const out: string[] = [];
  const byType = new Map<UserNotification["change_type"], UserNotification[]>();
  for (const n of notifs) {
    if (!byType.has(n.change_type)) byType.set(n.change_type, []);
    byType.get(n.change_type)!.push(n);
  }
  for (const [type, ns] of byType) {
    if (type === "followers" || type === "following" || type === "posts") {
      const first = ns[ns.length - 1];
      const last = ns[0];
      const from = Number(first.old_value);
      const to = Number(last.new_value);
      if (!Number.isNaN(from) && !Number.isNaN(to)) {
        const delta = to - from;
        const sign = delta > 0 ? "+" : "";
        out.push(`${CHANGE_LABELS[type]} : ${sign}${delta}`);
        continue;
      }
    }
    out.push(`${CHANGE_LABELS[type]}${ns.length > 1 ? ` ×${ns.length}` : ""}`);
  }
  return out;
}
