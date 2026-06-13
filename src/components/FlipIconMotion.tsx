"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";

/**
 * FlipIconMotion — animation d'icônes premium pour Flip (esprit Jitter Icons).
 *
 * Boucle de 5 phases :
 *  1. spread   — les cartes entrent une par une (scale + y + opacity, spring, rotation légère)
 *  2. wave     — une vague lumineuse traverse les icônes
 *  3. gather   — les cartes se regroupent au centre
 *  4. notif    — elles forment la notification "👀 Tu as reçu un Flip"
 *  5. (retour) — elles se redistribuent autour
 *
 * Autonome, responsive. Aucune page modifiée.
 */

type Phase = "spread" | "wave" | "gather" | "notif";

const ITEMS = [
  { emoji: "📸", label: "Photo changée", x: -210, y: -120, rot: -6 },
  { emoji: "✍️", label: "Bio modifiée", x: 210, y: -140, rot: 5 },
  { emoji: "🔗", label: "Nouveau lien", x: -235, y: 105, rot: 4 },
  { emoji: "📈", label: "+127 abonnés", x: 225, y: 125, rot: -5 },
  { emoji: "👀", label: "Nouveau Flip", x: 0, y: -205, rot: 0 },
];

// durées (ms) de chaque phase
const TIMELINE: { phase: Phase; dur: number }[] = [
  { phase: "spread", dur: 2400 },
  { phase: "wave", dur: 1100 },
  { phase: "gather", dur: 950 },
  { phase: "notif", dur: 2000 },
];

const cardVariants: Variants = {
  hidden: { scale: 0, y: 44, opacity: 0, x: 0, rotate: 0 },
  spread: (i: number) => ({
    scale: 1,
    opacity: 1,
    x: ITEMS[i].x,
    y: ITEMS[i].y,
    rotate: ITEMS[i].rot,
    transition: { type: "spring", stiffness: 260, damping: 17, delay: i * 0.08 },
  }),
  wave: (i: number) => ({
    scale: 1,
    opacity: 1,
    x: ITEMS[i].x,
    y: ITEMS[i].y,
    rotate: ITEMS[i].rot,
    transition: { type: "spring", stiffness: 260, damping: 17 },
  }),
  gather: (i: number) => ({
    scale: 0.35,
    opacity: 0,
    x: 0,
    y: 0,
    rotate: 0,
    transition: { duration: 0.45, delay: i * 0.04, ease: [0.4, 0, 1, 1] },
  }),
};

export default function FlipIconMotion({ className = "" }: { className?: string }) {
  const [step, setStep] = useState(0);
  const phase = TIMELINE[step].phase;

  useEffect(() => {
    const id = setTimeout(() => setStep((s) => (s + 1) % TIMELINE.length), TIMELINE[step].dur);
    return () => clearTimeout(id);
  }, [step]);

  // cartes : "notif" garde l'état "gather" (cachées au centre)
  const cardAnim = phase === "notif" ? "gather" : phase;

  return (
    <section className={`flex w-full items-center justify-center bg-white py-16 ${className}`}>
      <div className="relative h-[460px] w-[600px] max-w-full scale-[0.62] sm:scale-90 lg:scale-100">
        {/* halo doux */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(255,45,120,0.14), rgba(255,154,61,0.08) 45%, rgba(255,255,255,0) 72%)",
          }}
        />

        {/* cartes icônes */}
        {ITEMS.map((item, i) => (
          <motion.div
            key={item.label}
            custom={i}
            initial="hidden"
            animate={cardAnim}
            variants={cardVariants}
            className="absolute left-1/2 top-1/2 z-10 -ml-[120px] -mt-[40px] flex w-[240px] items-center gap-3 rounded-[26px] border border-black/[0.06] bg-white px-5 py-4 shadow-[0_24px_60px_rgba(0,0,0,0.10)]"
          >
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff2d78] to-[#ff9a3d] text-2xl">
              {item.emoji}
            </span>
            <span className="text-[19px] font-bold tracking-[-0.01em] text-[#0A0A0A]">
              {item.label}
            </span>

            {/* vague lumineuse qui traverse chaque carte */}
            <AnimatePresence>
              {phase === "wave" && (
                <motion.span
                  className="pointer-events-none absolute inset-0 rounded-[26px]"
                  style={{
                    background:
                      "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.85) 50%, transparent 70%)",
                  }}
                  initial={{ x: "-120%", opacity: 0 }}
                  animate={{ x: "120%", opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, delay: i * 0.09, ease: "easeInOut" }}
                />
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {/* notification finale */}
        <AnimatePresence>
          {phase === "notif" && (
            <motion.div
              key="notif"
              initial={{ scale: 0.5, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
              className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-4 rounded-[34px] border border-black/[0.06] bg-white px-8 py-6 shadow-[0_30px_80px_rgba(255,45,120,0.20)]"
            >
              <motion.span
                initial={{ rotate: -12, scale: 0.7 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.05 }}
                className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-[#ff2d78] to-[#ff9a3d] text-4xl"
              >
                👀
              </motion.span>
              <div>
                <p className="text-2xl font-black tracking-[-0.02em] text-[#0A0A0A]">
                  Tu as reçu un Flip
                </p>
                <p className="mt-0.5 text-base font-medium text-black/50">à l&apos;instant</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
