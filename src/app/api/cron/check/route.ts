import { NextRequest, NextResponse } from "next/server";
import { checkAllProfiles } from "@/lib/checker";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// GET /api/cron/check — appelé par Vercel Cron (vercel.json) ou manuellement.
// Protégé par CRON_SECRET en production.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;

  // Fail-closed en production : si CRON_SECRET n'est pas configuré, on refuse
  // d'exécuter le cron (jamais de cron ouvert sur une env mal configurée).
  if (process.env.NODE_ENV === "production" && !secret) {
    console.error("[cron] CRON_SECRET absent en production — exécution refusée.");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Si un secret est défini, le Bearer est obligatoire (un appel sans secret → 401).
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const result = await checkAllProfiles();
    console.log(
      `[cron] ${result.scanned} profils, ${result.fetched} fetchés, ` +
        `${result.changes} changements, ${result.notifications} notifications`,
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error("[cron]", e);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
