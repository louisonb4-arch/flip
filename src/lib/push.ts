// Envoi Web Push réel — appelé par le checker quand un Flip major est détecté.

import { getStore } from "./store";
import type { FlipCopy } from "./flip";

function vapidReady(): boolean {
  return !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;
}

// Tronque l'endpoint pour des logs lisibles (sans exposer toute l'URL push).
function shortEndpoint(endpoint: string): string {
  return endpoint.length > 48 ? `${endpoint.slice(0, 32)}…${endpoint.slice(-12)}` : endpoint;
}

export async function sendFlipPush(userIds: string[], copy: FlipCopy): Promise<number> {
  if (userIds.length === 0) return 0;
  if (!vapidReady()) {
    console.warn("[push] VAPID non configuré (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY) — aucune push envoyée");
    return 0;
  }

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(
    "mailto:flip@flip.app",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  const store = getStore();
  const payload = JSON.stringify({
    title: `${copy.emoji} ${copy.title}`,
    body: copy.body,
    url: "/notifications",
  });

  let sent = 0;
  let removed = 0;
  for (const userId of userIds) {
    // Défensif + traçable : on revérifie push_enabled ici (le checker filtre déjà,
    // mais ce log explique précisément pourquoi une push ne part pas).
    const settings = await store.getSettings(userId).catch(() => null);
    if (!settings?.push_enabled) {
      console.log(`[push] user=${userId} → SKIP (push_enabled=${settings?.push_enabled ?? "?"})`);
      continue;
    }

    const subs = await store.getPushSubscriptions(userId);
    if (subs.length === 0) {
      console.log(`[push] user=${userId} push_enabled=true mais AUCUNE subscription en base`);
      continue;
    }
    console.log(`[push] user=${userId} push_enabled=true, ${subs.length} subscription(s)`);

    for (const sub of subs) {
      if (!sub.endpoint) continue;
      try {
        await webpush.sendNotification(
          sub as Parameters<typeof webpush.sendNotification>[0],
          payload,
        );
        sent++;
        console.log(`[push] user=${userId} OK → ${shortEndpoint(sub.endpoint)}`);
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        const msg = (e as Error)?.message ?? "";
        if (status === 404 || status === 410) {
          // subscription expirée/révoquée → suppression (nettoyage).
          await store.deletePushSubscription(userId, sub.endpoint).catch(() => {});
          removed++;
          console.warn(`[push] user=${userId} subscription morte (${status}) → supprimée`);
        } else {
          console.warn(`[push] user=${userId} ÉCHEC (status=${status ?? "?"}) ${msg}`);
        }
      }
    }
  }
  console.log(
    `[push] résumé: ${sent} envoyée(s), ${removed} subscription(s) morte(s) nettoyée(s), pour ${userIds.length} cible(s)`,
  );
  return sent;
}
