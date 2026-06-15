"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LegalLinks } from "@/components/legal";

const NOTICES: Record<string, string> = {
  unconfirmed: "Confirme d'abord ton email. On t'a envoyé un lien — vérifie ta boîte (et les spams).",
  auth: "Lien expiré ou invalide. Reconnecte-toi.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const notice = NOTICES[searchParams.get("error") ?? ""] ?? null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = error.message;
        setError(
          msg === "Invalid login credentials"
            ? "Email ou mot de passe incorrect."
            : msg === "Email not confirmed"
              ? "Email pas encore confirmé. Clique sur le lien reçu par mail pour activer ton compte."
              : msg,
        );
      } else {
        router.push(next);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-3">
      {notice && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          {notice}
        </p>
      )}
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
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
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
        {loading ? "…" : "Connexion"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Link href="/" className="text-3xl font-extrabold tracking-tight">
            Flip<span className="flip-gradient-text">.</span>
          </Link>
          <p className="mt-2 text-sm text-gray-400">Connecte-toi pour accéder à tes Flips</p>
        </div>
        <Suspense fallback={<div className="h-48" />}>
          <LoginForm />
        </Suspense>
        <p className="mt-8 text-center text-sm text-gray-400">
          Pas encore de compte ?{" "}
          <Link href="/auth/signup" className="font-bold text-flip-pink">
            Créer un compte
          </Link>
        </p>
        <LegalLinks className="mt-8" />
      </div>
    </main>
  );
}
