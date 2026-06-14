import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/settings", "/notifications", "/referrals", "/profile"];

export async function middleware(request: NextRequest) {
  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sans Supabase → DevStore mode, pas de redirect
  if (!hasSupabase) return NextResponse.next();

  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path.startsWith(p));
  // Email confirmé ? (defense-in-depth : même si une session existe, on bloque l'accès complet
  // tant que l'email n'est pas vérifié. La vraie barrière reste le réglage Supabase "Confirm email".)
  const emailConfirmed = !!(user?.email_confirmed_at || user?.confirmed_at);

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Session présente mais email NON confirmé → pas d'accès aux pages protégées.
  if (isProtected && user && !emailConfirmed) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("error", "unconfirmed");
    return NextResponse.redirect(url);
  }

  // Déjà connecté ET confirmé → pas besoin des pages auth, on envoie au dashboard.
  if (path.startsWith("/auth/login") || path.startsWith("/auth/signup")) {
    if (user && emailConfirmed) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cron|api/push).*)"],
};
