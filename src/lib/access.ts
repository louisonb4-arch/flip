// Calcul d'accès — TOUJOURS côté serveur (le front ne fait qu'afficher).
//
// Accès = période d'essai de base (à partir de la création du compte) + jours bonus
// (parrainage : signup filleul + paliers parrain). Stripe étendra ça plus tard.

import type { Store } from "./store";

// Période d'essai offerte à tout nouveau compte.
export const BASE_TRIAL_DAYS = 7;

const DAY_MS = 86_400_000;

export interface AccessStatus {
  trialDays: number; // essai de base
  bonusDays: number; // jours gagnés (parrainage…)
  accessUntil: string; // ISO : date de fin d'accès
  daysLeft: number; // entier >= 0
  hasAccess: boolean; // accès encore valide ?
}

export async function getAccessStatus(userId: string, store: Store): Promise<AccessStatus> {
  const [user, bonusDays] = await Promise.all([
    store.getUser(userId),
    store.getTotalBonusDays(userId),
  ]);

  // created_at fiable côté serveur ; fallback "maintenant" si absent (ne donne jamais d'accès négatif).
  const createdMs = user.created_at ? new Date(user.created_at).getTime() : Date.now();
  const base = Number.isFinite(createdMs) ? createdMs : Date.now();

  const untilMs = base + (BASE_TRIAL_DAYS + bonusDays) * DAY_MS;
  const daysLeft = Math.max(0, Math.ceil((untilMs - Date.now()) / DAY_MS));

  return {
    trialDays: BASE_TRIAL_DAYS,
    bonusDays,
    accessUntil: new Date(untilMs).toISOString(),
    daysLeft,
    hasAccess: Date.now() < untilMs,
  };
}
