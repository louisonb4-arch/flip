# Flip

> Ton crush change sa bio ? Flip te le dit srx.

Suivi de profils Instagram **publics** : bio, photo, nom, lien, privé/public. Notification dès qu'un profil change. Historique AVANT / APRÈS. Deux plans payants : Starter 1,99€/mois, Premium 4,99€/mois.

**Disclaimer** : Flip ne suit que des informations publiques observables. Aucun identifiant Instagram n'est demandé ni stocké.

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

| | Starter 1,99€/mois | Premium 4,99€/mois |
|---|---|---|
| Profils | 3 | 25 |
| Fréquence checks | 1×/jour | toutes les 6 h |
| Historique | 20 derniers | complet |
