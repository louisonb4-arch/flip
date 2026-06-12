"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell, ChangeRow, EmptyState } from "@/components/ui";
import { DigestCard } from "@/components/digest";
import type { UserNotification } from "@/lib/types";

const FILTERS = [
  { value: "", label: "Tout" },
  { value: "bio", label: "Bio" },
  { value: "photo", label: "Photo" },
  { value: "bio_link", label: "Lien" },
  { value: "display_name", label: "Nom" },
  { value: "followers", label: "Abonnés" },
  { value: "posts", label: "Posts" },
];

export default function HistoryPage() {
  const [changes, setChanges] = useState<UserNotification[] | null>(null);
  const [filter, setFilter] = useState("");
  const [limited, setLimited] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/changes${filter ? `?type=${filter}` : ""}`);
    if (res.ok) {
      const json = await res.json();
      setChanges(json.changes);
      setLimited(json.limited);
    }
  }, [filter]);

  useEffect(() => {
    load();
    // marquer vu en arrivant sur l'historique
    fetch("/api/changes", { method: "POST" });
  }, [load]);

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold">Updates</h1>
      <p className="mt-1 text-sm text-gray-400">Tous les changements détectés.</p>

      <div className="mt-5">
        <DigestCard />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === f.value ? "flip-gradient text-white shadow" : "bg-flip-soft text-gray-500 hover:text-flip-pink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flip-card mt-5 divide-y divide-gray-50">
        {changes === null ? (
          <p className="px-4 py-6 text-sm text-gray-400">Chargement…</p>
        ) : changes.length === 0 ? (
          <EmptyState title="Rien pour l'instant" sub="Suis des profils, Flip s'occupe du reste." />
        ) : (
          changes.map((c) => <ChangeRow key={c.id} change={c} />)
        )}
      </div>

      {limited && changes && changes.length > 0 && (
        <p className="mt-4 rounded-xl bg-flip-soft px-4 py-3 text-center text-sm font-medium text-flip-pink">
          Historique limité aux 20 derniers en starter.{" "}
          <Link href="/settings" className="font-bold underline">
            Passe premium →
          </Link>
        </p>
      )}
    </AppShell>
  );
}
