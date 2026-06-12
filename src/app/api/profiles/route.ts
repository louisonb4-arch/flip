import { NextRequest, NextResponse } from "next/server";
import { getStore, getCurrentUserId } from "@/lib/store";
import { getFetcher } from "@/lib/fetcher";
import { validateUsername, rateLimit } from "@/lib/validate";
import { PLAN_LIMITS } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/profiles — profils suivis + user + compteurs non-vus
export async function GET() {
  try {
    const store = getStore();
    const userId = getCurrentUserId();
    const [tracked, user, unseenByProfile] = await Promise.all([
      store.listTracked(userId),
      store.getUser(userId),
      store.unseenByProfile(userId),
    ]);
    const limits = PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.starter;
    return NextResponse.json({ tracked, user, unseenByProfile, limits });
  } catch (e) {
    console.error("[api/profiles GET]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/profiles { username } — suivre un profil public
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

    const [user, tracked] = await Promise.all([store.getUser(userId), store.listTracked(userId)]);

    if (tracked.some((t) => t.profile.username === username)) {
      return NextResponse.json({ error: `@${username} est déjà suivi` }, { status: 409 });
    }

    const limit = (PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.starter).maxProfiles;
    if (tracked.length >= limit) {
      return NextResponse.json(
        { error: `Limite ${limit} profils atteinte. Passe premium pour en suivre plus.`, upgrade: true },
        { status: 403 },
      );
    }

    const fresh = await getFetcher().fetchProfile(username);
    if (!fresh) {
      return NextResponse.json({ error: `@${username} introuvable` }, { status: 404 });
    }

    // crée/récupère le profil GLOBAL + lie le user (fetch partagé)
    const profile = await store.trackProfile(userId, fresh);
    return NextResponse.json({ profile }, { status: 201 });
  } catch (e) {
    console.error("[api/profiles POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
