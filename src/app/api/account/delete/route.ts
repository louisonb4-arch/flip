import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSessionUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/account/delete — supprime le compte + toutes les données de l'utilisateur CONNECTÉ.
// Sécurité : nécessite une session valide ; un visiteur non connecté reçoit 401.
export async function POST() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }

    // 1) Purge des données applicatives rattachées à l'utilisateur.
    const store = getStore();
    await store.deleteUserData(userId);

    // 2) Suppression du compte Supabase Auth (service role — serveur uniquement).
    const hasSupabase =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (hasSupabase && userId !== "demo-user") {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
      );
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) {
        console.error("[api/account/delete] suppression Auth échouée", error);
        return NextResponse.json(
          {
            error:
              "La suppression du compte a partiellement échoué. Réessaie, ou contacte le support.",
          },
          { status: 500 },
        );
      }

      // Best-effort : invalide la session courante (cookies) côté serveur.
      try {
        const { createClient: createServerClient } = await import("@/lib/supabase/server");
        const supabase = await createServerClient();
        await supabase.auth.signOut();
      } catch {
        // sans importance : le client se déconnecte aussi de son côté
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/account/delete]", e);
    return NextResponse.json(
      { error: "Erreur serveur lors de la suppression du compte." },
      { status: 500 },
    );
  }
}
