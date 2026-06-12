import { NextRequest, NextResponse } from "next/server";
import { getStore, getCurrentUserId } from "@/lib/store";
import { getFetcher } from "@/lib/fetcher";
import { validateUsername, rateLimit } from "@/lib/validate";
import { PLAN_LIMITS } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/profiles — profils suivis + user
export async function GET() {
  try {
    const store = getStore();
    const userId = getCurrentUserId();
    const [profiles, user, changes] = await Promise.all([
      store.listProfiles(userId),
      store.getUser(userId),
      store.listChanges(userId, { limit: 50 }),
    ]);
    const unseenByProfile: Record<string, number> = {};
    for (const c of changes) {
      if (!c.seen) unseenByProfile[c.tracked_profile_id] = (unseenByProfile[c.tracked_profile_id] ?? 0) + 1;
    }
    return NextResponse.json({
      profiles,
      user,
      unseenByProfile,
      limits: PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.starter,
    });
  } catch (e) {
    console.error("[api/profiles GET]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/profiles { username } — ajouter un profil public
export async function POST(req: NextRequest) {
  try {
    const store = getStore();
    const userId = getCurrentUserId();

    if (!rateLimit(`add:${userId}`, 10, 60_000)) {
      return NextResponse.json({ error: "Doucement. Réessaie dans une minute." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const username = validateUsername(body.username);
    if (!username) {
      return NextResponse.json({ error: "Username invalide" }, { status: 400 });
    }

    const [user, existing] = await Promise.all([store.getUser(userId), store.listProfiles(userId)]);

    if (existing.some((p) => p.username === username)) {
      return NextResponse.json({ error: `@${username} est déjà suivi` }, { status: 409 });
    }

    const limit = (PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.starter).maxProfiles;
    if (existing.length >= limit) {
      return NextResponse.json(
        { error: `Limite ${limit} profils atteinte. Passe premium pour en suivre plus.`, upgrade: true },
        { status: 403 },
      );
    }

    const fresh = await getFetcher().fetchProfile(username);
    if (!fresh) {
      return NextResponse.json({ error: `@${username} introuvable` }, { status: 404 });
    }

    const profile = await store.addProfile(userId, fresh);
    await store.addSnapshot(profile.id, fresh); // baseline

    return NextResponse.json({ profile }, { status: 201 });
  } catch (e) {
    console.error("[api/profiles POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
