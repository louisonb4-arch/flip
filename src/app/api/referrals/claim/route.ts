import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSessionUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const milestone = Number(body.milestone);
    if (![3, 6, 10].includes(milestone)) {
      return NextResponse.json({ error: "Palier invalide." }, { status: 400 });
    }

    const store = getStore();
    const rewards = await store.getUnlockedRewards(userId);
    const reward = rewards.find((r) => r.milestone === milestone);
    if (!reward) return NextResponse.json({ error: "Palier non débloqué." }, { status: 404 });

    // Persiste claimed_at de façon atomique (anti double-réclamation). Stripe le consommera plus tard.
    const res = await store.claimMilestone(userId, milestone);
    if (!res.ok) return NextResponse.json({ error: "Déjà réclamé." }, { status: 409 });
    return NextResponse.json({ ok: true, reward_days: res.reward_days });
  } catch (e) {
    console.error("[api/referrals/claim]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
