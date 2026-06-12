export type Plan = "starter" | "premium";

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
  platform: "instagram";
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

export const PLAN_LIMITS: Record<Plan, { maxProfiles: number; checkIntervalMin: number }> = {
  starter: { maxProfiles: 3, checkIntervalMin: 1440 }, // 24 h
  premium: { maxProfiles: 25, checkIntervalMin: 360 }, // 6 h
};

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
