"use client";

import { useEffect, useState } from "react";

interface DigestItem {
  username: string;
  count: number;
  highlights: string[];
}
interface Digest {
  totalChanges: number;
  profilesMoved: number;
  headline: string;
  items: DigestItem[];
}

// Carte digest : résumé des updates pour créer de la rétention même sans gros changement.
export function DigestCard() {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/digest?period=weekly")
      .then((r) => r.json())
      .then(setDigest)
      .catch(() => {});
  }, []);

  if (!digest) return null;

  return (
    <div className="flip-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className="flip-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl">
          📬
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-flip-pink">
            Ton récap de la semaine
          </p>
          <p className="truncate text-sm font-bold">{digest.headline}</p>
        </div>
        {digest.items.length > 0 && (
          <span className="shrink-0 text-gray-300">{open ? "▲" : "▼"}</span>
        )}
      </button>

      {open && digest.items.length > 0 && (
        <div className="animate-pop divide-y divide-gray-50 border-t border-gray-50">
          {digest.items.map((it) => (
            <div key={it.username} className="px-5 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">@{it.username}</p>
                <span className="text-xs text-gray-400">{it.count} update(s)</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {it.highlights.map((h, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-flip-soft px-2 py-0.5 text-xs font-medium text-flip-pink"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
