import type { Metadata } from "next";
import { LegalShell } from "@/components/legal";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Mentions légales — Flip",
  description: "Éditeur, directeur de la publication, hébergeur et informations légales de Flip.",
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegalesPage() {
  return (
    <LegalShell title="Mentions légales">
      <h2>Éditeur</h2>
      <p>
        Le service {LEGAL.appName} ({LEGAL.baseUrl}) est édité par :<br />
        {LEGAL.editor}<br />
        Statut : {LEGAL.status}<br />
        {LEGAL.siret}<br />
        {LEGAL.capital}<br />
        Adresse : {LEGAL.address}<br />
        Email : <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>
      </p>

      <h2>Directeur de la publication</h2>
      <p>{LEGAL.publicationDirector}</p>

      <h2>Hébergeur</h2>
      <p>
        {LEGAL.host.name}<br />
        {LEGAL.host.address}<br />
        {LEGAL.host.site}
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        La marque {LEGAL.appName}, le nom de domaine {LEGAL.domain}, l&apos;interface et les contenus
        produits par l&apos;éditeur sont protégés. Toute reproduction non autorisée est interdite.
      </p>

      <h2>Affiliation</h2>
      <p>
        {LEGAL.appName} n&apos;est pas affilié, associé, autorisé ni soutenu par Instagram ou Meta
        Platforms, Inc. « Instagram » est une marque de Meta Platforms, Inc. {LEGAL.appName}
        n&apos;exploite que des informations publiquement accessibles.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question : <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>
    </LegalShell>
  );
}
