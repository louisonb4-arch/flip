import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSessionUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/profiles/:id — profil + Flips du user + snapshots
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getStore();
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    const profile = await store.getTrackedProfile(userId, id);
    if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
    const [changes, snapshots] = await Promise.all([
      store.listNotifications(userId, { platformProfileId: id, limit: 50 }),
      store.listSnapshots(id, 10),
    ]);
    return NextResponse.json({ profile, changes, snapshots });
  } catch (e) {
    console.error("[api/profiles/:id GET]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/profiles/:id — ne plus suivre
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getStore();
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    const profile = await store.getTrackedProfile(userId, id);
    if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
    await store.untrack(userId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/profiles/:id DELETE]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
