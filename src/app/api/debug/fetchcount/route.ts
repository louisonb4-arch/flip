import { NextRequest, NextResponse } from "next/server";
import { fetchCounter } from "@/lib/fetcher";

export const dynamic = "force-dynamic";

// Dev/test uniquement : expose le compteur d'appels du fetcher (preuve fetch partagé).
// Désactivé si Supabase configuré (= prod).
function devOnly() {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export async function GET() {
  if (!devOnly()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  return NextResponse.json({ fetchCounter });
}

export async function DELETE(_req: NextRequest) {
  if (!devOnly()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  for (const k of Object.keys(fetchCounter)) delete fetchCounter[k];
  return NextResponse.json({ ok: true });
}
