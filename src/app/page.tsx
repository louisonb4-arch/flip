import Link from "next/link";
import { cookies } from "next/headers";

const FEATURES = [
  { icon: "🔔", title: "Alertes", sub: "instantanées" },
  { icon: "🕐", title: "Historique", sub: "complet" },
  { icon: "📈", title: "Suivi avancé", sub: "abonnés, posts" },
  { icon: "🛡️", title: "100% privé", sub: "et sécurisé" },
];

const STEPS = [
  { n: 1, icon: "➕", title: "Ajoute un profil", sub: "en 2 secondes" },
  { n: 2, icon: "⚡", title: "On surveille", sub: "les changements" },
  { n: 3, icon: "📲", title: "Tu reçois un Flip", sub: "dès que ça bouge" },
];

export default async function Landing() {
  // Lien d'invitation : le code reste en cookie (posé par /invite/[code]) → on adapte le CTA.
  const invited = (await cookies()).get("flip_ref")?.value ?? null;

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
            href="/auth/login"
            className="rounded-full border border-pink-100 px-5 py-2 text-sm font-bold text-flip-pink transition hover:border-flip-pink"
          >
            Connexion
          </Link>
        </header>

        {/* hero */}
        <section className="mt-20 text-center">
          {invited ? (
            <p className="mx-auto mb-4 w-fit rounded-full bg-flip-soft px-4 py-1.5 text-sm font-semibold text-flip-pink">
              🎁 Tu as été invité — 3 jours offerts à l&apos;inscription
            </p>
          ) : (
            <p className="mx-auto mb-4 w-fit rounded-full bg-flip-soft px-4 py-1.5 text-sm font-semibold text-flip-pink">
              ⚡ Ne rate aucun update
            </p>
          )}
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
            href="/auth/signup"
            className="flip-gradient mt-8 inline-block rounded-full px-8 py-4 text-lg font-bold text-white shadow-xl shadow-pink-200 transition hover:scale-105"
          >
            Ajouter un profil →
          </Link>
          <p className="mt-4 text-xs text-gray-400">
            100% infos publiques. Aucun mot de passe Instagram demandé, jamais.
          </p>
        </section>

        {/* features — rangée compacte */}
        <section className="mt-14 grid grid-cols-4 gap-3 text-center">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex flex-col items-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-flip-soft text-xl">
                {f.icon}
              </span>
              <p className="mt-2 text-xs font-bold sm:text-sm">{f.title}</p>
              <p className="text-[11px] text-gray-400 sm:text-xs">{f.sub}</p>
            </div>
          ))}
        </section>

        {/* comment ça marche */}
        <section className="mt-20">
          <h2 className="text-center text-2xl font-extrabold sm:text-3xl">Comment ça marche ?</h2>
          <div className="mt-8 flex items-start justify-between gap-2">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex flex-1 items-start">
                <div className="flex flex-1 flex-col items-center text-center">
                  <div className="relative">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-flip-soft text-2xl">
                      {s.icon}
                    </span>
                    <span className="flip-gradient absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shadow">
                      {s.n}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-bold">{s.title}</p>
                  <p className="text-xs text-gray-400">{s.sub}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="mt-7 hidden h-px flex-1 border-t-2 border-dashed border-pink-200 sm:block" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* avis */}
        <section className="mt-16">
          <div className="flip-card mx-auto flex max-w-md items-center gap-4 p-5">
            <div className="flex shrink-0 -space-x-3">
              {["a", "b", "c"].map((s) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={s}
                  src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${s}`}
                  alt=""
                  className="h-10 w-10 rounded-full border-2 border-white bg-flip-soft"
                />
              ))}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-400">
                ★★★★★ <span className="text-flip-ink">4,9/5</span>
              </p>
              <p className="mt-0.5 text-sm text-gray-500">
                « Simple, efficace, addictif. Je ne rate plus aucun changement. »
              </p>
            </div>
          </div>
        </section>

        {/* pricing */}
        <section className="mt-24">
          <h2 className="text-center text-3xl font-extrabold">Choisis ton plan.</h2>
          <p className="mx-auto mt-2 max-w-md text-center text-sm text-gray-400">
            Des limites claires, sans jargon. Tu sais exactement ce que tu suis.
          </p>

          <div className="mt-10 grid items-start gap-5 lg:grid-cols-3">
            {/* Flip Mini */}
            <div className="flip-card flex flex-col p-7">
              <h3 className="font-bold text-gray-500">Flip Mini</h3>
              <p className="mt-1 text-xs text-gray-400">Vérification quotidienne.</p>
              <p className="mt-4 text-4xl font-extrabold">
                1,99€<span className="text-base font-medium text-gray-400">/mois</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-gray-600">
                <li>📸 <strong>3 profils</strong> Instagram</li>
                <li>🕐 <strong>Vérification quotidienne</strong></li>
                <li>📋 20 derniers changements</li>
                <li>🔔 Alertes de base</li>
              </ul>
              <Link
                href="/auth/signup"
                className="mt-7 rounded-full border border-gray-200 py-3 text-center text-sm font-bold text-gray-600 transition hover:border-flip-pink hover:text-flip-pink"
              >
                Commencer
              </Link>
            </div>

            {/* Flip Plus — mis en avant */}
            <div className="flip-card relative flex flex-col border-2 border-flip-pink p-7 shadow-xl shadow-pink-100 lg:-mt-4 lg:scale-[1.04]">
              <span className="flip-gradient absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-xs font-bold text-white shadow">
                ⭐ POPULAIRE
              </span>
              <h3 className="font-bold text-flip-pink">Flip Plus</h3>
              <p className="mt-1 text-xs text-gray-400">Surveillance renforcée.</p>
              <p className="mt-4 text-4xl font-extrabold">
                4,99€<span className="text-base font-medium text-gray-400">/mois</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-gray-600">
                <li>📸 <strong>15 profils</strong> Instagram</li>
                <li>⚡ <strong>Surveillance renforcée</strong></li>
                <li>📚 Historique complet</li>
                <li>🚀 Alertes prioritaires</li>
                <li>🔀 Comparaison Avant / Après</li>
                <li>⏱️ Notifications instantanées</li>
              </ul>
              <Link
                href="/auth/signup"
                className="flip-gradient mt-7 rounded-full py-3 text-center text-sm font-bold text-white shadow-lg shadow-pink-200 transition hover:scale-105"
              >
                Passer Flip Plus
              </Link>
            </div>

            {/* Flip Ultra — multi-plateformes */}
            <div className="flip-card relative flex flex-col border border-indigo-100 p-7">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-1 text-xs font-bold text-white shadow">
                ✨ Multi-plateformes
              </span>
              <h3 className="font-bold text-indigo-500">Flip Ultra</h3>
              <p className="mt-1 text-xs text-gray-400">Surveillance prioritaire.</p>
              <p className="mt-4 text-4xl font-extrabold">
                9,99€<span className="text-base font-medium text-gray-400">/mois</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-gray-600">
                <li>📸 <strong>25 profils</strong> Instagram</li>
                <li className="font-semibold text-indigo-600">🎵 <strong>+ 10 profils</strong> TikTok</li>
                <li>⚡ <strong>Surveillance prioritaire</strong></li>
                <li>📚 Historique complet</li>
                <li>📬 Digest hebdomadaire</li>
                <li>📈 Suivi avancé followers / posts</li>
                <li>🆕 Accès anticipé aux nouvelles plateformes</li>
              </ul>
              <Link
                href="/auth/signup"
                className="mt-7 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 py-3 text-center text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:scale-105"
              >
                Passer Flip Ultra
              </Link>
            </div>
          </div>

          {/* roadmap plateformes */}
          <div className="mt-12 text-center">
            <p className="text-sm font-semibold text-gray-500">Bientôt sur Flip</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {[
                { e: "𝕏", l: "X / Twitter" },
                { e: "🎮", l: "Twitch" },
                { e: "▶️", l: "YouTube" },
                { e: "🐙", l: "GitHub" },
                { e: "💼", l: "LinkedIn" },
              ].map((p) => (
                <span
                  key={p.l}
                  className="rounded-full border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-400"
                >
                  {p.e} {p.l}
                </span>
              ))}
            </div>
            <p className="mx-auto mt-4 max-w-md text-xs text-gray-400">
              Flip surveille les changements publics sur internet. Instagram n&apos;est que la première
              plateforme.
            </p>
          </div>
        </section>

        <footer className="mt-20 text-center text-xs text-gray-400">
          Flip suit uniquement des informations publiques observables. Pas affilié aux plateformes
          surveillées.
        </footer>
      </div>
    </main>
  );
}
