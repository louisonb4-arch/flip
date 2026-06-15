import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSessionUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

    const hasVapid = !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;
    if (!hasVapid) {
      return NextResponse.json(
        { error: "VAPID non configuré. Ajoute VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY dans .env.local." },
        { status: 503 },
      );
    }

    const store = getStore();
    const subscriptions = await store.getPushSubscriptions(userId);
    if (subscriptions.length === 0) {
      return NextResponse.json({ error: "Aucun abonnement push actif." }, { status: 404 });
    }

    const webpush = await import("web-push");
    webpush.default.setVapidDetails(
      "mailto:flip@flip.app",
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );

    const payload = JSON.stringify({
      title: "👀 Tu as reçu un Flip",
      body: "@emma vient de changer sa bio. (test)",
      url: "/notifications",
    });

    let sent = 0;
    let removed = 0;
    for (const sub of subscriptions) {
      if (!sub.endpoint) continue;
      try {
        await webpush.default.sendNotification(
          sub as Parameters<typeof webpush.default.sendNotification>[0],
          payload,
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // subscription morte → on la supprime (le client en recrée une au prochain test)
          await store.deletePushSubscription(userId, sub.endpoint).catch(() => {});
          removed++;
          console.warn(`[api/push/test] user=${userId} subscription morte (${status}) supprimée`);
        } else {
          console.warn(`[api/push/test] user=${userId} échec (status=${status ?? "?"})`);
        }
      }
    }

    console.log(`[api/push/test] user=${userId} → ${sent} envoyée(s), ${removed} morte(s) nettoyée(s)`);
    return NextResponse.json({ sent, total: subscriptions.length, removed });
  } catch (e) {
    console.error("[api/push/test]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
