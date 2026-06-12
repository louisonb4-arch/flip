import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSessionUserId } from "@/lib/auth";
import { applyReferralCode } from "@/lib/referrals";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const code = (body.code as string | undefined)?.trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "Code manquant." }, { status: 400 });

    const store = getStore();
    const result = await applyReferralCode(code, userId, store);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/referrals/apply]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
