import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getStore } from "@/lib/store";
import { applyReferralCode } from "@/lib/referrals";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Appliquer le code de parrainage si présent
      const cookieStore = await cookies();
      const refCode = cookieStore.get("flip_ref")?.value;
      if (refCode) {
        try {
          const store = getStore();
          await applyReferralCode(refCode, data.user.id, store);
        } catch {
          // Non bloquant
        }
        cookieStore.delete("flip_ref");
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth`);
}
