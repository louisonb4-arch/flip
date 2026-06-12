// Envoi Web Push réel — appelé par le checker quand un Flip major est détecté.

import { getStore } from "./store";
import type { FlipCopy } from "./flip";

function vapidReady(): boolean {
  return !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;
}

export async function sendFlipPush(userIds: string[], copy: FlipCopy): Promise<number> {
  if (!vapidReady() || userIds.length === 0) return 0;

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
  for (const userId of userIds) {
    const subs = await store.getPushSubscriptions(userId);
    for (const sub of subs) {
      if (!sub.endpoint) continue;
      try {
        await webpush.sendNotification(
          sub as Parameters<typeof webpush.sendNotification>[0],
          payload,
        );
        sent++;
      } catch (e) {
        // 404/410 = subscription expirée → ignorer (nettoyage plus tard)
        const status = (e as { statusCode?: number }).statusCode;
        if (status !== 404 && status !== 410) {
          console.warn(`[push] échec envoi user ${userId}:`, status);
        }
      }
    }
  }
  return sent;
}
