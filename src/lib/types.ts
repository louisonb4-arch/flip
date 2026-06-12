export type Plan = "starter" | "premium";

export type ChangeType =
  | "bio"
  | "photo"
  | "display_name"
  | "bio_link"
  | "username"
  | "privacy";

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

export interface TrackedProfile extends PublicProfile {
  id: string;
  user_id: string;
  platform: "instagram";
  last_checked_at: string | null;
  created_at: string;
}

export interface Snapshot extends PublicProfile {
  id: string;
  tracked_profile_id: string;
  created_at: string;
}

export interface ProfileChange {
  id: string;
  tracked_profile_id: string;
  user_id: string;
  change_type: ChangeType;
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
};
