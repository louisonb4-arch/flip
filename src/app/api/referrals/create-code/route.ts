import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSessionUserId } from "@/lib/auth";
import { generateCode } from "@/lib/referrals";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

    const store = getStore();
    const existing = await store.getReferralCode(userId);
    if (existing) return NextResponse.json({ code: existing });

    const user = await store.getUser(userId);
    const code = generateCode(user.email);
    const created = await store.createReferralCode(userId, code);
    return NextResponse.json({ code: created });
  } catch (e) {
    console.error("[api/referrals/create-code]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
