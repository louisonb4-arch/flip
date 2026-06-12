import { NextRequest, NextResponse } from "next/server";
import { getStore, getCurrentUserId } from "@/lib/store";
import { getFetcher } from "@/lib/fetcher";
import { validateUsername, rateLimit } from "@/lib/validate";
import { PLAN_LIMITS, PLATFORMS, planCap, planTotalProfiles, type Platform } from "@/lib/types";

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
    const totalCap = planTotalProfiles(user.plan);
    return NextResponse.json({ tracked, user, unseenByProfile, limits, totalCap });
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

    // plateforme (instagram par défaut), doit être supportée ET activée
    const platform = (body.platform ?? "instagram") as Platform;
    if (!PLATFORMS[platform]?.enabled) {
      return NextResponse.json({ error: "Plateforme indisponible pour le moment" }, { status: 400 });
    }

    const [user, tracked] = await Promise.all([store.getUser(userId), store.listTracked(userId)]);

    if (tracked.some((t) => t.profile.username === username && t.profile.platform === platform)) {
      return NextResponse.json({ error: `@${username} est déjà suivi` }, { status: 409 });
    }

    // quota PAR plateforme
    const cap = planCap(user.plan, platform);
    const usedOnPlatform = tracked.filter((t) => t.profile.platform === platform).length;
    if (cap === 0) {
      return NextResponse.json(
        {
          error: `${PLATFORMS[platform].label} n'est pas inclus dans ton plan. Passe à Social+ pour le débloquer.`,
          upgrade: true,
        },
        { status: 403 },
      );
    }
    if (usedOnPlatform >= cap) {
      return NextResponse.json(
        {
          error: `Limite ${cap} profils ${PLATFORMS[platform].label} atteinte. Upgrade pour en suivre plus.`,
          upgrade: true,
        },
        { status: 403 },
      );
    }

    const fresh = await getFetcher(platform).fetchProfile(username);
    if (!fresh) {
      return NextResponse.json({ error: `@${username} introuvable` }, { status: 404 });
    }

    // crée/récupère le profil GLOBAL + lie le user (fetch partagé)
    const profile = await store.trackProfile(userId, fresh, platform);
    return NextResponse.json({ profile }, { status: 201 });
  } catch (e) {
    console.error("[api/profiles POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
