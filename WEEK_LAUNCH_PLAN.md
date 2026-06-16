# Flip — Plan de lancement (semaine)

Objectif : Flip prêt pour lancement bêta **payant** sur `appflip.online` d'ici fin de semaine.
Règle : push direct sur `main`, jamais casser la prod. Chaque bloc finit par `lint` + `build` + smoke test.

Priorité absolue (ne pas dévier) : **1. paiement → 2. limites plans → 3. sécurité → 4. légal → 5. QA → 6. lancement.**
Gelé jusqu'au lancement : vidéos, TikTok réel, analytics avancés, email digest, refonte design, nouvelles features, **build iOS/Capacitor**.

> **Scope de la semaine = web app payante (Stripe + plans + légal + QA).** L'App Store est une **roadmap séparée** (`APPLE_STORE_PLAN.md`) — **aucun build Capacitor cette semaine**.

---

## Contexte marché, Stripe & taxes (décidé 2026-06-16)
- **Marché #1 : France.** Prix affichés en **EUR**, attendus **TTC** (TVA incluse) par le consommateur FR.
- **Compte Stripe : Canada** (opéré depuis le Québec ; pas de structure légale FR/UE → **ne pas** ouvrir Stripe France).
- **Devise client : EUR** · **Settlement/payout : CAD** (conversion Stripe ~2%, à confirmer dashboard ; option de garder un solde EUR à vérifier).
- **Frais Stripe (tarif officiel Canada)** : **2,9% + CA$0,30** par transaction (base). **+0,8%** pour les cartes internationales. **+2%** en cas de conversion de devise. Un client **France payant en EUR** sur un **compte Canada** = carte internationale **+** conversion probable → **≈ 5,7% + CA$0,30** (~€0,20) effectif. À confirmer dans le dashboard Stripe.
- **TVA UE/France (à NE PAS ignorer)** : vente de service numérique **B2C à des consommateurs UE** = TVA due **dès le 1er euro** pour un vendeur non-UE (aucun seuil). Prix EUR affichés = **TTC** → ~20% (taux FR) sortent du chiffre d'affaires. **Stripe Tax aide à calculer, collecter et reporter les taxes** ; la **déclaration/remise** TVA via **Non-Union OSS**, Stripe Tax Complete ou un partenaire **doit être validée avec un comptable**.
- **Côté Canada** : revenus soumis à l'**impôt canadien** (déclaration). **GST/QST** surtout si vente à des clients **canadiens** ; cible 100% FR → à valider comptable. Immatriculation entreprise QC selon statut (travailleur autonome possible).
- **Impact marge** : pousser **l'annuel** (1 seul frais fixe/an). Tableau corrigé ci-dessous.

### Marge nette corrigée (frais Stripe CA-international + conversion ; var infra réaliste @1€/1k ; fixe 88€)
| Plan | Prix TTC | **Sans TVA** (optimiste) | **Avec TVA FR 20% TTC** (réaliste/conforme) |
|------|------|------|------|
| Mini | 3,99€ | ~3,43€ (86%) | ~2,77€ (69%) |
| Plus | 7,99€ | ~6,26€ (78%) | ~4,92€ (62%) |
| Ultra | 14,99€ | ~11,96€ (80%) | ~9,46€ (63%) |
| **Seuil rentabilité** (mix 60/30/10) | | **~17 abonnés** | **~22 abonnés** |

Frais Stripe modélisés : ≈5,7% + CA$0,30 (~€0,20). Var infra réaliste @1€/1k (backoff actif). Fixe 88€/mois.

→ Si tu collectes la TVA (obligatoire pour un vrai lancement FR), marges réelles **60-67%**, seuil **~22**. Toujours rentable, mais ~20% de moins que mon modèle initial. Décision à prendre : **prix TTC tels quels** (tu absorbes la TVA) **ou** monter les prix pour préserver la marge.

---

## État actuel (audit Phase 0 — 2026-06-16)

| Brique | État | Détail |
|--------|------|--------|
| Auth (signup/login/logout) | ✅ Prêt | email confirm enforced (middleware + `auth.ts`), Resend SMTP branché et délivre |
| RLS Supabase | ✅ Prêt | activé sur les 13 tables, policies présentes |
| Limites plan (API) | ✅ Prêt | `profiles/route.ts` → `planCap` 403 + rate-limit 429 |
| Suppression compte | ✅ Prêt | in-app, auth-gated, service-role serveur, purge data + Auth user |
| Wording / pricing | ✅ Prêt | safe, finalisé (commit `f5fe6f8`) |
| Secrets | ✅ Prêt | pas de leak client, service role serveur uniquement |
| Push web | ◐ Partiel | code prêt (`web-push`, routes, `sendFlipPush`) — VAPID prod non confirmé, 0 test device, `push_enabled=false` sur les 2 users |
| Cron/checker | ◐ Partiel | logique OK (priorité + backoff) — `CRON_SECRET` **fail-open** si non défini ; cron 1×/j (Hobby) |
| Légal | ◐ Partiel | pages existent (privacy/terms/mentions) — manque refund/annulation, opt-out tiers, anti-harcèlement, mineurs |
| **Stripe** | ✗ Manquant | table `subscriptions` existe (colonnes OK) mais **non câblée** ; 0 dépendance, 0 checkout/webhook/portail |
| **Accès ↔ abonnement** | ✗ Manquant | `access.ts` ne compte qu'essai+bonus, **ignore l'abonnement** → un payant perd l'accès après l'essai |

---

## Risques classés

### P0 — bloquent le lancement payant
- **P0-1 Stripe absent** : impossible d'encaisser. Fichiers : tout à créer (`lib/stripe.ts`, `api/stripe/*`).
- **P0-2 Accès non lié à l'abonnement** : `access.ts` doit accorder l'accès si `subscriptions.status ∈ {active, trialing}`. Sinon payer ne sert à rien après l'essai.
- **P0-3 TVA UE/France (légal, bloque le lancement public FR)** :
  - prix EUR affichés **TTC**
  - **TVA française/UE à gérer** dès le 1er euro (vendeur non-UE → consommateurs FR)
  - **Non-Union OSS** (ou solution équivalente) pour déclarer/remettre
  - **comptable recommandé avant volume** ; Stripe Tax calcule/collecte/reporte, mais la déclaration/remise doit être validée par un comptable

### P1 — à régler avant d'ouvrir au public
- **P1-1 `CRON_SECRET` fail-open** (`api/cron/check/route.ts:11`) : si l'env n'est pas défini en prod, le cron est ouvert → dépense fetch / DoS. Confirmer la var + rendre fail-closed en prod.
- **P1-2 VAPID prod non confirmé** : sans les 3 clés en prod → 0 push. Confirmer + test device réel.
- **P1-3 Webhook Stripe** : doit vérifier la signature (`STRIPE_WEBHOOK_SECRET`) — source de vérité unique du plan. Jamais faire confiance au client.
- **P1-4 Légal payant** : vendre à des consommateurs UE impose une politique d'annulation/remboursement claire (droit de rétractation UE 14j + exception service numérique avec consentement). Page à créer.
- (TVA UE → promue **P0-3**, voir ci-dessus.)

### P2 — à corriger, non bloquant
- **P2-1** `handle_new_user` `SECURITY DEFINER` exécutable par `anon`/`authenticated` → `REVOKE EXECUTE`.
- **P2-2** Leaked-password protection désactivée (Supabase Auth) → activer (dashboard).
- **P2-3** Positionnement « surveillance » : risque légal (RGPD tiers) + Apple. Renforcer opt-out + anti-harcèlement.
- **P2-4** Annuel −20% (39/79/149€) pas dans l'UI.

---

## Planning jour par jour

### Jour 1 — Audit + socle (FAIT en partie)
- [x] Audit Phase 0 + ce plan.
- [ ] Fix P2-1 (revoke EXECUTE handle_new_user) — migration SQL (avec test).
- [ ] Activer leaked-password protection (P2-2, user dashboard).
- [ ] `CRON_SECRET` fail-closed en prod (P1-1).
- **Validation** : `lint` + `build` verts ; `curl` cron sans secret → 401 en prod.

### Jour 2 — Stripe (cœur)
- [ ] `npm i stripe`.
- [ ] `lib/stripe.ts` (client serveur, clé secrète).
- [ ] Créer products/prices dans Stripe **en EUR** (Mini/Plus/Ultra mensuel + annuel) — IDs en env. Compte **Canada**, devise présentation **EUR**.
- [ ] Activer **Stripe Tax** (TVA UE/FR automatique) + décider prix **TTC** (inclusif) vs HT+TVA au checkout.
- [ ] `api/stripe/checkout` (crée Checkout Session, `client_reference_id = userId`).
- [ ] `api/stripe/webhook` (signature vérifiée ; events `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed`) → upsert `subscriptions` + `setPlan`.
- [ ] `api/stripe/portal` (Customer Portal session).
- [ ] Pages `success` / `cancel`.
- [ ] Logs `[stripe]` partout.
- **Validation** : test mode Stripe — checkout test card `4242…` → webhook reçu (signature OK) → ligne `subscriptions` créée → `users.plan` mis à jour. `lint` + `build`.

### Jour 3 — Gating plans + UI billing
- [ ] `access.ts` : accès = essai+bonus **OU** abonnement actif/trialing (P0-2).
- [ ] Re-vérifier limites profils côté API (déjà OK) + message clair quand limite atteinte (UI).
- [ ] `settings` : remplacer le toggle démo par boutons Checkout réels + bouton « Gérer mon abonnement » (portal) + état paiement (`active`/`trialing`/`past_due`/`canceled`).
- [ ] Dashboard : badge plan + jours d'essai restants + CTA upgrade cohérent.
- **Validation** : user free voit la limite ; après checkout → plan monte ; annulation portal → retombe ; `past_due` → message clair. `lint` + `build`.

### Jour 4 — Légal + sécurité + compte
- [ ] Durcir Privacy (données traitées, profils publics uniquement, base légale, **opt-out tiers**, fonctionnement périodique « certains changements peuvent ne pas être détectés », suppression compte, contact support).
- [ ] Terms (abonnement, annulation, **remboursement/rétractation UE 14j + exception service numérique**, responsabilité limitée, **interdiction harcèlement**, âge/mineurs, non-affiliation Instagram/Meta).
- [ ] Mentions légales (**éditeur = entité/personne au Québec**, hébergeur, contact) — cohérent avec compte Stripe Canada.
- [ ] Page « Politique d'annulation & remboursement » + **mention TVA** (prix TTC, n° TVA UE OSS si applicable).
- [ ] **TVA** : valider Stripe Tax / Non-Union OSS avec comptable avant ouverture publique (P1-5).
- [ ] Footer + liens légaux sur **toutes** les pages clés (landing, settings, auth).
- [ ] Email support visible (`support@appflip.online` ou équivalent).
- [ ] Re-test suppression compte E2E.
- **Note** : disclaimer « validation juriste recommandée avant lancement public large ».
- **Validation** : toutes les pages légales accessibles, liées, cohérentes. Suppression compte OK. `lint` + `build`.

### Jour 5 — Cron / Push / Referrals / QA E2E
- [ ] Confirmer VAPID prod + test push device réel (P1-2).
- [ ] Cron manuel authentifié (`curl -H "Authorization: Bearer $CRON_SECRET"`) → vérifier logs.
- [ ] Referrals : créer code → appliquer → bonus crédités → anti double-claim.
- [ ] `FINAL_QA_REPORT.md` : exécuter toute la matrice (voir Phase 5).
- **Validation** : tous les tests E2E documentés avec preuve + sévérité.

### Jour 6 — Polish + smoke prod
- [ ] Corriger les bugs P0/P1 trouvés en QA.
- [ ] Smoke test prod (curl endpoints publics, parcours signup réel sur appflip.online).
- [ ] Vérifier robots/sitemap/404, responsive mobile.
- **Validation** : prod verte, parcours payant complet réel (carte test puis 1 vrai paiement faible).

### Jour 7 — Gel + rapport + lancement
- [ ] Gel de code (plus de features).
- [ ] `Flip Launch Readiness Report` → verdict GO / NO-GO.
- [ ] Si GO : ouverture bêta payante.

---

## Responsabilités

### À faire par l'utilisateur (dashboard, hors code)
- Stripe : créer le compte, activer le mode live, récupérer `STRIPE_SECRET_KEY` + créer le `STRIPE_WEBHOOK_SECRET` (endpoint), valider les products/prices.
- Vercel : poser toutes les env (`STRIPE_*`, `CRON_SECRET`, `VAPID_*`, `PROFILE_*`, `RESIDENTIAL_PROXY_URL`), décider Hobby vs Pro.
- Supabase : activer leaked-password protection ; confirmer Auth SMTP.
- Décider : annuel dans l'UI maintenant ou plus tard ; email support à créer.
- Fournir : identité éditeur (mentions légales), email support.

### À faire par Claude (code)
- Tout le code Stripe, gating, access, UI billing, légal, fixes sécu, QA, rapports.
- Migrations SQL **avec test** avant apply.
- `lint` + `build` + smoke à chaque bloc ; push `main` seulement si vert.

---

## Commandes de référence
```bash
npm run lint
npm run build
# cron prod (doit 401 sans secret) :
curl -i https://appflip.online/api/cron/check
curl -i -H "Authorization: Bearer $CRON_SECRET" https://appflip.online/api/cron/check
# Stripe webhook local (test) :
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
```
