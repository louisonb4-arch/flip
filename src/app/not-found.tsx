import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="text-3xl font-extrabold tracking-tight">
          Flip<span className="flip-gradient-text">.</span>
        </Link>
        <div className="mt-8 text-6xl font-extrabold text-flip-pink">404</div>
        <h1 className="mt-3 text-xl font-extrabold text-gray-900">Page introuvable</h1>
        <p className="mt-2 text-sm text-gray-500">
          Cette page a changé, ou n&apos;a jamais existé. (Flip aurait pu te prévenir 👀)
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
