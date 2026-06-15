"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell, FlipRow, EmptyState, PushPrompt } from "@/components/ui";
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

function groupFlips(flips: UserNotification[]) {
  const now = Date.now();
  const DAY = 86_400_000;
  const WEEK = 7 * DAY;

  const today: UserNotification[] = [];
  const week: UserNotification[] = [];
  const older: UserNotification[] = [];

  for (const f of flips) {
    const age = now - new Date(f.created_at).getTime();
    if (age < DAY) today.push(f);
    else if (age < WEEK) week.push(f);
    else older.push(f);
  }
  return { today, week, older };
}

function Section({ label, flips }: { label: string; flips: UserNotification[] }) {
  if (flips.length === 0) return null;
  return (
    <div className="mt-6">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <div className="flip-card divide-y divide-gray-50">
        {flips.map((f) => (
          <FlipRow key={f.id} flip={f} />
        ))}
      </div>
    </div>
  );
}

export default function FlipsPage() {
  const [flips, setFlips] = useState<UserNotification[] | null>(null);
  const [filter, setFilter] = useState("");
  const [limited, setLimited] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/changes${filter ? `?type=${filter}` : ""}`);
    if (res.ok) {
      const json = await res.json();
      setFlips(json.changes);
      setLimited(json.limited);
    }
  }, [filter]);

  useEffect(() => {
    // Chargement initial : effet réseau légitime (setState arrive après await), pas un état dérivé.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // marquer vu en arrivant
  useEffect(() => {
    fetch("/api/changes", { method: "POST" });
  }, []);

  const grouped = flips ? groupFlips(flips) : null;
  const total = flips?.length ?? 0;

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold">Tes Flips</h1>
      <p className="mt-1 text-sm text-gray-400">
        {flips === null
          ? "Chargement…"
          : total === 0
            ? "Aucun Flip pour l'instant."
            : `${total} Flip${total > 1 ? "s" : ""} reçu${total > 1 ? "s" : ""}`}
      </p>

      <PushPrompt />

      <div className="mt-5">
        <DigestCard />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === f.value
                ? "flip-gradient text-white shadow"
                : "bg-flip-soft text-gray-500 hover:text-flip-pink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {grouped && (
        <>
          <Section label="Aujourd'hui" flips={grouped.today} />
          <Section label="Cette semaine" flips={grouped.week} />
          <Section label="Plus ancien" flips={grouped.older} />
        </>
      )}

      {flips !== null && total === 0 && (
        <div className="mt-5">
          <EmptyState
            title="Aucun Flip pour l'instant"
            sub="Suis des profils, on t'envoie un Flip quand l'un d'eux change."
          />
        </div>
      )}

      {limited && total > 0 && (
        <p className="mt-4 rounded-xl bg-flip-soft px-4 py-3 text-center text-sm font-medium text-flip-pink">
          Historique limité aux 20 derniers en Flip Mini.{" "}
          <Link href="/settings" className="font-bold underline">
            Passe Flip Plus →
          </Link>
        </p>
      )}
    </AppShell>
  );
}
