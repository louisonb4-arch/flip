import { NextRequest, NextResponse } from "next/server";
import { getStore, getCurrentUserId } from "@/lib/store";
import { checkProfile } from "@/lib/checker";
import { rateLimit } from "@/lib/validate";

export const dynamic = "force-dynamic";

// POST /api/profiles/:id/check — check manuel immédiat
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getStore();
    const userId = getCurrentUserId();

    if (!rateLimit(`check:${userId}`, 20, 60_000)) {
      return NextResponse.json({ error: "Trop de checks. Réessaie dans une minute." }, { status: 429 });
    }

    const profile = await store.getProfile(userId, id);
    if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

    const changes = await checkProfile(profile);
    return NextResponse.json({ changes, count: changes.length });
  } catch (e) {
    console.error("[api/check]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
