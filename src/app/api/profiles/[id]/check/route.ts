import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSessionUserId } from "@/lib/auth";
import { checkPlatformProfile } from "@/lib/checker";
import { rateLimit } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getStore();
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

    if (!rateLimit(`check:${userId}`, 20, 60_000)) {
      return NextResponse.json({ error: "Trop de checks. Réessaie dans une minute." }, { status: 429 });
    }

    const profile = await store.getTrackedProfile(userId, id);
    if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

    const result = await checkPlatformProfile(profile);
    return NextResponse.json({ count: result.changes });
  } catch (e) {
    console.error("[api/check]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
