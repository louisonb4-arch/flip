"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/ui";
import { PLAN_LABELS, type NotificationSettings, type Plan, type User } from "@/lib/types";

const PLAN_CARDS: { plan: Plan; price: string; desc: string }[] = [
  { plan: "starter", price: "1,99€", desc: "3 profils IG · 1×/jour · historique limité" },
  { plan: "premium", price: "4,99€", desc: "15 profils IG · 6 h · historique complet" },
  { plan: "social_plus", price: "9,99€", desc: "30 IG + 10 TikTok · 2 h · digest hebdo" },
];

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

  const current = user?.plan;

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold">Réglages</h1>

      {/* plan */}
      <div className="flip-card mt-5 p-6">
        <p className="text-sm text-gray-400">Plan actuel</p>
        <p className="text-xl font-extrabold">{current ? PLAN_LABELS[current] : "…"}</p>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {PLAN_CARDS.map((c) => {
            const active = current === c.plan;
            return (
              <button
                key={c.plan}
                onClick={() => !active && patch({ plan: c.plan })}
                className={`rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-flip-pink bg-flip-soft"
                    : "border-gray-100 hover:border-flip-pink"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{PLAN_LABELS[c.plan]}</span>
                  {active && <span className="text-xs font-bold text-flip-pink">actuel</span>}
                </div>
                <p className="mt-1 text-lg font-extrabold">
                  {c.price}
                  <span className="text-xs font-medium text-gray-400">/mois</span>
                </p>
                <p className="mt-1 text-xs text-gray-400">{c.desc}</p>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Paiement Stripe branché plus tard — changement de plan en démo.
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
