import { NextRequest, NextResponse } from "next/server";
import { getStore, getCurrentUserId } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/changes?type=bio — feed de notifications du user
export async function GET(req: NextRequest) {
  try {
    const store = getStore();
    const userId = getCurrentUserId();
    const user = await store.getUser(userId);
    const type = req.nextUrl.searchParams.get("type") ?? undefined;
    // historique limité à 20 en starter, complet en premium
    const limit = user.plan === "premium" ? 500 : 20;
    const changes = await store.listNotifications(userId, { type, limit });
    return NextResponse.json({ changes, plan: user.plan, limited: user.plan === "starter" });
  } catch (e) {
    console.error("[api/changes GET]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/changes — marquer tout vu
export async function POST() {
  try {
    const store = getStore();
    await store.markSeen(getCurrentUserId());
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/changes POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
