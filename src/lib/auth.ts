// Retourne l'userId de session.
// Sans env Supabase → "demo-user" (DevStore mode).
// Avec Supabase → user.id ou null si non connecté.
export async function getSessionUserId(): Promise<string | null> {
  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasSupabase) return "demo-user";

  const { createClient } = await import("./supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
