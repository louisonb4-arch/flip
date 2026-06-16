# Flip — Apple Store Readiness Plan

But : transformer Flip (web app Next.js sur `appflip.online`) en app iOS publiable sur l'App Store.
**Ne pas coder l'app iOS sans feu vert.** Ce document = plan complet + risques + checklist.

> **Roadmap séparée du lancement web.** PAS cette semaine — la priorité de la semaine = **web app payante** (Stripe + plans + légal + QA, voir `WEEK_LAUNCH_PLAN.md`). Aucun build Capacitor avant que le payant web soit en ligne et validé.

Règles Apple vérifiées sur docs officielles (juin 2026). Points sensibles confirmés :
- **3.1.1 / 3.1.3(b)** — abonnements numériques consommés in-app : IAP requis par défaut. Multiplateforme : accès à un abo acheté ailleurs autorisé **si** aussi dispo en IAP.
- **3.1.1(a) (US, mai 2025, suite Epic)** — sur le storefront **US uniquement**, liens/boutons de paiement externes autorisés **sans entitlement et sans commission Apple**. (⚠️ ne s'applique PAS à la France.)
- **DMA UE (cible France)** — les apps des storefronts UE peuvent communiquer/lier des offres externes (web/marketplace), MAIS Apple prélève quand même des frais : ~2% acquisition + 5-13% Store Services + **5% Core Technology Commission** (depuis 2026, remplace l'ancien CTF par install). **Pas gratuit comme aux US.** Interdiction de mélanger IAP Apple + paiement alternatif sur le même storefront.
- **5.1.1(v)** — suppression de compte in-app obligatoire (Flip l'a déjà ✅).
- **5.1.2 / ATT** — le prompt App Tracking Transparency vise le tracking **de l'utilisateur** entre apps. Flip suit des **profils tiers publics**, pas l'utilisateur → ATT a priori non déclenché, sauf ajout de SDK pub/analytics.
- **4.2** — fonctionnalité minimale : un simple webview vide = rejet. Il faut du natif réel (push APNs, deep links, compte).

---

## 1. Choix techno

| Option | Avantages | Inconvénients | Délai | Risque App Store | Coût | Maintenance |
|--------|-----------|---------------|-------|------------------|------|-------------|
| **PWA optimisée** | 0 store, déjà presque prêt, push web (iOS 16.4+ via « Ajouter à l'écran d'accueil ») | pas sur l'App Store, push web iOS fragile, découverte faible | 2-3 j | N/A | 0 | faible |
| **Capacitor (wrapper natif)** ⭐ | réutilise tout le web, **APNs natif**, deep links, suppression compte déjà là, store-ready | webview + plugins, build Xcode/Mac requis | 1-2 sem | moyen (4.2 si trop « webview ») | 99$/an | moyenne |
| **React Native / Expo** | UX native, perf | **réécriture UI complète** | 4-8 sem | faible | 99$/an | élevée |
| **Swift natif** | UX maximale | réécriture totale, double codebase | 8-12 sem | faible | 99$/an | très élevée |

**Recommandation : Capacitor.** Meilleur ratio délai/risque. On garde un seul codebase web, on ajoute la couche native (APNs, deep links) qui satisfait 4.2 (« pas juste une webview »). RN/Swift = sur-ingénierie tant que le produit n'est pas validé.

Stratégie en 3 temps :
1. **Cette semaine** : PWA bêta (déjà la prio du lancement payant web).
2. **+1-2 sem** : Capacitor MVP App Store (US d'abord).
3. **Plus tard si traction** : envisager RN pour une UX 100% native.

---

## 2. Compte développeur Apple (à faire par l'utilisateur)
- **Apple Developer Program** : 99 $/an. Inscription `developer.apple.com` (perso ou société — société exige un D-U-N-S).
- **App Store Connect** : créer l'app, le **Bundle ID** (ex : `online.appflip.app`), gérer TestFlight + fiche.
- **Certificats / profils** : laisser Xcode gérer le signing automatiquement (le plus simple) ; sinon certificat de distribution + provisioning profile manuels.
- **TestFlight** : distribution bêta interne (jusqu'à 100 testeurs internes) puis externe (jusqu'à 10 000, review légère requise).
- **Mac + Xcode obligatoires** pour builder/soumettre iOS.

---

## 3. Préparer l'app pour la Review
- ✅ Auth fonctionnelle (déjà).
- ✅ Suppression compte in-app (déjà — 5.1.1(v)).
- [ ] Privacy Policy + Terms accessibles **dans l'app** (liens natifs).
- [ ] Contact support visible.
- [ ] Mention non-affiliation Instagram/Meta visible.
- [ ] « données publiques uniquement » explicite.
- [ ] **Zéro wording interdit** : temps réel, instantané, espionner, surveiller, contourner comptes privés.
- [ ] Gestion mineurs : cible jeune → fixer **âge 17+** (ou justifier 13+) + écran d'âge si besoin.
- [ ] Onboarding clair (à quoi sert Flip, profils publics).
- [ ] Aucune fausse note/avis/promesse.
- [ ] App utile (pas une coquille) : push réel, dashboard fonctionnel.

---

## 4. Paiement — analyse (point le plus risqué)

**Cible = France (storefront UE).** Le « lien externe gratuit » US (3.1.1a) NE s'applique PAS. Options réelles pour la France :

| Modèle (storefront FR) | Cut Apple | Risque rejet | Note |
|--------|-------|--------------|------|
| **App login-only** (aucun achat ni lien d'achat dans l'app ; abonnement pris sur `appflip.online`) ⭐ | **0%** | **moyen** : Apple peut scruter une app qui gate du payant sans IAP → fournir compte démo abonné | garde 100% de la marge Stripe ; ne pas mentionner/lier l'abo dans l'app |
| **Paiement alternatif DMA** (lien/web externe in-app, autorisé en UE) | ~2% + 5-13% + **5% CTC** | faible-moyen | légal UE mais Apple prélève quand même ; admin lourde |
| **IAP Apple** | −15% (Small Business) à −30% | faible | conforme, mais ronge la marge ; Ultra fragile en stress |

**Recommandation Flip (France) :**
- **App login-only** : l'utilisateur s'abonne sur le web (Stripe EUR), l'app sert à se connecter + recevoir les alertes. **0% Apple, marge préservée.**
- Ne **rien** mentionner/lier sur l'abonnement dans l'app iOS (sinon Apple exige IAP ou DMA).
- **Compte démo avec abonnement actif** obligatoire dans les notes de Review.
- **Plan B prêt** : si rejet → paiement alternatif DMA (5% CTC) ou IAP. Ne pas coder tant que pas nécessaire.
- ⚠️ Interdiction de mélanger IAP + paiement alternatif sur le même storefront UE.

---

## 5. Push iOS
- **PWA** : push web iOS seulement si l'app est « ajoutée à l'écran d'accueil » (iOS 16.4+), fragile.
- **Capacitor/natif** : **APNs** via `@capacitor/push-notifications`. Backend doit envoyer vers APNs (en plus du web-push existant) — ou via un service (FCM/OneSignal) qui route APNs.
- Permissions : prompt natif au bon moment (après onboarding, pas au lancement).
- Deep links : tap notif → ouvre `/notifications` ou le profil concerné.
- Test : **device réel obligatoire** (le simulateur ne reçoit pas APNs).
- Logs/debug : tracer les `device_token`, les échecs APNs.

---

## 6. Backend (déjà en place, à compléter)
- ✅ Supabase (auth, RLS, data).
- ✅ Worker de check (`checker.ts`, priorité + backoff).
- ◐ Cron : Vercel `0 8 * * *` (1×/j Hobby) → Pro + horaire pour les fréquences réelles.
- ✗ Stripe/webhook (voir WEEK_LAUNCH_PLAN).
- [ ] APNs (si Capacitor) : nouvelle voie d'envoi push.
- [ ] Rate limit (déjà 429 sur profiles/check) — vérifier couverture.
- [ ] Logs `[cron]`/`[push]`/`[stripe]` clairs.

---

## 7. Assets App Store (à préparer)
- **Nom** : Flip (vérifier disponibilité ; sinon « Flip — alertes profils »).
- **Sous-titre** (30 car.) : ex « Changements de profils publics ».
- **Description courte / longue** : wording safe, profils publics, changements visibles, pas de surveillance.
- **Mots-clés** : alertes, profil instagram, changement bio, suivi public… (éviter « espion », « stalk »).
- **Catégorie** : Utilitaires ou Réseaux sociaux.
- **Âge** : 17+ recommandé (prudence cible jeune + contenu social).
- **Screenshots** : 6.7" et 6.5" obligatoires (+ 5.5" optionnel), iPad si supporté.
- **App preview video** : optionnel (réutiliser les renders existants, recadrés, wording safe).
- **Icône** : 1024×1024 sans alpha.
- **Privacy nutrition labels** : déclarer données collectées (email, usage) + données des profils suivis.
- **Page support + page marketing** : `appflip.online` + `/support`.
- **Compte démo** pour Apple Review : login + abonnement actif + 1-2 profils publics suivis pré-remplis.

---

## 8. Plan étape par étape

- **Phase 1 — Décision techno** : valider Capacitor (ou autre). Geler le choix.
- **Phase 2 — Compte Apple** : enroll Developer Program, créer app + Bundle ID dans App Store Connect.
- **Phase 3 — Build iOS** : intégrer Capacitor au repo, plugins (push, browser, app), build Xcode, signing.
- **Phase 4 — TestFlight interne** : build → testeurs internes, valider push device, parcours complet.
- **Phase 5 — TestFlight bêta externe** : élargir, collecter feedback, corriger.
- **Phase 6 — Metadata App Store** : fiche, screenshots, privacy labels, compte démo, URLs légales.
- **Phase 7 — Soumission Review** : envoyer, notes de review (expliquer modèle paiement + compte démo).
- **Phase 8 — Gestion rejet** : réponses préparées (voir §9).
- **Phase 9 — Lancement public** : release, suivi crashs.
- **Phase 10 — MAJ / monitoring** : pipeline de MAJ, logs, métriques.

---

## 9. Checklist App Store finale

### À faire par moi (utilisateur)
- [ ] Payer Apple Developer Program (99 $/an).
- [ ] Créer app + Bundle ID dans App Store Connect.
- [ ] Accès Mac + Xcode (ou machine de build).
- [ ] Fournir identité éditeur + email support.
- [ ] Décider US-first vs global (impacte le modèle paiement).
- [ ] Fournir/valider screenshots + icône 1024.
- [ ] Remplir privacy nutrition labels.

### À faire dans le code
- [ ] Intégrer Capacitor + plugins (push APNs, browser pour lien externe, app).
- [ ] Voie d'envoi push APNs côté backend.
- [ ] Liens légaux natifs in-app (privacy/terms/support).
- [ ] (Si requis) intégration IAP en plan B.
- [ ] Deep links notif → écran.

### À faire dans App Store Connect
- [ ] Fiche complète (nom, sous-titre, descriptions, mots-clés, catégorie, âge).
- [ ] Screenshots + preview.
- [ ] Privacy labels.
- [ ] Compte démo dans les notes de review.
- [ ] Configurer TestFlight.

### À vérifier avant soumission
- [ ] Suppression compte in-app accessible.
- [ ] Aucun wording interdit nulle part.
- [ ] Non-affiliation Instagram/Meta visible.
- [ ] Privacy/Terms accessibles in-app.
- [ ] Push fonctionne sur device réel.
- [ ] Modèle paiement conforme au storefront ciblé.
- [ ] Pas de fausses notes/avis.

### Raisons probables de rejet + réponses préparées
- **3.1.1 (paiement)** : « Flip est un service multiplateforme ; l'abonnement est géré sur le web (`appflip.online`). L'app iOS est login-only et ne propose aucun achat. Un compte démo avec abonnement actif est fourni. »
- **4.2 (fonctionnalité minimale)** : « L'app fournit push natif APNs, gestion de compte, dashboard interactif — pas une simple webview. »
- **5.1.2 / surveillance** : « Flip ne suit que des **profils Instagram publics** (données visibles publiquement), pas l'utilisateur ni des comptes privés. Opt-out disponible. Usage harcèlement interdit par les CGU. » → **risque réel : préparer cette réponse soigneusement.**
- **5.1.1(v)** : suppression compte déjà in-app (capture fournie).
- **2.3 (métadonnées trompeuses)** : wording aligné, aucune promesse « temps réel ».

---

## 10. Planning réaliste

| Version | Délai | Difficulté | Risques | Reco |
|---------|-------|------------|---------|------|
| **PWA bêta** | cette semaine | faible | push web iOS fragile | ✅ ship maintenant (lancement payant web) |
| **App Store MVP (Capacitor, France/UE, login-only)** | +1-2 sem après lancement web | moyenne | 4.2 webview, login-only scruté | ✅ cible App Store réaliste |
| **App Store propre (Capacitor poli + plan B DMA/IAP)** | +3-5 sem | moyenne-haute | 5% CTC ou IAP si rejet login-only | si traction |
| **Native complète (RN/Swift)** | +6-12 sem | haute | coût/maintenance | seulement si volume le justifie |

**Recommandation finale** : PWA cette semaine → Capacitor **France/UE login-only** dans 1-2 semaines (0% Apple, abo 100% web) → plan B DMA/IAP seulement si rejet. Le plus gros risque produit = la perception « surveillance » : positionner public-data + opt-out + anti-harcèlement partout, et préparer la réponse Review.

> ⚠️ Les règles Apple évoluent (notamment paiement post-Epic). Re-vérifier la fiche officielle « App Review Guidelines » + l'état de l'entitlement lien externe au moment de la soumission. Validation juriste recommandée avant lancement public large.
