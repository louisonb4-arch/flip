// Métadonnées légales centralisées. Les placeholders [À compléter : …] doivent être
// remplis par l'éditeur avant le lancement public. AUCUN faux numéro d'entreprise.

export const LEGAL = {
  appName: "Flip",
  domain: "appflip.online",
  baseUrl: "https://appflip.online",
  updated: "15 juin 2026",

  // Éditeur — à compléter par le propriétaire de Flip
  editor: "[À compléter : nom de l'éditeur — personne physique ou société]",
  status: "[À compléter : statut juridique — ex. auto-entrepreneur, SAS, SASU]",
  siret: "[À compléter : SIREN / SIRET — laisser vide tant que non immatriculé]",
  capital: "[À compléter si société : capital social]",
  address: "[À compléter : adresse postale de l'éditeur]",
  publicationDirector: "[À compléter : nom du directeur de la publication]",
  contactEmail: "contact@appflip.online",

  // Hébergement (factuel — infrastructure réelle de Flip)
  host: {
    name: "Vercel Inc.",
    address: "340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis",
    site: "vercel.com",
  },

  // Sous-traitants / services tiers (RGPD)
  subprocessors: [
    { name: "Vercel Inc. (États-Unis)", role: "Hébergement de l'application et exécution serveur" },
    { name: "Supabase (Supabase Inc.)", role: "Base de données et authentification (stockage email + données de compte)" },
    { name: "Resend (Resend Inc.)", role: "Envoi des emails transactionnels (confirmation de compte)" },
  ],

  ageMin: 15,
} as const;
