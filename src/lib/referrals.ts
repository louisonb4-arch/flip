import type { Store } from "./store";

export const MILESTONES = [
  { count: 3, days: 7 },
  { count: 6, days: 10 },
  { count: 10, days: 13 },
] as const;

export const MAX_BONUS_DAYS = 30;

// Jours offerts au FILLEUL qui s'inscrit via un lien de parrainage.
export const REFERRED_SIGNUP_BONUS_DAYS = 3;

export interface ReferralReward {
  milestone: number;
  reward_days: number;
  unlocked: boolean;
  unlocked_at?: string;
  claimed_at?: string | null;
}

export interface ReferralData {
  code: string | null;
  link: string | null;
  referral_count: number;
  rewards: ReferralReward[];
  total_bonus_days: number;
}

export async function getReferralData(userId: string, store: Store, origin: string): Promise<ReferralData> {
  const [code, count, unlockedRewards, totalDays] = await Promise.all([
    store.getReferralCode(userId),
    store.getReferralCount(userId),
    store.getUnlockedRewards(userId),
    store.getTotalBonusDays(userId),
  ]);

  const unlockedMap = new Map(unlockedRewards.map((r) => [r.milestone, r]));

  const rewards: ReferralReward[] = MILESTONES.map((m) => {
    const unlocked = unlockedMap.get(m.count);
    return {
      milestone: m.count,
      reward_days: m.days,
      unlocked: !!unlocked,
      unlocked_at: unlocked?.unlocked_at,
      claimed_at: unlocked?.claimed_at,
    };
  });

  return {
    code,
    link: code ? `${origin}/invite/${code}` : null,
    referral_count: count,
    rewards,
    total_bonus_days: totalDays,
  };
}

export async function applyReferralCode(
  code: string,
  referredUserId: string,
  store: Store,
): Promise<{ ok: boolean; error?: string }> {
  // 1. Trouver le parrain
  const referrerId = await store.getReferrerByCode(code);
  if (!referrerId) return { ok: false, error: "Code de parrainage invalide." };

  // 2. Anti-auto-parrainage
  if (referrerId === referredUserId) {
    return { ok: false, error: "Tu ne peux pas utiliser ton propre code." };
  }

  // 3. Créer le lien (idempotent : unique referred_user_id)
  const result = await store.addReferral(referrerId, referredUserId);
  if (!result.ok) return result;

  // 4. Le FILLEUL reçoit ses jours gratuits (idempotent par source → pas de double crédit au refresh).
  await store.grantBonusDays(referredUserId, REFERRED_SIGNUP_BONUS_DAYS, "referral_signup");

  // 5. Vérifier et débloquer les paliers du PARRAIN
  const count = await store.getReferralCount(referrerId);
  for (const m of MILESTONES) {
    if (count >= m.count) {
      await store.unlockMilestone(referrerId, m.count, m.days);
    }
  }

  return { ok: true };
}

export function generateCode(email: string): string {
  const prefix = email
    .split("@")[0]
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix || "FLIP"}${suffix}`;
}
