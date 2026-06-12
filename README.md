# Flip

> Flip surveille les changements publics sur internet.

Suivi de profils **publics** : bio, photo, nom, lien, privé/public, abonnés, posts. Notification dès qu'un profil change. Historique AVANT / APRÈS + digest hebdo. Instagram est la première plateforme ; l'architecture est multi-plateformes (TikTok, X, Twitch, YouTube, GitHub, LinkedIn à venir).

Trois plans : Starter 1,99€, Premium 4,99€, Social+ 9,99€ (multi-plateformes).

**Disclaimer** : Flip ne suit que des informations publiques observables. Aucun identifiant des plateformes n'est demandé ni stocké.

## Stack

- Next.js 16 (App Router) + Tailwind v4
- Supabase (Auth + Postgres + RLS) — migrations dans `supabase/migrations/`
- Cron Vercel (`vercel.json`, toutes les heures ; chaque profil fetché seulement si son intervalle de plan est écoulé → coût data maîtrisé)
- `ProfileFetcher` modulaire : mock en dev, provider externe en prod

## Dev

```bash
npm install
npm run dev
```

Sans clés Supabase → **DevStore** local (`.data/dev-db.json`), user démo, fetcher mock (les profils mock "changent" toutes les ~2 min → la détection est testable en live).

## Production

1. Créer un projet Supabase, exécuter `supabase/migrations/001_init.sql`.
2. Copier `.env.example` → `.env.local`, remplir `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.
3. Brancher un provider de données publiques : `PROFILE_FETCHER=external` + `PROFILE_PROVIDER_URL/KEY`.
4. Déployer sur Vercel — le cron `/api/cron/check` tourne automatiquement.
5. Stripe : webhooks → `subscriptions` + `users.plan` (architecture prête, à brancher).

## API

| Méthode | Route | Rôle |
|---|---|---|
| GET/POST | `/api/profiles` | lister / ajouter (validation + rate limit + limite plan) |
| GET/DELETE | `/api/profiles/:id` | détail / supprimer |
| POST | `/api/profiles/:id/check` | check manuel |
| GET/POST | `/api/changes` | historique (filtre `?type=`) / marquer vu |
| GET/PATCH | `/api/settings` | préférences notifs + plan |
| GET | `/api/cron/check` | check global (protégé `CRON_SECRET`) |

## Plans

| | Starter 1,99€ | Premium 4,99€ | Social+ 9,99€ |
|---|---|---|---|
| Instagram | 3 profils | 15 profils | 30 profils |
| TikTok | — | — | 10 profils |
| Fréquence checks | 1×/jour | toutes les 6 h | toutes les 2 h |
| Historique | 20 derniers | complet | complet |
| Digest hebdo | — | — | ✓ |

Quotas définis par plateforme dans `PLAN_LIMITS` ([types.ts](src/lib/types.ts)). Ajouter une plateforme = ajouter une entrée dans `PLATFORMS` (`enabled`) + un fetcher.
