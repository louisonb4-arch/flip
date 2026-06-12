// ProfileFetcher — service modulaire de récupération de profils publics.
//
// DISCLAIMER : Flip ne suit que des informations PUBLIQUES observables.
// Aucun identifiant Instagram n'est demandé, collecté ni stocké.
// Aucune donnée privée n'est consultée.

import type { PublicProfile } from "./types";

export interface ProfileFetcher {
  name: string;
  fetchProfile(username: string): Promise<PublicProfile | null>;
}

// --- 1. Mock (développement) -------------------------------------------
// Profils déterministes + mutations pseudo-aléatoires dans le temps pour
// pouvoir tester la détection de changements sans appeler Instagram.

const MOCK_BIOS = [
  "vibes only ✌️",
  "ici pour le café et le chaos",
  "21 · paris · dm closed",
  "nouvelle ère 🌊",
  "rien à déclarer",
  "single btw",
];
const MOCK_LINKS = [null, "https://linktr.ee/demo", "https://youtube.com/@demo", null];
const MOCK_NAMES = ["Emma", "Léo", "Sarah", "Max", "Nina"];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Compteur d'appels (debug/tests) — prouve le fetch partagé.
export const fetchCounter: Record<string, number> = {};

export class MockFetcher implements ProfileFetcher {
  name = "mock";

  async fetchProfile(username: string): Promise<PublicProfile | null> {
    fetchCounter[username] = (fetchCounter[username] ?? 0) + 1;
    const h = hash(username);
    // "tick" change toutes les ~2 minutes → simule un profil qui évolue
    const tick = Math.floor(Date.now() / 120_000);
    const bio = MOCK_BIOS[(h + tick) % MOCK_BIOS.length];
    const link = MOCK_LINKS[(h + tick) % MOCK_LINKS.length];
    return {
      username,
      display_name: `${MOCK_NAMES[h % MOCK_NAMES.length]} ${username.slice(0, 3)}`,
      profile_image_url: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(username + Math.floor((h + tick) / 3))}`,
      bio,
      bio_link: link,
      followers_count: 100 + ((h + tick * 7) % 5000),
      following_count: 50 + (h % 900),
      posts_count: 10 + (h % 300),
      is_private: h % 7 === 0,
      raw_data: { source: "mock", tick },
    };
  }
}

// --- 2. Instagram web (endpoint public, sans login) ----------------------
// Lit le même endpoint JSON que la page profil publique d'Instagram.
// Aucun compte, aucun mot de passe : uniquement des données publiques.
// Limites : rate-limit IP. OK en beta ; passer derrière des proxies pour scaler.

const IG_APP_ID = "936619743392459"; // app id public de la web app Instagram
const IG_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// Les URLs CDN Instagram sont signées + hotlink-protected → proxy d'images.
function proxyImage(url: string | null): string | null {
  if (!url) return null;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
}

// Proxy résidentiel optionnel (RESIDENTIAL_PROXY_URL) — requis en prod :
// Instagram bloque les IPs datacenter (Vercel). Sans la variable → fetch direct (dev).
async function igFetchOptions(): Promise<RequestInit> {
  const proxyUrl = process.env.RESIDENTIAL_PROXY_URL;
  if (!proxyUrl) return {};
  const { ProxyAgent } = await import("undici");
  return { dispatcher: new ProxyAgent(proxyUrl) } as RequestInit;
}

export class InstagramWebFetcher implements ProfileFetcher {
  name = "instagram_web";

  async fetchProfile(username: string): Promise<PublicProfile | null> {
    fetchCounter[username] = (fetchCounter[username] ?? 0) + 1;
    const proxyOpts = await igFetchOptions();
    const res = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        ...proxyOpts,
        headers: {
          "x-ig-app-id": IG_APP_ID,
          "User-Agent": IG_UA,
          Accept: "*/*",
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
          Referer: `https://www.instagram.com/${encodeURIComponent(username)}/`,
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Dest": "empty",
        },
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      },
    );

    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Instagram web error ${res.status}`);

    const json = await res.json().catch(() => null);
    const u = json?.data?.user;
    if (!u) return null; // profil inexistant ou réponse inattendue

    return {
      username: u.username ?? username,
      display_name: u.full_name || null,
      profile_image_url: proxyImage(u.profile_pic_url_hd ?? u.profile_pic_url ?? null),
      bio: u.biography || null,
      bio_link:
        u.external_url ||
        u.bio_links?.[0]?.url ||
        null,
      followers_count: u.edge_followed_by?.count ?? null,
      following_count: u.edge_follow?.count ?? null,
      posts_count: u.edge_owner_to_timeline_media?.count ?? null,
      is_private: u.is_private ?? null,
      raw_data: { source: "instagram_web" },
    };
  }
}

// --- 3. Provider externe (production, plus tard) ------------------------
// Brancher ici un provider de données publiques légalement utilisable
// (API officielle si accessible, ou provider tiers sous contrat).
// Configuré via PROFILE_PROVIDER_URL + PROFILE_PROVIDER_KEY.

export class ExternalProviderFetcher implements ProfileFetcher {
  name = "external";
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  async fetchProfile(username: string): Promise<PublicProfile | null> {
    const res = await fetch(`${this.baseUrl}/profile/${encodeURIComponent(username)}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Provider error ${res.status}`);
    const d = await res.json();
    return {
      username: d.username ?? username,
      display_name: d.full_name ?? null,
      profile_image_url: d.profile_pic_url ?? null,
      bio: d.biography ?? null,
      bio_link: d.external_url ?? null,
      followers_count: d.follower_count ?? null,
      following_count: d.following_count ?? null,
      posts_count: d.media_count ?? null,
      is_private: d.is_private ?? null,
      raw_data: d,
    };
  }
}

// --- Factory -------------------------------------------------------------
// Un fetcher par plateforme : aujourd'hui mock partout en dev, mais chaque
// plateforme pourra brancher son propre provider (IG, TikTok, X...) via env
// PROFILE_PROVIDER_URL_<PLATFORM> sans toucher au reste du code.

import type { Platform } from "./types";

export function getFetcher(platform: Platform = "instagram"): ProfileFetcher {
  const mode = process.env.PROFILE_FETCHER ?? "mock";
  const key = platform.toUpperCase();
  const url = process.env[`PROFILE_PROVIDER_URL_${key}`] ?? process.env.PROFILE_PROVIDER_URL;
  const apiKey = process.env[`PROFILE_PROVIDER_KEY_${key}`] ?? process.env.PROFILE_PROVIDER_KEY;
  if (mode === "external" && url && apiKey) {
    return new ExternalProviderFetcher(url, apiKey);
  }
  // mode "web" : endpoint public Instagram (les autres plateformes restent mock)
  if (mode === "web" && platform === "instagram") {
    return new InstagramWebFetcher();
  }
  return new MockFetcher();
}
