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

    const results = await Promise.allSettled(
      subscriptions
        .filter((sub) => !!sub.endpoint)
        .map((sub) =>
          webpush.default.sendNotification(
            sub as Parameters<typeof webpush.default.sendNotification>[0],
            payload,
          ),
        ),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return NextResponse.json({ sent, total: subscriptions.length });
  } catch (e) {
    console.error("[api/push/test]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
