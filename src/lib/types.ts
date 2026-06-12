export type Plan = "starter" | "premium" | "social_plus";

// Plateformes surveillées. Instagram en premier ; le reste arrive progressivement.
// Flip n'est pas une app Instagram : « Flip surveille les changements publics sur internet. »
export type Platform =
  | "instagram"
  | "tiktok"
  | "x"
  | "twitch"
  | "youtube"
  | "github"
  | "linkedin";

export const PLATFORMS: Record<
  Platform,
  { label: string; emoji: string; enabled: boolean }
> = {
  instagram: { label: "Instagram", emoji: "📸", enabled: true },
  tiktok: { label: "TikTok", emoji: "🎵", enabled: true },
  x: { label: "X / Twitter", emoji: "𝕏", enabled: false },
  twitch: { label: "Twitch", emoji: "🎮", enabled: false },
  youtube: { label: "YouTube", emoji: "▶️", enabled: false },
  github: { label: "GitHub", emoji: "🐙", enabled: false },
  linkedin: { label: "LinkedIn", emoji: "💼", enabled: false },
};

// Types de changement détectables sur un profil.
export type ChangeType =
  | "bio"
  | "photo"
  | "display_name"
  | "bio_link"
  | "username"
  | "privacy"
  | "followers"
  | "following"
  | "posts";

// major = notification instantanée · minor = digest seulement.
export type Severity = "major" | "minor";

// État public d'un profil (snapshot).
export interface PublicProfile {
  username: string;
  display_name: string | null;
  profile_image_url: string | null;
  bio: string | null;
  bio_link: string | null;
  followers_count: number | null;
  following_count: number | null;
  posts_count: number | null;
  is_private: boolean | null;
  raw_data?: Record<string, unknown>;
}

// Profil GLOBAL, partagé entre tous les users qui le suivent. Fetché 1× pour tous.
export interface PlatformProfile extends PublicProfile {
  id: string;
  platform: Platform;
  last_checked_at: string | null;
  created_at: string;
}

// Lien user ↔ profil global.
export interface UserTrackedProfile {
  id: string;
  user_id: string;
  platform_profile_id: string;
  created_at: string;
  profile: PlatformProfile;
}

export interface Snapshot extends PublicProfile {
  id: string;
  platform_profile_id: string;
  created_at: string;
}

// Changement GLOBAL détecté une seule fois sur un profil.
export interface ProfileChange {
  id: string;
  platform_profile_id: string;
  change_type: ChangeType;
  severity: Severity;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

// Notification PAR USER : distribution d'un changement global à un abonné.
export interface UserNotification {
  id: string;
  user_id: string;
  platform_profile_id: string;
  change_type: ChangeType;
  severity: Severity;
  old_value: string | null;
  new_value: string | null;
  seen: boolean;
  created_at: string;
  username?: string; // joint pour l'affichage
}

export interface NotificationSettings {
  user_id: string;
  bio_enabled: boolean;
  photo_enabled: boolean;
  name_enabled: boolean;
  link_enabled: boolean;
  private_public_enabled: boolean;
  followers_enabled: boolean;
  posts_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
}

export interface User {
  id: string;
  email: string;
  plan: Plan;
}

export interface PlanLimit {
  checkIntervalMin: number;
  // Quota de profils PAR plateforme. Une plateforme absente = non disponible sur ce plan.
  profilesByPlatform: Partial<Record<Platform, number>>;
  historyFull: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimit> = {
  starter: {
    checkIntervalMin: 1440, // 24 h
    profilesByPlatform: { instagram: 3 },
    historyFull: false,
  },
  premium: {
    checkIntervalMin: 360, // 6 h
    profilesByPlatform: { instagram: 30 },
    historyFull: true,
  },
  social_plus: {
    checkIntervalMin: 120, // 2 h
    profilesByPlatform: { instagram: 30, tiktok: 10 },
    historyFull: true,
  },
};

export const PLAN_LABELS: Record<Plan, string> = {
  starter: "Starter",
  premium: "Premium",
  social_plus: "Social+",
};

// Quota de profils pour un plan sur une plateforme donnée (0 = non disponible).
export function planCap(plan: Plan, platform: Platform): number {
  return PLAN_LIMITS[plan].profilesByPlatform[platform] ?? 0;
}

// Quota total tous plateformes confondues (affichage simple).
export function planTotalProfiles(plan: Plan): number {
  return Object.values(PLAN_LIMITS[plan].profilesByPlatform).reduce((a, b) => a + b, 0);
}

export const CHANGE_LABELS: Record<ChangeType, string> = {
  bio: "La bio a changé",
  photo: "Photo changée",
  display_name: "Nom affiché changé",
  bio_link: "Nouveau lien en bio",
  username: "Username changé",
  privacy: "Visibilité du compte changée",
  followers: "Variation d'abonnés",
  following: "Variation d'abonnements",
  posts: "Nouveau(x) post(s)",
};

// Seuils : à partir de quand un changement vaut une notification, et sa sévérité.
export const FOLLOWERS_PCT_THRESHOLD = 0.05; // 5 %
export const FOLLOWERS_ABS_THRESHOLD = 50; // ou 50 abonnés
