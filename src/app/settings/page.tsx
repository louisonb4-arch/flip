"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/ui";
import type { NotificationSettings, User } from "@/lib/types";

const TOGGLES: { key: keyof NotificationSettings; label: string; icon: string }[] = [
  { key: "bio_enabled", label: "Bio modifiée", icon: "Aa" },
  { key: "photo_enabled", label: "Photo changée", icon: "📷" },
  { key: "name_enabled", label: "Nom affiché / username", icon: "👤" },
  { key: "link_enabled", label: "Lien en bio", icon: "🔗" },
  { key: "private_public_enabled", label: "Compte privé/public", icon: "🔒" },
  { key: "followers_enabled", label: "Variation d'abonnés", icon: "📈" },
  { key: "posts_enabled", label: "Nouveaux posts", icon: "🖼️" },
  { key: "email_enabled", label: "Alertes email", icon: "✉️" },
  { key: "push_enabled", label: "Alertes push", icon: "🔔" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.settings);
        setUser(d.user);
      });
  }, []);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    setSettings(d.settings);
    setUser(d.user);
  }

  const premium = user?.plan === "premium";

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold">Réglages</h1>

      {/* plan */}
      <div className="flip-card mt-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Plan actuel</p>
            <p className="text-xl font-extrabold capitalize">
              {user?.plan ?? "…"} {premium && "✨"}
            </p>
          </div>
          <button
            onClick={() => patch({ plan: premium ? "starter" : "premium" })}
            className={`rounded-full px-5 py-2.5 text-sm font-bold transition hover:scale-105 ${
              premium ? "bg-gray-100 text-gray-500" : "flip-gradient text-white shadow-lg shadow-pink-200"
            }`}
          >
            {premium ? "Repasser starter" : "Passer premium ✨"}
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          {premium
            ? "25 profils · checks toutes les 6 h · historique complet."
            : "Starter 1,99€/mois : 3 profils · check 1×/jour · 20 derniers changements."}
          {" "}(Paiement Stripe branché plus tard — toggle démo.)
        </p>
      </div>

      {/* notifications */}
      <h2 className="mt-8 text-lg font-extrabold">Notifications</h2>
      <div className="flip-card mt-3 divide-y divide-gray-50">
        {TOGGLES.map((t) => {
          const on = Boolean(settings?.[t.key]);
          return (
            <button
              key={t.key}
              onClick={() => patch({ [t.key]: !on })}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span className="text-sm font-semibold">
                <span className="mr-2">{t.icon}</span>
                {t.label}
              </span>
              <span
                className={`relative h-6 w-11 rounded-full transition ${on ? "flip-gradient" : "bg-gray-200"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    on ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        Flip suit uniquement des infos publiques. Jamais de mot de passe Instagram.
      </p>
    </AppShell>
  );
}
