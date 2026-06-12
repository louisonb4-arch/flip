import { NextRequest, NextResponse } from "next/server";
import { getStore, getCurrentUserId } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/profiles/:id — profil + changements + snapshots
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getStore();
    const userId = getCurrentUserId();
    const profile = await store.getProfile(userId, id);
    if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
    const [changes, snapshots] = await Promise.all([
      store.listChanges(userId, { profileId: id, limit: 50 }),
      store.listSnapshots(id, 10),
    ]);
    return NextResponse.json({ profile, changes, snapshots });
  } catch (e) {
    console.error("[api/profiles/:id GET]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/profiles/:id
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getStore();
    const userId = getCurrentUserId();
    const profile = await store.getProfile(userId, id);
    if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
    await store.deleteProfile(userId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/profiles/:id DELETE]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
