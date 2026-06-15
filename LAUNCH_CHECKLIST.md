# Flip — Checklist de lancement (bêta privée → public léger)

> Objectif : valider que Flip est prêt pour **5 à 10 testeurs**. Pas de Stripe, pas de refonte.
> Positionnement : **outil de suivi de changements publics Instagram**, jamais d'espionnage.
> Promesse alignée sur la réalité : « Flip **vérifie régulièrement** les profils suivis et t'alerte **quand un profil change** » — **pas** d'« instantané ».

---

## 1. Variables d'environnement Vercel (Production) — à vérifier AVANT tout

| Variable | Rôle | Bloquant ? |
|----------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase (client + serveur) | 🔴 oui |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon (client) | 🔴 oui |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role — **serveur uniquement**, jamais exposée client | 🔴 oui |
| `PROFILE_FETCHER=web` | Active le fetch Instagram réel (sinon `mock`) | 🔴 oui |
| `RESIDENTIAL_PROXY_URLS` | Proxies résidentiels (séparés par virgule) si utilisés | 🟠 selon blocage IG |
| `CRON_SECRET` | Protège `/api/cron/check` | 🔴 oui |
| `VAPID_PUBLIC_KEY` | Web push (serveur) | 🔴 oui pour push |
| `VAPID_PRIVATE_KEY` | Web push (serveur) | 🔴 oui pour push |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web push (client, abonnement) | 🔴 oui pour push |

⚠️ **Sans les 3 VAPID**, aucune notification push ne part (`sendFlipPush` log « VAPID non configuré »).
⚠️ `SUPABASE_SERVICE_ROLE_KEY` ne doit **jamais** apparaître dans un fichier `"use client"`.

---

## 2. Protocole de test end-to-end (prod)

Dérouler dans l'ordre. Si une étape échoue → voir « Où ça bloque » plus bas.

1. **Compte neuf** : `/auth/signup` → email + mot de passe → recevoir l'email de confirmation (vérifier **spam**) → confirmer → atterrir connecté.
2. **Ajouter un profil** : dashboard → champ `@username` (un compte Instagram **public**, ex. `@matisclouet`) → « Suivre » → la ligne apparaît.
3. **Activer les push** : bannière « 🔔 Active les alertes » (ou Réglages → toggle Alertes push) → accepter la permission navigateur.
   - iPhone : **ajouter Flip à l'écran d'accueil d'abord** (Partager → Sur l'écran d'accueil), sinon push non supporté.
4. **Notification test** : Réglages → « Envoyer une notification test » → une notif doit s'afficher.
5. **Forcer le cron** :
   ```bash
   curl -s -H "Authorization: Bearer $CRON_SECRET" https://appflip.online/api/cron/check
   # → {"scanned":N,"fetched":N,"changes":N,"notifications":N}
   ```
6. **Vérifier en base** (Supabase SQL editor / MCP) :
   ```sql
   -- profil suivi
   select * from user_tracked_profiles order by created_at desc limit 5;
   -- snapshot créé (source instagram_web = fetch réel)
   select raw_data->>'source' src, max(created_at) from profile_snapshots group by 1;
   -- changements (s'il y en a eu un)
   select change_type, old_value, new_value, created_at from profile_changes order by created_at desc limit 10;
   -- notification in-app
   select user_id, seen, created_at from user_notifications order by created_at desc limit 10;
   -- push : abonnement enregistré + push activé
   select user_id, push_enabled from notification_settings;
   select count(*) from push_subscriptions;
   ```
7. **Logs Vercel** : Functions → `/api/cron/check` → lire les lignes `[cron] …` et `[push] …`.
8. **Où ça bloque (diagnostic par étape)** :
   - Pas de snapshot `instagram_web` → `PROFILE_FETCHER` ≠ `web` **ou** proxies HS (log `[checker] profil introuvable` / `tous les proxies ont échoué`).
   - Snapshot OK mais 0 change → normal si le profil n'a rien changé ; les micro-variations followers/following (< 3 et < 1 %) sont **volontairement ignorées** (anti-bruit).
   - Change OK mais 0 notif → `notification_settings` du type désactivé, ou profil sans abonné.
   - Notif OK mais pas de push → log `[push] … push_enabled=false` (toggle off) **ou** `AUCUNE subscription` **ou** « VAPID non configuré » **ou** subscription morte (404/410 → auto-supprimée, ré-active via le bouton test).
   - Cron renvoie 401 → `CRON_SECRET` absent/incorrect dans l'en-tête.

---

## 3. Tests fonctionnels

- [ ] Signup + confirmation email (et spam)
- [ ] Login / logout
- [ ] Ajout d'un `@` public → snapshot baseline créé
- [ ] Ajout d'un `@` privé → suivi possible, données limitées (normal)
- [ ] Toggle « Alertes push » → `push_enabled` passe à `true` (vérifier en base)
- [ ] Bouton « Notification test » → notif reçue
- [ ] Cron manuel → changements/notifs créés si le profil a bougé
- [ ] État vide « Aucun profil suivi » s'affiche correctement
- [ ] État vide « Aucun Flip » s'affiche correctement
- [ ] Permission push refusée → message clair affiché
- [ ] **Suppression de compte** : Réglages → Zone de danger → taper `SUPPRIMER` → confirmer → logout → page `/goodbye` ; vérifier en base que les données user sont parties
- [ ] Pages légales accessibles : `/privacy`, `/terms`, `/mentions-legales` + liens footer/signup/login/settings
- [ ] `robots.txt`, `sitemap.xml`, page 404 OK

---

## 4. Tests multi-plateformes

- [ ] iOS Safari (PWA installée écran d'accueil) — push fonctionne après install
- [ ] iOS — sans PWA : message « ajoute à l'écran d'accueil » s'affiche
- [ ] Android Chrome — push fonctionne
- [ ] Desktop Chrome/Edge — push fonctionne
- [ ] Desktop — affichage landing + dashboard responsive

---

## 5. Bugs connus / limites acceptées pour le MVP

- Cron **quotidien** (Vercel `0 8 * * *`) → détection au plus une fois/jour. Promesse produit alignée (« vérification régulière », pas instantané). Passage à plus fréquent = plan Vercel Pro (post-bêta).
- Fetch Instagram via endpoint web public → peut casser si Instagram durcit l'accès ; dépend des proxies résidentiels.
- Comptes **privés** : données limitées (bio/photo publiques uniquement, pas de posts).
- Email digest : **non envoyé** (vue in-app uniquement) — assumé pour la bêta.
- Plans payants affichés mais **paiement non branché** (mention « démo » dans Réglages).
- TikTok / autres plateformes : affichées en roadmap, **mock uniquement**, pas livrées.
- Avis « 4,9/5 » sur la landing = illustratif.

---

## 6. Volontairement repoussé APRÈS la bêta

- 💳 Stripe (paiement réel + webhooks plan)
- 📬 Email digest (cron + Resend)
- ⏱️ Cron plus fréquent (Vercel Pro)
- 🎵 TikTok + autres plateformes (fetchers réels)
- 📊 Analytics produit
- 🖼️ Vraie image OG/captures + B-roll humain pour le marketing
- 🔐 Durcissement : `handle_new_user` (SECURITY DEFINER exposé), leaked-password protection Supabase

---

## 7. Go / No-Go bêta

**GO si** : signup+confirmation OK · ajout profil → snapshot `instagram_web` · cron crée changements quand un profil bouge · push test reçue sur au moins 1 appareil · suppression compte OK · pages légales en ligne.

**NO-GO si** : pas de snapshot réel (fetch/proxy KO) · push jamais reçue (VAPID manquant) · cron 401 (secret) · service role exposé client.
