"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ChangeType, UserNotification } from "@/lib/types";
import { CHANGE_LABELS } from "@/lib/types";

// ---------- helpers ----------

export function timeAgo(iso: string | null): string {
  if (!iso) return "jamais";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

export const CHANGE_ICONS: Record<ChangeType, { icon: string; bg: string }> = {
  bio: { icon: "Aa", bg: "bg-pink-500" },
  photo: { icon: "📷", bg: "bg-rose-400" },
  display_name: { icon: "👤", bg: "bg-orange-400" },
  bio_link: { icon: "🔗", bg: "bg-amber-400" },
  username: { icon: "@", bg: "bg-fuchsia-500" },
  privacy: { icon: "🔒", bg: "bg-violet-400" },
  followers: { icon: "📈", bg: "bg-emerald-400" },
  following: { icon: "👥", bg: "bg-sky-400" },
  posts: { icon: "🖼️", bg: "bg-indigo-400" },
};

// ---------- nav ----------

const TABS = [
  { href: "/dashboard", label: "Suivis", icon: "📡" },
  { href: "/history", label: "Historique", icon: "🕐" },
  { href: "/settings", label: "Réglages", icon: "⚙️" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 pb-28 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-2xl font-extrabold tracking-tight">
          Flip<span className="flip-gradient-text">.</span>
        </Link>
        <span className="rounded-full bg-flip-soft px-3 py-1 text-xs font-semibold text-flip-pink">
          Ne rate aucun update
        </span>
      </header>
      {children}
      <nav className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-full border border-pink-100 bg-white/90 p-1.5 shadow-lg shadow-pink-100 backdrop-blur">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                active ? "flip-gradient text-white shadow" : "text-gray-500 hover:bg-flip-soft"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// ---------- change row ----------

export function ChangeRow({ change, showUser = true }: { change: UserNotification; showUser?: boolean }) {
  const meta = CHANGE_ICONS[change.change_type];
  return (
    <div className="animate-pop flex items-start gap-3 px-4 py-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${meta.bg}`}
      >
        {meta.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            {CHANGE_LABELS[change.change_type]}
            {change.severity === "minor" && (
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400">
                digest
              </span>
            )}
          </p>
          <span className="shrink-0 text-xs text-gray-400">{timeAgo(change.created_at)}</span>
        </div>
        {showUser && change.username && (
          <p className="text-xs text-gray-400">@{change.username}</p>
        )}
        <div className="mt-1.5 space-y-1 text-xs">
          <p className="truncate rounded-lg bg-gray-50 px-2 py-1 text-gray-400 line-through">
            {change.old_value || "∅ vide"}
          </p>
          <p className="truncate rounded-lg bg-flip-soft px-2 py-1 font-medium text-flip-pink">
            {change.new_value || "∅ vide"}
          </p>
        </div>
      </div>
      {!change.seen && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-flip-pink" />}
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
