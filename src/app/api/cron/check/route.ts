import { NextRequest, NextResponse } from "next/server";
import { checkAllProfiles } from "@/lib/checker";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// GET /api/cron/check — appelé par Vercel Cron (vercel.json) ou manuellement.
// Protégé par CRON_SECRET en production.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const result = await checkAllProfiles();
    console.log(`[cron] ${result.checked} profils checkés, ${result.changes} changements`);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[cron]", e);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
