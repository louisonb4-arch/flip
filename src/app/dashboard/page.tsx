"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell, EmptyState, timeAgo } from "@/components/ui";
import type { User, UserTrackedProfile } from "@/lib/types";

interface Data {
  tracked: UserTrackedProfile[];
  user: User;
  unseenByProfile: Record<string, number>;
  limits: { maxProfiles: number };
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
  const max = data?.limits.maxProfiles ?? 3;

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold">Profils suivis</h1>
      <p className="mt-1 text-sm text-gray-400">
        {data ? `${count}/${max} profils · plan ${data.user.plan}` : "Chargement…"}
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
          {error.includes("premium") && (
            <Link href="/settings" className="underline">
              Upgrade →
            </Link>
          )}
        </p>
      )}

      {/* list */}
      <div className="mt-6 space-y-3">
        {data && count === 0 && (
          <EmptyState title="Personne en vue" sub="Ajoute un @ pour commencer le stalke (légal)." />
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
                    src={p.profile_image_url ?? ""}
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
                  {unseen} new
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
