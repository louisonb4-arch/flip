"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/ui";
import { MILESTONES, MAX_BONUS_DAYS } from "@/lib/referrals";
import type { ReferralData } from "@/lib/referrals";
import type { AccessStatus } from "@/lib/access";

type ReferralPayload = ReferralData & { access?: AccessStatus };

// ---------- Milestone card ----------

const MILESTONE_ICONS = ["👥", "👨‍👩‍👧", "🎉"];

function MilestoneCard({
  milestone,
  days,
  index,
  count,
  reward,
}: {
  milestone: number;
  days: number;
  index: number;
  count: number;
  reward?: { unlocked: boolean };
}) {
  const unlocked = reward?.unlocked ?? false;
  const progress = Math.min(count, milestone);
  const pct = Math.round((progress / milestone) * 100);
  const remaining = milestone - count;

  return (
    <div
      className={`flip-card relative flex items-center gap-4 p-4 transition ${
        unlocked ? "border-2 border-green-200 bg-green-50/40" : ""
      }`}
    >
      {/* Icon */}
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${
          unlocked ? "bg-green-100" : "bg-flip-soft"
        }`}
      >
        {MILESTONE_ICONS[index]}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="font-extrabold">{milestone} amis</p>
        <p className="text-xs text-gray-400">Invite {milestone} amis à rejoindre Flip</p>

        {/* Progress bar */}
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: unlocked
                ? "linear-gradient(90deg, #22c55e, #16a34a)"
                : "linear-gradient(90deg, #f43f5e, #fb923c)",
            }}
          />
        </div>
        <p
          className={`mt-1 text-xs font-semibold ${
            unlocked ? "text-green-500" : "text-flip-pink"
          }`}
        >
          {unlocked ? `${milestone} / ${milestone} amis ✓` : `${progress} / ${milestone} amis`}
        </p>
      </div>

      {/* Reward badge */}
      <div
        className={`flex shrink-0 flex-col items-center justify-center rounded-2xl px-3 py-2.5 text-center ${
          unlocked ? "bg-green-100" : "bg-flip-soft"
        }`}
      >
        <p
          className={`text-xl font-extrabold leading-none ${
            unlocked ? "text-green-600" : "text-flip-pink"
          }`}
        >
          +{days}
        </p>
        <p
          className={`text-[11px] font-bold ${unlocked ? "text-green-500" : "text-flip-pink"}`}
        >
          jours
        </p>
      </div>

      {/* Unlocked checkmark */}
      {unlocked && (
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs text-white shadow">
          ✓
        </span>
      )}

      {/* Status text */}
      {!unlocked && remaining > 0 && (
        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-gray-400 shadow-sm border border-gray-100">
          Encore {remaining} ami{remaining > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

// ---------- Main page ----------

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralPayload | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  async function load() {
    const res = await fetch("/api/referrals");
    if (res.ok) setData(await res.json());
  }

  async function createCode() {
    setCreating(true);
    try {
      const res = await fetch("/api/referrals/create-code", { method: "POST" });
      if (res.ok) await load();
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    // Chargement initial : effet réseau légitime (setData arrive après await), pas un état dérivé.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function copyLink() {
    if (!data?.link) return;
    await navigator.clipboard.writeText(data.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    if (!data?.link) return;
    if (navigator.share) {
      await navigator.share({
        title: "Rejoins-moi sur Flip !",
        text: "Suis les changements de profils Instagram en temps réel avec Flip.",
        url: data.link,
      }).catch(() => {});
    } else {
      await copyLink();
    }
  }

  const count = data?.referral_count ?? 0;
  const totalBonusDays = data?.total_bonus_days ?? 0;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Parrainage</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            Invite tes amis et débloque des récompenses.
          </p>
        </div>
        <button
          onClick={data?.code ? shareLink : createCode}
          disabled={creating}
          className="flip-gradient flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-200 transition hover:scale-105 disabled:opacity-40"
        >
          <span>+</span>
          <span>Inviter</span>
        </button>
      </div>

      {/* Accès / essai (calculé côté serveur) */}
      {data?.access && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-pink-100 bg-flip-soft px-4 py-3">
          <span className="text-2xl">{data.access.hasAccess ? "✨" : "🔒"}</span>
          <div>
            <p className="text-sm font-extrabold text-flip-ink">
              {data.access.hasAccess
                ? `${data.access.daysLeft} jour${data.access.daysLeft > 1 ? "s" : ""} d'accès restants`
                : "Période d'essai terminée"}
            </p>
            <p className="text-xs text-gray-400">
              Essai {data.access.trialDays} j
              {data.access.bonusDays > 0 ? ` + ${data.access.bonusDays} j bonus` : ""} · parraine pour gagner plus.
            </p>
          </div>
        </div>
      )}

      {/* Total bonus */}
      {totalBonusDays > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-green-50 border border-green-200 px-4 py-3">
          <span className="text-2xl">🎁</span>
          <div>
            <p className="text-sm font-extrabold text-green-700">
              {totalBonusDays} jour{totalBonusDays > 1 ? "s" : ""} offert{totalBonusDays > 1 ? "s" : ""} gagnés !
            </p>
            <p className="text-xs text-green-500">Utilisables dès que Stripe est branché.</p>
          </div>
        </div>
      )}

      {/* Milestone cards */}
      <div className="mt-5 space-y-5">
        {data === null ? (
          <p className="text-sm text-gray-400">Chargement…</p>
        ) : (
          MILESTONES.map((m, i) => (
            <MilestoneCard
              key={m.count}
              milestone={m.count}
              days={m.days}
              index={i}
              count={count}
              reward={data.rewards.find((r) => r.milestone === m.count)}
            />
          ))
        )}
      </div>

      {/* Gift card */}
      <div className="mt-5 flip-card flex items-center gap-4 p-5">
        <span className="text-4xl">🎁</span>
        <div>
          <p className="font-extrabold">
            Jusqu&apos;à{" "}
            <span className="flip-gradient-text">{MAX_BONUS_DAYS} jours</span> offerts au total !
          </p>
          <p className="mt-0.5 text-sm text-gray-400">Merci pour ton soutien ♡</p>
        </div>
      </div>

      {/* Referral link section */}
      <div className="mt-6">
        <p className="mb-2 text-sm font-bold text-gray-700">Ton lien de parrainage</p>

        {data?.code ? (
          <>
            <div className="flex items-center gap-2 rounded-2xl border border-pink-100 bg-flip-soft px-4 py-3">
              <p className="min-w-0 flex-1 truncate text-sm font-mono font-medium text-flip-pink">
                {data.link}
              </p>
              <button
                onClick={copyLink}
                className="shrink-0 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm transition hover:text-flip-pink"
              >
                {copied ? "Copié ✓" : "Copier"}
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-gray-400">
              Code : <span className="font-bold text-flip-pink">{data.code}</span>
            </p>

            <button
              onClick={shareLink}
              className="flip-gradient mt-4 w-full rounded-full py-4 font-bold text-white shadow-lg shadow-pink-200 transition hover:scale-[1.02]"
            >
              Partager mon lien
            </button>
          </>
        ) : (
          <button
            onClick={createCode}
            disabled={creating}
            className="flip-gradient w-full rounded-full py-4 font-bold text-white shadow-lg shadow-pink-200 transition hover:scale-[1.02] disabled:opacity-40"
          >
            {creating ? "Génération…" : "Générer mon lien"}
          </button>
        )}
      </div>

      <p className="mt-8 text-center text-xs text-gray-400">
        Une récompense est validée uniquement quand ton ami crée un compte Flip.
      </p>
    </AppShell>
  );
}
