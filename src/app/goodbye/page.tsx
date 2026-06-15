import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Compte supprimé — Flip",
  description: "Ton compte Flip et tes données ont été supprimés.",
  robots: { index: false, follow: false },
};

export default function GoodbyePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="text-3xl font-extrabold tracking-tight">
          Flip<span className="flip-gradient-text">.</span>
        </Link>
        <div className="mt-8 text-5xl">👋</div>
        <h1 className="mt-4 text-2xl font-extrabold text-gray-900">Compte supprimé</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          Ton compte et tes données (comptes suivis, notifications, abonnements, parrainage) ont été
          supprimés. À bientôt, peut-être.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full border border-pink-100 bg-flip-soft px-6 py-3 text-sm font-bold text-flip-pink transition hover:bg-pink-100"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
