import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

// Lien d'invitation. Route Handler (et non page) : seul un Route Handler / Server Action
// peut écrire un cookie dans Next. On valide le code, on le pose en cookie, puis on
// arrive sur la PAGE D'ACCUEIL (le cookie survit jusqu'à l'inscription → callback l'applique).
export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const upperCode = code.toUpperCase();
  const origin = req.nextUrl.origin;

  const store = getStore();
  const referrerId = await store.getReferrerByCode(upperCode);

  // Code invalide → landing sans cookie.
  if (!referrerId) {
    return NextResponse.redirect(`${origin}/?ref=invalid`);
  }

  // Code valide → cookie 7 jours + landing.
  const res = NextResponse.redirect(`${origin}/`);
  res.cookies.set("flip_ref", upperCode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax",
  });
  return res;
}
