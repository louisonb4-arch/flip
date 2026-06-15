"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ChangeType, UserNotification } from "@/lib/types";
import { getFlipCopy } from "@/lib/flip";

// ---------- helpers ----------

export function timeAgo(iso: string | null): string {
  if (!iso) return "jamais";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

// ---------- push registration ----------

function usePushRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {});

    // Auto-réparation : si la permission est déjà accordée (ex: après réinstall PWA),
    // on (re)crée l'abonnement et on le renvoie au serveur. Idempotent (upsert par endpoint).
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted" &&
      "PushManager" in window &&
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    ) {
      navigator.serviceWorker.ready
        .then(async (reg) => {
          let sub = await reg.pushManager.getSubscription();
          if (!sub) {
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
            });
          }
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sub),
          });
        })
        .catch(() => {});
    }
  }, []);
}

// Opt-in explicite : demande la permission + crée un abonnement push NEUF.
// force=true → désabonne d'abord pour garantir un endpoint frais (réinstall PWA).
export async function enablePushSubscription(force = false): Promise<"ok" | "denied" | "unsupported"> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window))
    return "unsupported";
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub && force) {
    await sub.unsubscribe().catch(() => {});
    sub = null;
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    });
  }
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });
  return "ok";
}

// Force un abonnement neuf puis demande au serveur d'envoyer une notif test.
export async function sendTestPush(): Promise<string> {
  const state = await enablePushSubscription(true);
  if (state === "denied") return "Notifications bloquées. Autorise-les dans Réglages iPhone → Notifications → Flip.";
  if (state === "unsupported")
    return "Push non supporté. Ouvre Flip depuis l'icône de l'écran d'accueil (pas Safari).";
  const res = await fetch("/api/push/test", { method: "POST" });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) return d.error ?? "Échec de l'envoi.";
  if (d.sent > 0) return "Notif envoyée ! Regarde ton écran.";
  if (d.removed > 0) return "Abonnement expiré nettoyé. Réessaie pour t'abonner à nouveau.";
  return "Aucun appareil abonné.";
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// ---------- nav ----------

const TABS = [
  { href: "/dashboard", label: "Suivis", icon: "📡" },
  { href: "/notifications", label: "Flips", icon: "👀" },
  { href: "/settings", label: "Réglages", icon: "⚙️" },
];

function useUnseenFlips() {
  const [fetched, setFetched] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    // Sur la page Flips elle-même : pas de fetch (le badge y est dérivé à 0 ci-dessous).
    if (pathname === "/notifications") return;
    // /api/changes ne marque PAS vu (contrairement à /api/notifications)
    fetch("/api/changes")
      .then((r) => r.json())
      .then((d) => {
        const unseen = (d.changes ?? []).filter((f: UserNotification) => !f.seen).length;
        setFetched(unseen);
      })
      .catch(() => {});
  }, [pathname]);

  // Valeur dérivée : sur /notifications le compteur est à 0, sinon le dernier fetch.
  return pathname === "/notifications" ? 0 : fetched;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const unseenFlips = useUnseenFlips();
  usePushRegistration();

  const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  async function handleLogout() {
    if (!hasSupabase) return;
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 pb-28 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-2xl font-extrabold tracking-tight">
          Flip<span className="flip-gradient-text">.</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/referrals"
            className="flip-gradient flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white shadow-md shadow-pink-200 transition hover:scale-105"
          >
            <span>🎁</span>
            <span>Inviter</span>
          </Link>
          {hasSupabase && (
            <button
              onClick={handleLogout}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-gray-400 transition hover:bg-flip-soft hover:text-flip-pink"
            >
              Déconnexion
            </button>
          )}
        </div>
      </header>
      {children}
      <nav className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-full border border-pink-100 bg-white/90 p-1.5 shadow-lg shadow-pink-100 backdrop-blur">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`relative flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                active ? "flip-gradient text-white shadow" : "text-gray-500 hover:bg-flip-soft"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
              {t.href === "/notifications" && unseenFlips > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-flip-pink text-[10px] font-bold text-white shadow">
                  {unseenFlips > 9 ? "9+" : unseenFlips}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// ---------- flip row (feed) ----------

const NUMERIC_TYPES: ChangeType[] = ["followers", "following", "posts"];

function numericDiff(oldVal: string | null, newVal: string | null): number | null {
  const o = parseInt(oldVal ?? "", 10);
  const n = parseInt(newVal ?? "", 10);
  if (isNaN(o) || isNaN(n)) return null;
  return n - o;
}

// URL → affichage court "linktr.ee/emma" au lieu de l'URL complète.
function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "" : u.pathname;
    return `${u.hostname.replace(/^www\./, "")}${path}`.slice(0, 40);
  } catch {
    return url.slice(0, 40);
  }
}

export function FlipRow({ flip, showUser = true }: { flip: UserNotification; showUser?: boolean }) {
  const copy = getFlipCopy(flip.change_type, flip.username ?? "?", flip.old_value, flip.new_value);
  const isNumeric = NUMERIC_TYPES.includes(flip.change_type);
  const diff = isNumeric ? numericDiff(flip.old_value, flip.new_value) : null;

  // corps sans le @ si showUser=false (page profil : redondant)
  const body = showUser ? copy.body : copy.body.replace(/^@\S+\s/, "Ce profil ");

  return (
    <div className="animate-pop flex items-start gap-3 px-4 py-3.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-flip-soft text-2xl">
        {copy.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-800">
            {body}
            {flip.severity === "minor" && (
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400">
                résumé hebdo
              </span>
            )}
          </p>
          <span className="mt-0.5 shrink-0 text-xs text-gray-400">{timeAgo(flip.created_at)}</span>
        </div>

        {isNumeric && diff !== null ? (
          <span
            className={`mt-1.5 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${
              diff > 0 ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
            }`}
          >
            {diff > 0 ? "+" : ""}
            {diff.toLocaleString("fr")}{" "}
            {flip.change_type === "posts" ? "post" : "abonné"}
            {Math.abs(diff) > 1 ? "s" : ""}
          </span>
        ) : flip.change_type === "photo" ? (
          <div className="mt-2 flex items-center gap-3">
            {flip.old_value && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={flip.old_value}
                  alt="Ancienne photo"
                  className="h-14 w-14 rounded-full border-2 border-gray-200 object-cover opacity-50 grayscale"
                />
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-gray-100 px-1.5 text-[9px] font-bold text-gray-400">
                  avant
                </span>
              </div>
            )}
            {flip.old_value && flip.new_value && (
              <span className="text-flip-pink">→</span>
            )}
            {flip.new_value && (
              <div className="relative">
                <div className="flip-gradient rounded-full p-[2px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={flip.new_value}
                    alt="Nouvelle photo"
                    className="h-14 w-14 rounded-full border-2 border-white object-cover"
                  />
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-flip-soft px-1.5 text-[9px] font-bold text-flip-pink">
                  après
                </span>
              </div>
            )}
          </div>
        ) : flip.change_type === "bio_link" ? (
          <div className="mt-1.5 space-y-1 text-xs">
            {flip.old_value && (
              <p className="truncate rounded-lg bg-gray-50 px-2 py-1 text-gray-400 line-through">
                🔗 {shortUrl(flip.old_value)}
              </p>
            )}
            {flip.new_value && (
              <a
                href={flip.new_value}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate rounded-lg bg-flip-soft px-2 py-1 font-medium text-flip-pink underline-offset-2 hover:underline"
              >
                🔗 {shortUrl(flip.new_value)}
              </a>
            )}
          </div>
        ) : (
          (flip.old_value || flip.new_value) && (
            <div className="mt-1.5 space-y-1 text-xs">
              {flip.old_value && (
                <p className="truncate rounded-lg bg-gray-50 px-2 py-1 text-gray-400 line-through">
                  {flip.old_value}
                </p>
              )}
              {flip.new_value && (
                <p className="truncate rounded-lg bg-flip-soft px-2 py-1 font-medium text-flip-pink">
                  {flip.new_value}
                </p>
              )}
            </div>
          )
        )}
      </div>
      {!flip.seen && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-flip-pink" />}
    </div>
  );
}

export function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flip-card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="text-4xl">👀</span>
      <p className="font-bold">{title}</p>
      <p className="text-sm text-gray-400">{sub}</p>
    </div>
  );
}
