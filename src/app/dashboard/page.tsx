"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell, EmptyState, PushPrompt, timeAgo } from "@/components/ui";
import { PLAN_LABELS, type User, type UserTrackedProfile } from "@/lib/types";

interface Data {
  tracked: UserTrackedProfile[];
  user: User;
  unseenByProfile: Record<string, number>;
  totalCap: number;
}

export default function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/profiles");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    // Chargement initial : effet réseau légitime (setData arrive après await), pas un état dérivé.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function addProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Erreur");
      else {
        setUsername("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function removeProfile(id: string) {
    await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    await load();
  }

  const count = data?.tracked.length ?? 0;
  const max = data?.totalCap ?? 3;

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold">Profils suivis</h1>
      <p className="mt-1 text-sm text-gray-400">
        {data ? `${count}/${max} profils · plan ${PLAN_LABELS[data.user.plan]}` : "Chargement…"}
      </p>

      {/* add form */}
      <form onSubmit={addProfile} className="mt-5 flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-flip-pink">@</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="w-full rounded-full border border-pink-100 bg-white py-3 pl-9 pr-4 text-sm font-medium outline-none focus:border-flip-pink"
          />
        </div>
        <button
          disabled={busy || !username.trim()}
          className="flip-gradient rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg shadow-pink-200 transition hover:scale-105 disabled:opacity-40"
        >
          {busy ? "…" : "Suivre"}
        </button>
      </form>
      {error && (
        <p className="animate-pop mt-2 rounded-xl bg-flip-soft px-4 py-2 text-sm font-medium text-flip-pink">
          {error}{" "}
          {error.includes("Upgrade") && (
            <Link href="/settings" className="underline">
              Upgrade →
            </Link>
          )}
        </p>
      )}

      {/* activation des alertes push */}
      <PushPrompt />

      {/* parrainage banner */}
      <Link
        href="/referrals"
        className="mt-5 flex items-center justify-between rounded-2xl border border-pink-100 bg-gradient-to-r from-flip-soft to-orange-50 px-5 py-4 transition hover:scale-[1.01]"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎁</span>
          <div>
            <p className="text-sm font-extrabold">
              Invite tes amis, gagne jusqu&apos;à <span className="flip-gradient-text">30 jours offerts</span>
            </p>
            <p className="text-xs text-gray-400">3 amis = +7 jours · 6 amis = +10 jours · 10 amis = +13 jours</p>
          </div>
        </div>
        <span className="shrink-0 text-gray-300">›</span>
      </Link>

      {/* list */}
      <div className="mt-6 space-y-3">
        {data && count === 0 && (
          <EmptyState title="Aucun profil suivi" sub="Ajoute un @ pour recevoir tes premiers Flips." />
        )}
        {data?.tracked.map((t) => {
          const p = t.profile;
          const unseen = data.unseenByProfile[p.id] ?? 0;
          return (
            <div key={t.id} className="flip-card animate-pop flex items-center gap-3 p-4">
              <Link href={`/profile/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flip-gradient rounded-full p-[2px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      p.profile_image_url ||
                      `https://api.dicebear.com/9.x/initials/svg?seed=${p.username}&backgroundColor=ffe4ec&textColor=f43f5e`
                    }
                    alt={p.username}
                    className="h-12 w-12 rounded-full border-2 border-white bg-flip-soft object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold">
                    @{p.username}
                    {p.is_private && <span className="ml-1 text-xs">🔒</span>}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {p.display_name} · check {timeAgo(p.last_checked_at)}
                  </p>
                </div>
              </Link>
              {unseen > 0 && (
                <span className="flip-gradient rounded-full px-2.5 py-1 text-xs font-bold text-white">
                  {unseen} Flip{unseen > 1 ? "s" : ""}
                </span>
              )}
              <button
                onClick={() => removeProfile(p.id)}
                aria-label={`Ne plus suivre @${p.username}`}
                className="rounded-full px-2 py-1 text-gray-300 transition hover:bg-flip-soft hover:text-flip-pink"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
