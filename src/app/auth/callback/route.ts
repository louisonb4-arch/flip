import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getStore } from "@/lib/store";
import { applyReferralCode } from "@/lib/referrals";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();
  let userId: string | null = null;

  // Deux formes de lien Supabase possibles :
  //  - PKCE : ?code=...           → exchangeCodeForSession
  //  - OTP  : ?token_hash=&type=  → verifyOtp
  // On gère les deux pour qu'un lien VALIDE n'aboutisse jamais à l'écran d'erreur.
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) userId = data.user.id;
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error && data.user) userId = data.user.id;
  }

  if (userId) {
    // Parrainage si cookie présent (non bloquant)
    const cookieStore = await cookies();
    const refCode = cookieStore.get("flip_ref")?.value;
    if (refCode) {
      try {
        await applyReferralCode(refCode, userId, getStore());
      } catch {
        /* non bloquant */
      }
      cookieStore.delete("flip_ref");
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Vrai échec uniquement : ni code ni token_hash valides (lien expiré/déjà utilisé/absent).
  return NextResponse.redirect(`${origin}/auth/login?error=auth`);
}
