import type { Metadata } from "next";
import { LegalShell } from "@/components/legal";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation — Flip",
  description:
    "Les règles d'utilisation de Flip : suivi de comptes Instagram publics, compte, usage acceptable, responsabilités.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalShell title="Conditions générales d'utilisation">
      <p>
        En créant un compte ou en utilisant {LEGAL.appName}, tu acceptes les présentes conditions.
        Si tu ne les acceptes pas, n&apos;utilise pas le service.
      </p>

      <h2>1. Le service</h2>
      <p>
        {LEGAL.appName} détecte et te signale les changements <strong>visibles publiquement</strong>
        sur des comptes <strong>Instagram publics</strong> que tu choisis de suivre (par exemple :
        bio, photo de profil, nom affiché, lien en bio, passage public/privé, variation
        d&apos;abonnés, nouvelles publications). {LEGAL.appName} consulte ces comptes
        périodiquement et t&apos;envoie une alerte lorsqu&apos;un changement est constaté.
      </p>

      <h2>2. Informations publiques uniquement</h2>
      <ul>
        <li>{LEGAL.appName} n&apos;accède qu&apos;à des informations déjà publiques.</li>
        <li>{LEGAL.appName} ne demande jamais ton mot de passe Instagram ni celui d&apos;un tiers.</li>
        <li>{LEGAL.appName} ne suit pas de comptes privés et ne contourne aucune protection.</li>
        <li>{LEGAL.appName} n&apos;est pas un outil de surveillance, de harcèlement ou de pistage de personnes.</li>
      </ul>

      <h2>3. Compte</h2>
      <p>
        Tu es responsable de l&apos;exactitude de ton email et de la confidentialité de ton accès.
        Un compte est personnel.
      </p>

      <h2>4. Usage acceptable</h2>
      <p>Tu t&apos;engages à ne pas utiliser {LEGAL.appName} pour :</p>
      <ul>
        <li>harceler, intimider, traquer ou nuire à une personne ;</li>
        <li>une finalité illicite ou contraire aux droits des tiers ;</li>
        <li>tenter d&apos;accéder à des données non publiques ou de perturber le service.</li>
      </ul>

      <h2>5. Plans &amp; paiement</h2>
      <p>
        Des formules payantes pourront être proposées. Tant que le paiement n&apos;est pas activé, le
        changement de plan est présenté à titre de démonstration et aucun montant n&apos;est prélevé.
        Les conditions de facturation seront précisées au moment de l&apos;activation du paiement.
      </p>

      <h2>6. Disponibilité &amp; exactitude</h2>
      <p>
        Le service est fourni « en l&apos;état ». {LEGAL.appName} dépend d&apos;informations publiques
        externes et ne garantit ni l&apos;exhaustivité, ni l&apos;exactitude, ni le délai de détection
        des changements, ni une disponibilité ininterrompue.
      </p>

      <h2>7. Responsabilité</h2>
      <p>
        Dans les limites permises par la loi, {LEGAL.appName} ne saurait être tenu responsable des
        décisions prises sur la base des alertes, ni des dommages indirects liés à
        l&apos;utilisation du service.
      </p>

      <h2>8. Résiliation</h2>
      <p>
        Tu peux supprimer ton compte à tout moment depuis <strong>Réglages → Supprimer mon
        compte</strong>. Nous pouvons suspendre un compte en cas de violation des présentes
        conditions.
      </p>

      <h2>9. Âge minimum</h2>
      <p>{LEGAL.appName} est réservé aux personnes âgées d&apos;au moins {LEGAL.ageMin} ans.</p>

      <h2>10. Affiliation</h2>
      <p>
        {LEGAL.appName} n&apos;est pas affilié, associé, autorisé ni soutenu par Instagram ou Meta
        Platforms, Inc.
      </p>

      <h2>11. Droit applicable</h2>
      <p>
        Les présentes conditions sont régies par le droit français. La date de dernière mise à jour
        figure en haut de page.
      </p>
    </LegalShell>
  );
}
