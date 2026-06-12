import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSessionUserId } from "@/lib/auth";
import { getReferralData } from "@/lib/referrals";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

    const store = getStore();
    const origin = req.nextUrl.origin;
    const data = await getReferralData(userId, store, origin);
    return NextResponse.json(data);
  } catch (e) {
    console.error("[api/referrals GET]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
