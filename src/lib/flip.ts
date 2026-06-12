import type { ChangeType } from "./types";

export interface FlipCopy {
  emoji: string;
  title: string;
  body: string;
}

export function getFlipCopy(
  changeType: ChangeType,
  username: string,
  oldValue?: string | null,
  newValue?: string | null,
): FlipCopy {
  const at = `@${username}`;

  switch (changeType) {
    case "bio":
      return { emoji: "👀", title: "Tu as reçu un Flip", body: `${at} vient de changer sa bio.` };
    case "photo":
      return { emoji: "👀", title: "Tu as reçu un Flip", body: `${at} a changé sa photo de profil.` };
    case "display_name":
      return { emoji: "👀", title: "Tu as reçu un Flip", body: `${at} a changé son nom affiché.` };
    case "bio_link":
      return { emoji: "👀", title: "Tu as reçu un Flip", body: `${at} a ajouté un nouveau lien.` };
    case "username":
      return { emoji: "👀", title: "Tu as reçu un Flip", body: `${at} a changé son username.` };
    case "privacy":
      if (newValue === "true" || newValue === "private")
        return { emoji: "👀", title: "Tu as reçu un Flip", body: `${at} est passé en privé.` };
      return { emoji: "👀", title: "Tu as reçu un Flip", body: `${at} est repassé public.` };
    case "followers": {
      const diff = parseFollowerDiff(oldValue, newValue);
      if (diff !== null && diff > 500)
        return {
          emoji: "🚀",
          title: "Tu as reçu un Flip",
          body: `${at} a gagné ${diff.toLocaleString("fr")} abonnés.`,
        };
      if (diff !== null && diff > 0)
        return {
          emoji: "📈",
          title: "Tu as reçu un Flip",
          body: `${at} gagne du terrain (+${diff.toLocaleString("fr")} abonnés).`,
        };
      return { emoji: "📉", title: "Tu as reçu un Flip", body: `${at} perd des abonnés.` };
    }
    case "following":
      return { emoji: "👀", title: "Tu as reçu un Flip", body: `${at} a modifié ses abonnements.` };
    case "posts":
      return { emoji: "👀", title: "Tu as reçu un Flip", body: `${at} a publié un nouveau post.` };
    default:
      return { emoji: "👀", title: "Tu as reçu un Flip", body: `${at} a modifié son profil.` };
  }
}

function parseFollowerDiff(oldVal?: string | null, newVal?: string | null): number | null {
  const o = parseInt(oldVal ?? "", 10);
  const n = parseInt(newVal ?? "", 10);
  if (isNaN(o) || isNaN(n)) return null;
  return n - o;
}
