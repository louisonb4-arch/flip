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
  if (!user) return null;
  // Email non confirmé → pas d'accès (cohérent avec le middleware). Les routes API
  // qui appellent getSessionUserId renverront 401 tant que l'email n'est pas vérifié.
  if (!user.email_confirmed_at && !user.confirmed_at) return null;
  return user.id;
}
