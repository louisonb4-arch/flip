import Link from "next/link";
import { LEGAL } from "@/lib/legal";

// Liens légaux réutilisables (footer landing, signup, login, settings).
export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-400 ${className}`}>
      <Link href="/privacy" className="transition hover:text-flip-pink">
        Confidentialité
      </Link>
      <span className="text-gray-200">·</span>
      <Link href="/terms" className="transition hover:text-flip-pink">
        CGU
      </Link>
      <span className="text-gray-200">·</span>
      <Link href="/mentions-legales" className="transition hover:text-flip-pink">
        Mentions légales
      </Link>
    </nav>
  );
}

// Conteneur commun aux pages légales.
export function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-5 py-12">
        <Link href="/" className="text-2xl font-extrabold tracking-tight">
          Flip<span className="flip-gradient-text">.</span>
        </Link>
        <h1 className="mt-8 text-3xl font-extrabold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-400">Dernière mise à jour : {LEGAL.updated}</p>
        <div className="legal-prose mt-8 text-sm leading-relaxed text-gray-600">{children}</div>

        <div className="mt-12 border-t border-gray-100 pt-6">
          <LegalLinks />
          <p className="mt-4 text-center text-xs text-gray-300">
            Flip n&apos;est pas affilié à Instagram ni à Meta Platforms, Inc.
          </p>
        </div>
      </div>
    </main>
  );
}
