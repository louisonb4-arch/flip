// Comparaison de snapshots → changements détectés, avec sévérité et seuils.

import {
  FOLLOWERS_ABS_THRESHOLD,
  FOLLOWERS_PCT_THRESHOLD,
  type ChangeType,
  type NotificationSettings,
  type PublicProfile,
  type Severity,
} from "./types";

export interface DetectedChange {
  change_type: ChangeType;
  severity: Severity;
  old_value: string | null;
  new_value: string | null;
}

// Champs texte/booléen → changement = major (instantané) dès qu'ils diffèrent.
const SIMPLE_FIELDS: { field: keyof PublicProfile; type: ChangeType }[] = [
  { field: "bio", type: "bio" },
  { field: "profile_image_url", type: "photo" },
  { field: "display_name", type: "display_name" },
  { field: "bio_link", type: "bio_link" },
  { field: "username", type: "username" },
  { field: "is_private", type: "privacy" },
];

export function diffSnapshots(prev: PublicProfile, next: PublicProfile): DetectedChange[] {
  const changes: DetectedChange[] = [];

  for (const { field, type } of SIMPLE_FIELDS) {
    const a = prev[field];
    const b = next[field];
    if (a === undefined || b === undefined) continue;
    if (a === null && b === null) continue;
    if (String(a ?? "") !== String(b ?? "")) {
      changes.push({
        change_type: type,
        severity: "major",
        old_value: a === null || a === undefined ? null : String(a),
        new_value: b === null || b === undefined ? null : String(b),
      });
    }
  }

  // Abonnés : major si variation significative (>5% OU >50), sinon minor (digest).
  const fc = numericChange(prev.followers_count, next.followers_count);
  if (fc) {
    const significant =
      Math.abs(fc.delta) >= FOLLOWERS_ABS_THRESHOLD ||
      (fc.from > 0 && Math.abs(fc.delta) / fc.from >= FOLLOWERS_PCT_THRESHOLD);
    changes.push({
      change_type: "followers",
      severity: significant ? "major" : "minor",
      old_value: String(fc.from),
      new_value: String(fc.to),
    });
  }

  // Posts : nouveau post = intéressant → major.
  const pc = numericChange(prev.posts_count, next.posts_count);
  if (pc) {
    changes.push({
      change_type: "posts",
      severity: "major",
      old_value: String(pc.from),
      new_value: String(pc.to),
    });
  }

  // Abonnements : minor (digest seulement).
  const gc = numericChange(prev.following_count, next.following_count);
  if (gc) {
    changes.push({
      change_type: "following",
      severity: "minor",
      old_value: String(gc.from),
      new_value: String(gc.to),
    });
  }

  return changes;
}

function numericChange(
  a: number | null | undefined,
  b: number | null | undefined,
): { from: number; to: number; delta: number } | null {
  if (typeof a !== "number" || typeof b !== "number") return null;
  if (a === b) return null;
  return { from: a, to: b, delta: b - a };
}

// Préférence notif par type de changement.
const SETTING_KEY: Record<ChangeType, keyof NotificationSettings> = {
  bio: "bio_enabled",
  photo: "photo_enabled",
  display_name: "name_enabled",
  bio_link: "link_enabled",
  username: "name_enabled",
  privacy: "private_public_enabled",
  followers: "followers_enabled",
  following: "followers_enabled",
  posts: "posts_enabled",
};

export function isEnabled(type: ChangeType, settings: NotificationSettings): boolean {
  return Boolean(settings[SETTING_KEY[type]]);
}
