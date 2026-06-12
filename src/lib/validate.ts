// Validation username Instagram + rate limit en mémoire.

const USERNAME_RE = /^[a-zA-Z0-9._]{1,30}$/;

export function validateUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().replace(/^@/, "").toLowerCase();
  if (!USERNAME_RE.test(u)) return null;
  if (u.startsWith(".") || u.endsWith(".") || u.includes("..")) return null;
  return u;
}

// Rate limit simple : N actions / fenêtre, par clé (userId).
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, max = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) return false;
  hits.push(now);
  buckets.set(key, hits);
  return true;
}
