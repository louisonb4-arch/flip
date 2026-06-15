"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LegalLinks } from "@/components/legal";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
      } else {
        setDone(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="w-full max-w-sm text-center">
          <span className="text-5xl">📬</span>
          <h1 className="mt-6 text-2xl font-extrabold">Vérifie tes emails</h1>
          <p className="mt-3 text-sm text-gray-400">
            Un lien de confirmation a été envoyé à <strong>{email}</strong>.<br />
            Clique dessus pour activer ton compte Flip.
          </p>
          <Link
            href="/auth/login"
            className="mt-8 inline-block text-sm font-bold text-flip-pink underline"
          >
            Retour à la connexion
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Link href="/" className="text-3xl font-extrabold tracking-tight">
            Flip<span className="flip-gradient-text">.</span>
          </Link>
          <p className="mt-2 text-sm text-gray-400">Crée ton compte, c&apos;est gratuit</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-2xl border border-pink-100 px-5 py-4 text-sm outline-none focus:border-flip-pink"
          />
          <input
            type="password"
            placeholder="Mot de passe (6 caractères min.)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-2xl border border-pink-100 px-5 py-4 text-sm outline-none focus:border-flip-pink"
          />

          {error && (
            <p className="rounded-2xl bg-flip-soft px-4 py-3 text-sm font-medium text-flip-pink">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flip-gradient w-full rounded-full py-4 font-bold text-white shadow-lg shadow-pink-200 transition hover:scale-[1.02] disabled:opacity-40"
          >
            {loading ? "…" : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-gray-400">
          En créant un compte (réservé aux 15 ans et plus), tu acceptes les{" "}
          <Link href="/terms" className="font-semibold text-flip-pink">
            CGU
          </Link>{" "}
          et la{" "}
          <Link href="/privacy" className="font-semibold text-flip-pink">
            politique de confidentialité
          </Link>
          . Flip suit uniquement des informations publiques.
        </p>

        <p className="mt-6 text-center text-sm text-gray-400">
          Déjà un compte ?{" "}
          <Link href="/auth/login" className="font-bold text-flip-pink">
            Se connecter
          </Link>
        </p>

        <LegalLinks className="mt-8" />
      </div>
    </main>
  );
}
