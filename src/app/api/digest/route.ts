import { NextRequest, NextResponse } from "next/server";
import { getStore, getCurrentUserId } from "@/lib/store";
import { buildDigest } from "@/lib/digest";

export const dynamic = "force-dynamic";

// GET /api/digest?period=weekly — résumé des changements (rétention)
export async function GET(req: NextRequest) {
  try {
    const userId = getCurrentUserId();
    const period = req.nextUrl.searchParams.get("period") === "daily" ? "daily" : "weekly";
    const digest = await buildDigest(userId, period);
    return NextResponse.json(digest);
  } catch (e) {
    console.error("[api/digest GET]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/digest — marquer le digest comme consommé (reset)
export async function POST() {
  try {
    const store = getStore();
    await store.markDigested(getCurrentUserId());
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/digest POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
