// Score d'activité par profil GLOBAL → backoff adaptatif.
//
// Principe : un profil qui bouge est checké agressivement, un profil dormant
// est espacé. Le score (0-100) monte à chaque changement, décroît à chaque
// check sans changement (proportionnel au temps écoulé).
//
// Fréquence RÉELLE = max(plancher du plan, intervalle d'activité).
// → le plan reste le plancher (vitesse payée) ; l'activité ne fait que RALENTIR
//   les profils morts. Un Ultra ne checkera jamais plus lentement que son plan
//   sur un profil actif, mais un profil gelé depuis 90j sera espacé pour tous.

export const ACTIVITY_START = 65; // nouveau profil : checké assez vite les 1ers jours
const BUMP_PER_CHANGE = 40; // un changement réveille fort (cumulable, plafonné 100)
const DECAY_PER_DAY = 3.5; // backoff progressif : ~3 semaines pour passer hot → froid

// Score → intervalle d'activité (minutes).
export function activityIntervalMin(score: number): number {
  if (score >= 90) return 60; // 1 h
  if (score >= 70) return 120; // 2 h
  if (score >= 50) return 240; // 4 h
  if (score >= 20) return 480; // 8 h
  return 1440; // 24 h
}

// Nouveau score après un check.
// changeCount > 0 → bump ; sinon decay selon le temps écoulé depuis le dernier check.
export function nextScore(
  current: number,
  changeCount: number,
  lastCheckedAt: string | null,
): number {
  if (changeCount > 0) {
    return Math.min(100, current + BUMP_PER_CHANGE * Math.min(changeCount, 3));
  }
  const elapsedDays = lastCheckedAt
    ? (Date.now() - new Date(lastCheckedAt).getTime()) / 86_400_000
    : 1;
  const decay = Math.max(1, Math.round(DECAY_PER_DAY * elapsedDays));
  return Math.max(0, current - decay);
}

// Intervalle effectif : le plan est le plancher (le plus court = le plus fréquent),
// l'activité ne peut que l'allonger.
export function effectiveIntervalMin(planFloorMin: number, score: number): number {
  return Math.max(planFloorMin, activityIntervalMin(score));
}
