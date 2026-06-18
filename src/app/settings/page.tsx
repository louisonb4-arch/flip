"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell, enablePushSubscription, sendTestPush } from "@/components/ui";
import { LegalLinks } from "@/components/legal";
import { createClient } from "@/lib/supabase/client";
import { PLAN_LABELS, type NotificationSettings, type Plan, type User } from "@/lib/types";

const PLAN_CARDS: { plan: Plan; price: string; desc: string }[] = [
  { plan: "flip_mini", price: "3,99€", desc: "3 profils Instagram publics · Flip vérifie chaque jour · historique limité" },
  { plan: "flip_plus", price: "7,99€", desc: "10 profils Instagram publics · vérification plus fréquente · historique complet" },
  { plan: "flip_ultra", price: "14,99€", desc: "20 profils Instagram publics · vérification prioritaire · historique complet · TikTok bientôt" },
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
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.settings);
        setUser(d.user);
      });
  }, []);

  async function patch(body: Record<string, unknown>) {
    // activation des alertes push → permission navigateur + abonnement d'abord
    if (body.push_enabled === true) {
      const result = await enablePushSubscription();
      if (result === "denied") {
        alert("Notifications bloquées par le navigateur. Autorise-les dans les réglages du site.");
        return;
      }
      if (result === "unsupported") {
        alert(
          "Push non supporté ici. Sur iPhone : ajoute Flip à l'écran d'accueil (Partager → Sur l'écran d'accueil) puis réessaie.",
        );
        return;
      }
    }
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    setSettings(d.settings);
    setUser(d.user);
  }

  async function goCheckout(plan: Plan) {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const d: { url?: string; error?: string } = await res.json().catch(() => ({}));
    if (d.url) window.location.assign(d.url);
    else alert(d.error ?? "Paiement indisponible pour le moment.");
  }

  async function goPortal() {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const d: { url?: string; error?: string } = await res.json().catch(() => ({}));
    if (d.url) window.location.assign(d.url);
    else alert(d.error ?? "Aucun abonnement à gérer.");
  }

  async function deleteAccount() {
    if (confirmDelete.trim().toUpperCase() !== "SUPPRIMER") return;
    if (
      !window.confirm(
        "Dernière confirmation : supprimer définitivement ton compte et toutes tes données ? Cette action est irréversible.",
      )
    )
      return;
    setDeleting(true);
    setDelErr(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setDelErr(d.error ?? "La suppression a échoué. Réessaie.");
        setDeleting(false);
        return;
      }
      // déconnexion navigateur (best-effort) puis redirection vers la confirmation
      try {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL) await createClient().auth.signOut();
      } catch {
        // ignore
      }
      window.location.href = "/goodbye";
    } catch {
      setDelErr("Erreur réseau. Réessaie.");
      setDeleting(false);
    }
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
                onClick={() => !active && goCheckout(c.plan)}
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
        <button
          onClick={goPortal}
          className="mt-3 w-full rounded-2xl border border-gray-200 py-3 text-sm font-bold text-gray-600 transition hover:border-flip-pink hover:text-flip-pink"
        >
          Gérer mon abonnement
        </button>
        <p className="mt-2 text-center text-xs text-gray-400">
          Paiement sécurisé via Stripe · annulable à tout moment.
        </p>
      </div>

      {/* parrainage */}
      <Link
        href="/referrals"
        className="mt-5 flex items-center justify-between rounded-2xl bg-flip-soft px-5 py-4 transition hover:bg-pink-100"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🎁</span>
          <div>
            <p className="text-sm font-bold text-flip-pink">Parrainage</p>
            <p className="text-xs text-gray-400">Invite tes amis, gagne jusqu&apos;à 30 jours offerts</p>
          </div>
        </div>
        <span className="text-gray-300">›</span>
      </Link>

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

      {/* test push */}
      <button
        onClick={async () => {
          setTestMsg("Envoi…");
          const msg = await sendTestPush();
          setTestMsg(msg);
        }}
        className="mt-4 w-full rounded-2xl border border-pink-100 bg-flip-soft py-3.5 text-sm font-bold text-flip-pink transition hover:bg-pink-100"
      >
        🔔 Envoyer une notification test
      </button>
      {testMsg && <p className="mt-2 text-center text-xs font-medium text-gray-500">{testMsg}</p>}

      <p className="mt-6 text-center text-xs text-gray-400">
        Flip suit uniquement des infos publiques. Jamais de mot de passe Instagram.
      </p>

      {/* Zone de danger — suppression de compte (RGPD) */}
      <h2 className="mt-10 text-lg font-extrabold text-red-600">Zone de danger</h2>
      <div className="mt-3 rounded-2xl border border-red-200 bg-red-50/60 p-6">
        <p className="text-sm font-bold text-red-700">Supprimer mon compte</p>
        <p className="mt-1 text-xs leading-relaxed text-red-600/80">
          Supprime définitivement ton compte et toutes tes données : comptes suivis, notifications,
          abonnements push, parrainage et jours bonus. Cette action est <strong>irréversible</strong>.
        </p>
        <label className="mt-4 block text-xs font-semibold text-red-700">
          Tape <span className="font-mono font-bold">SUPPRIMER</span> pour confirmer
        </label>
        <input
          value={confirmDelete}
          onChange={(e) => setConfirmDelete(e.target.value)}
          placeholder="SUPPRIMER"
          className="mt-1.5 w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500"
        />
        {delErr && <p className="mt-2 text-xs font-medium text-red-600">{delErr}</p>}
        <button
          onClick={deleteAccount}
          disabled={deleting || confirmDelete.trim().toUpperCase() !== "SUPPRIMER"}
          className="mt-3 w-full rounded-full bg-red-600 py-3.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {deleting ? "Suppression…" : "Supprimer définitivement mon compte"}
        </button>
      </div>

      <div className="mt-10 border-t border-gray-100 pt-6">
        <LegalLinks />
      </div>
    </AppShell>
  );
}
