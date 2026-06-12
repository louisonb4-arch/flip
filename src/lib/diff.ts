// Comparaison de snapshots → liste de changements détectés.

import type { ChangeType, NotificationSettings, PublicProfile } from "./types";

export interface DetectedChange {
  change_type: ChangeType;
  old_value: string | null;
  new_value: string | null;
}

const FIELDS: { field: keyof PublicProfile; type: ChangeType }[] = [
  { field: "bio", type: "bio" },
  { field: "profile_image_url", type: "photo" },
  { field: "display_name", type: "display_name" },
  { field: "bio_link", type: "bio_link" },
  { field: "username", type: "username" },
  { field: "is_private", type: "privacy" },
];

export function diffSnapshots(prev: PublicProfile, next: PublicProfile): DetectedChange[] {
  const changes: DetectedChange[] = [];
  for (const { field, type } of FIELDS) {
    const a = prev[field];
    const b = next[field];
    if (a === undefined || b === undefined) continue;
    if (a === null && b === null) continue;
    if (String(a ?? "") !== String(b ?? "")) {
      changes.push({
        change_type: type,
        old_value: a === null || a === undefined ? null : String(a),
        new_value: b === null || b === undefined ? null : String(b),
      });
    }
  }
  return changes;
}

const SETTING_KEY: Record<ChangeType, keyof NotificationSettings> = {
  bio: "bio_enabled",
  photo: "photo_enabled",
  display_name: "name_enabled",
  bio_link: "link_enabled",
  username: "name_enabled",
  privacy: "private_public_enabled",
};

export function shouldNotify(change: DetectedChange, settings: NotificationSettings): boolean {
  return Boolean(settings[SETTING_KEY[change.change_type]]);
}
