import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSessionUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

    const subscription = await req.json();
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Subscription invalide" }, { status: 400 });
    }

    const store = getStore();
    await store.savePushSubscription(userId, subscription);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/push/subscribe]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
