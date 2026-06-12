import Link from "next/link";

const FEATURES = [
  { icon: "Aa", title: "Bio modifiée", desc: "Nouvelle bio ? T'es au courant en premier." },
  { icon: "📷", title: "Photo changée", desc: "Nouvelle pp détectée direct." },
  { icon: "👤", title: "Nom affiché", desc: "Changement de nom ? Vu." },
  { icon: "🔗", title: "Lien en bio", desc: "Nouveau linktree, nouveau drop. Srx t'es au courant." },
];

export default function Landing() {
  return (
    <main className="relative overflow-hidden">
      <div className="flip-blob left-[-10%] top-[10%] h-72 w-72 bg-flip-pink" />
      <div className="flip-blob right-[-10%] top-[40%] h-80 w-80 bg-flip-orange" />

      <div className="mx-auto max-w-3xl px-6 pb-20 pt-10">
        <header className="flex items-center justify-between">
          <span className="text-2xl font-extrabold tracking-tight">
            Flip<span className="flip-gradient-text">.</span>
          </span>
          <Link
            href="/dashboard"
            className="flip-gradient rounded-full px-5 py-2 text-sm font-bold text-white shadow-lg shadow-pink-200 transition hover:scale-105"
          >
            Ouvrir l&apos;app
          </Link>
        </header>

        {/* hero */}
        <section className="mt-20 text-center">
          <p className="mx-auto mb-4 w-fit rounded-full bg-flip-soft px-4 py-1.5 text-sm font-semibold text-flip-pink">
            ⚡ Ne rate aucun update
          </p>
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Ton crush change sa bio&nbsp;?
            <br />
            <span className="flip-gradient-text">Flip te le dit.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-500">
            Suis n&apos;importe quel profil Instagram <strong>public</strong>. Bio, photo, nom,
            lien — dès que ça bouge, tu reçois une alerte.
          </p>
          <Link
            href="/dashboard"
            className="flip-gradient mt-8 inline-block rounded-full px-8 py-4 text-lg font-bold text-white shadow-xl shadow-pink-200 transition hover:scale-105"
          >
            Ajouter un profil →
          </Link>
          <p className="mt-4 text-xs text-gray-400">
            100% infos publiques. Aucun mot de passe Instagram demandé, jamais.
          </p>
        </section>

        {/* features */}
        <section className="mt-24 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="flip-card p-6">
              <span className="flip-gradient flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white">
                {f.icon}
              </span>
              <h3 className="mt-4 font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* pricing */}
        <section className="mt-24">
          <h2 className="text-center text-3xl font-extrabold">Pricing simple.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="flip-card p-8">
              <h3 className="font-bold text-gray-500">Starter</h3>
              <p className="mt-2 text-4xl font-extrabold">
                1,99€<span className="text-base font-medium text-gray-400">/mois</span>
              </p>
              <ul className="mt-6 space-y-2 text-sm text-gray-500">
                <li>✓ 3 profils suivis</li>
                <li>✓ Check toutes les heures</li>
                <li>✓ 20 derniers changements</li>
              </ul>
            </div>
            <div className="flip-card relative border-2 border-flip-pink p-8">
              <span className="flip-gradient absolute -top-3 right-6 rounded-full px-3 py-1 text-xs font-bold text-white">
                POPULAIRE
              </span>
              <h3 className="font-bold text-flip-pink">Premium</h3>
              <p className="mt-2 text-4xl font-extrabold">
                4,99€<span className="text-base font-medium text-gray-400">/mois</span>
              </p>
              <ul className="mt-6 space-y-2 text-sm text-gray-500">
                <li>✓ 25 profils suivis</li>
                <li>✓ Checks toutes les 15 min</li>
                <li>✓ Historique complet</li>
                <li>✓ Alertes prioritaires</li>
              </ul>
            </div>
          </div>
        </section>

        <footer className="mt-20 text-center text-xs text-gray-400">
          Flip suit uniquement des informations publiques observables. Pas affilié à Instagram.
        </footer>
      </div>
    </main>
  );
}
