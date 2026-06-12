"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell, ChangeRow, EmptyState, timeAgo } from "@/components/ui";
import type { ProfileChange, TrackedProfile } from "@/lib/types";

interface Data {
  profile: TrackedProfile;
  changes: ProfileChange[];
}

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Data | null>(null);
  const [checking, setChecking] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/profiles/${id}`);
    if (res.ok) setData(await res.json());
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function checkNow() {
    setChecking(true);
    setFlash(null);
    try {
      const res = await fetch(`/api/profiles/${id}/check`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setFlash(json.count > 0 ? `⚡ ${json.count} changement(s) détecté(s) !` : "Rien de neuf. Calme plat.");
        await load();
      } else setFlash(json.error ?? "Erreur");
    } finally {
      setChecking(false);
    }
  }

  if (!data)
    return (
      <AppShell>
        <p className="text-sm text-gray-400">Chargement…</p>
      </AppShell>
    );

  const p = data.profile;

  return (
    <AppShell>
      <Link href="/dashboard" className="text-sm font-semibold text-gray-400 hover:text-flip-pink">
        ← Retour
      </Link>

      {/* carte profil */}
      <div className="flip-card mt-4 p-6 text-center">
        <div className="flip-gradient mx-auto w-fit rounded-full p-[3px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.profile_image_url ?? ""}
            alt={p.username}
            className="h-24 w-24 rounded-full border-4 border-white bg-flip-soft object-cover"
          />
        </div>
        <h1 className="mt-3 text-2xl font-extrabold">@{p.username}</h1>
        <p className="text-sm text-gray-400">{p.display_name}</p>
        {p.bio && <p className="mx-auto mt-2 max-w-sm text-sm">{p.bio}</p>}
        {p.bio_link && (
          <a
            href={p.bio_link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm font-semibold text-flip-pink"
          >
            🔗 {p.bio_link}
          </a>
        )}
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <span>
            <strong>{p.posts_count ?? "—"}</strong> <span className="text-gray-400">posts</span>
          </span>
          <span>
            <strong>{p.followers_count ?? "—"}</strong> <span className="text-gray-400">abonnés</span>
          </span>
          <span>
            <strong>{p.following_count ?? "—"}</strong> <span className="text-gray-400">suivis</span>
          </span>
        </div>
        <button
          onClick={checkNow}
          disabled={checking}
          className="flip-gradient mt-5 rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-200 transition hover:scale-105 disabled:opacity-50"
        >
          {checking ? "Check en cours…" : "⚡ Check maintenant"}
        </button>
        <p className="mt-2 text-xs text-gray-400">Dernier check {timeAgo(p.last_checked_at)}</p>
        {flash && <p className="animate-pop mt-2 text-sm font-semibold text-flip-pink">{flash}</p>}
      </div>

      {/* avant / après */}
      <h2 className="mt-8 text-lg font-extrabold">Changements récents · AVANT / APRÈS</h2>
      <div className="flip-card mt-3 divide-y divide-gray-50">
        {data.changes.length === 0 ? (
          <EmptyState title="Aucun changement détecté" sub="Flip surveille. Dès que ça bouge, c'est ici." />
        ) : (
          data.changes.map((c) => <ChangeRow key={c.id} change={c} showUser={false} />)
        )}
      </div>
    </AppShell>
  );
}
