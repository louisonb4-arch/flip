import type { Metadata } from "next";
import { LegalShell } from "@/components/legal";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Flip",
  description:
    "Comment Flip collecte, utilise et protège tes données : email, comptes Instagram publics suivis, notifications et tes droits RGPD.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Politique de confidentialité">
      <p>
        La présente politique explique quelles données {LEGAL.appName} traite, pourquoi, sur quelle
        base légale, combien de temps, et quels sont tes droits. {LEGAL.appName} est un service de
        suivi des changements visibles sur des comptes <strong>Instagram publics</strong>.
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement est l&apos;éditeur de {LEGAL.appName} : {LEGAL.editor},
        {" "}{LEGAL.address}. Contact : <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>

      <h2>2. Données que nous traitons</h2>
      <ul>
        <li>
          <strong>Compte</strong> : ton adresse email et un identifiant de compte (créés à
          l&apos;inscription).
        </li>
        <li>
          <strong>Comptes suivis</strong> : les noms d&apos;utilisateur Instagram publics que tu
          choisis de suivre.
        </li>
        <li>
          <strong>Snapshots publics</strong> : copies d&apos;informations <em>publiquement
          visibles</em> de ces comptes (bio, photo de profil, nom affiché, lien en bio, statut
          public/privé, nombre d&apos;abonnés, publications) afin de détecter les changements.
        </li>
        <li>
          <strong>Notifications</strong> : l&apos;historique des changements détectés qui te sont
          adressés.
        </li>
        <li>
          <strong>Abonnements push</strong> : les jetons techniques de ton navigateur si tu actives
          les notifications push.
        </li>
        <li>
          <strong>Parrainage</strong> : ton code de parrainage, les liens de parrainage et les jours
          bonus associés.
        </li>
        <li>
          <strong>Réglages</strong> : tes préférences de notification et ton plan.
        </li>
      </ul>
      <p>
        {LEGAL.appName} ne demande, ne stocke et n&apos;utilise <strong>jamais</strong> ton mot de
        passe Instagram, et n&apos;accède qu&apos;à des informations déjà publiques. {LEGAL.appName}
        ne suit pas de comptes privés.
      </p>

      <h2>3. Finalités &amp; base légale</h2>
      <ul>
        <li>Fournir le service (détecter les changements et t&apos;alerter) — exécution du contrat.</li>
        <li>Gérer ton compte et l&apos;authentification — exécution du contrat.</li>
        <li>Envoyer des emails liés au compte (confirmation) — exécution du contrat.</li>
        <li>Programme de parrainage — exécution du contrat / ton consentement.</li>
        <li>Sécurité et prévention des abus — intérêt légitime.</li>
      </ul>

      <h2>4. Durée de conservation</h2>
      <p>
        Les données sont conservées tant que ton compte est actif. Lorsque tu supprimes ton compte
        depuis les réglages, tes données personnelles (compte, comptes suivis, notifications,
        abonnements push, parrainage, réglages) sont supprimées de nos systèmes. Les informations
        publiques mutualisées non rattachées à une personne peuvent être conservées de façon
        agrégée.
      </p>

      <h2>5. Sous-traitants</h2>
      <p>Nous nous appuyons sur les prestataires suivants, strictement pour faire fonctionner le service :</p>
      <ul>
        {LEGAL.subprocessors.map((s) => (
          <li key={s.name}>
            <strong>{s.name}</strong> — {s.role}.
          </li>
        ))}
      </ul>
      <p>
        Certains prestataires sont situés hors Union européenne (notamment aux États-Unis) ; les
        transferts sont encadrés par les garanties contractuelles appropriées.
      </p>

      <h2>6. Tes droits</h2>
      <p>
        Conformément au RGPD, tu disposes d&apos;un droit d&apos;accès, de rectification,
        d&apos;effacement, de limitation, d&apos;opposition et de portabilité. Tu peux supprimer
        toi-même ton compte et tes données à tout moment depuis <strong>Réglages → Supprimer mon
        compte</strong>. Pour toute autre demande, écris-nous à
        {" "}<a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>. Tu peux aussi saisir
        la CNIL (cnil.fr).
      </p>

      <h2>7. Sécurité</h2>
      <p>
        Les accès aux données sont restreints et l&apos;authentification est gérée par un prestataire
        spécialisé. Aucune transmission sur internet n&apos;est toutefois garantie à 100 %.
      </p>

      <h2>8. Âge minimum</h2>
      <p>
        {LEGAL.appName} est réservé aux personnes âgées d&apos;au moins {LEGAL.ageMin} ans. Si tu as
        moins de {LEGAL.ageMin} ans, n&apos;utilise pas le service.
      </p>

      <h2>9. Affiliation</h2>
      <p>
        {LEGAL.appName} n&apos;est pas affilié, associé, autorisé ni soutenu par Instagram ou Meta
        Platforms, Inc. « Instagram » est une marque de Meta Platforms, Inc.
      </p>

      <h2>10. Modifications</h2>
      <p>
        Cette politique peut évoluer. La date de dernière mise à jour figure en haut de page.
      </p>
    </LegalShell>
  );
}
