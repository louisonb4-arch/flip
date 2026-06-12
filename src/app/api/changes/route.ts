import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSessionUserId } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/changes?type=bio — feed de notifications du user
export async function GET(req: NextRequest) {
  try {
    const store = getStore();
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    const user = await store.getUser(userId);
    const type = req.nextUrl.searchParams.get("type") ?? undefined;
    // historique complet selon le plan, sinon 20 derniers
    const full = PLAN_LIMITS[user.plan].historyFull;
    const limit = full ? 500 : 20;
    const changes = await store.listNotifications(userId, { type, limit });
    return NextResponse.json({ changes, plan: user.plan, limited: !full });
  } catch (e) {
    console.error("[api/changes GET]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/changes — marquer tout vu
export async function POST() {
  try {
    const store = getStore();
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    await store.markSeen(userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/changes POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
