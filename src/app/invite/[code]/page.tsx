import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getStore } from "@/lib/store";

// Page publique : stocke le code de parrainage + redirige vers signup.
export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  // Valider que le code existe
  const store = getStore();
  const referrerId = await store.getReferrerByCode(upperCode);

  if (!referrerId) {
    redirect("/auth/signup?error=invalid_code");
  }

  // Stocker le code dans un cookie (7 jours)
  const cookieStore = await cookies();
  cookieStore.set("flip_ref", upperCode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax",
  });

  redirect("/auth/signup?ref=1");
}
