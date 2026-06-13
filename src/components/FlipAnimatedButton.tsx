"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

/**
 * FlipAnimatedButton — bouton CTA premium pour Flip.
 * Inspiré des templates Jitter "Buttons".
 *
 * Animations (pures CSS, zéro dépendance) :
 *  - apparition scale + opacity
 *  - shimmer sweep au montage
 *  - hover : scale up, ombre renforcée, gradient qui glisse
 *  - tap : scale down rapide
 *  - icône qui bounce + halo discret derrière
 *
 * Exemples :
 *  <FlipAnimatedButton href="/auth/signup" />
 *  <FlipAnimatedButton variant="add-profile" onClick={openModal} />
 *  <FlipAnimatedButton>Texte custom</FlipAnimatedButton>
 */

export type FlipButtonVariant = "first-flip" | "add-profile" | "try" | "activate";

const PRESETS: Record<FlipButtonVariant, { label: string; icon: string }> = {
  "first-flip": { label: "Recevoir mon premier Flip", icon: "👀" },
  "add-profile": { label: "Ajouter un profil", icon: "＋" },
  try: { label: "Essayer Flip", icon: "✨" },
  activate: { label: "Activer les Flips", icon: "🔔" },
};

interface FlipAnimatedButtonProps {
  children?: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: FlipButtonVariant;
  className?: string;
  /** Passe `false` pour masquer l'icône, ou un node pour la remplacer. */
  icon?: ReactNode | false;
}

export default function FlipAnimatedButton({
  children,
  href,
  onClick,
  variant = "first-flip",
  className = "",
  icon,
}: FlipAnimatedButtonProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const preset = PRESETS[variant];
  const label = children ?? preset.label;
  const showIcon = icon !== false;
  const iconNode = icon ?? preset.icon;

  const inner = (
    <>
      <span className="fab-halo" aria-hidden />
      <span className={`fab-btn${mounted ? " fab-in" : ""}`}>
        {showIcon && (
          <span className="fab-icon" aria-hidden>
            {iconNode}
          </span>
        )}
        <span className="fab-label">{label}</span>
        <span className="fab-shine" aria-hidden />
      </span>

      <style>{css}</style>
    </>
  );

  const rootClass = `fab-root ${className}`;

  if (href) {
    return (
      <Link href={href} className={rootClass} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={rootClass} onClick={onClick}>
      {inner}
    </button>
  );
}

const css = `
.fab-root {
  position: relative;
  display: inline-flex;
  isolation: isolate;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  text-decoration: none;
}
.fab-root:focus-visible { outline: none; }
.fab-root:focus-visible .fab-btn {
  box-shadow: 0 0 0 4px rgba(255, 45, 120, 0.28), 0 18px 44px rgba(255, 45, 120, 0.34);
}

/* halo discret derrière */
.fab-halo {
  position: absolute;
  inset: -14px;
  z-index: -1;
  border-radius: 999px;
  background: radial-gradient(60% 60% at 50% 55%, rgba(255, 45, 120, 0.38), rgba(255, 154, 61, 0) 72%);
  filter: blur(20px);
  opacity: 0.55;
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.fab-root:hover .fab-halo { opacity: 0.9; transform: scale(1.06); }

/* bouton */
.fab-btn {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 18px 34px;
  border-radius: 999px;
  font-family: var(--font-inter), -apple-system, "Inter", system-ui, sans-serif;
  font-weight: 600;
  font-size: 19px;
  letter-spacing: -0.01em;
  color: #fff;
  white-space: nowrap;
  background-image: linear-gradient(100deg, #ff2d78 0%, #ff5e62 50%, #ff9a3d 100%);
  background-size: 180% auto;
  background-position: 0% center;
  box-shadow: 0 10px 30px rgba(255, 45, 120, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.28);
  /* apparition */
  opacity: 0;
  transform: scale(0.9);
  transition:
    transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.3s ease,
    background-position 0.5s ease;
}
.fab-btn.fab-in {
  opacity: 1;
  transform: scale(1);
}

/* hover : scale up + ombre + gradient qui glisse */
.fab-root:hover .fab-btn {
  transform: scale(1.045);
  background-position: 100% center;
  box-shadow: 0 18px 46px rgba(255, 45, 120, 0.40), inset 0 1px 0 rgba(255, 255, 255, 0.32);
}
/* tap : scale down rapide */
.fab-root:active .fab-btn {
  transform: scale(0.97);
  transition-duration: 0.08s;
}

.fab-label { position: relative; z-index: 2; }

/* icône qui bounce */
.fab-icon {
  position: relative;
  z-index: 2;
  font-size: 21px;
  line-height: 1;
  display: inline-flex;
  animation: fab-bounce 2.6s ease-in-out infinite;
}
.fab-root:hover .fab-icon { animation-duration: 1.1s; }
@keyframes fab-bounce {
  0%, 70%, 100% { transform: translateY(0); }
  82% { transform: translateY(-4px); }
  91% { transform: translateY(-1px); }
}

/* shimmer sweep (une passe au montage, relancé au hover) */
.fab-shine {
  position: absolute;
  top: 0;
  left: 0;
  width: 60%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
  transform: translateX(-160%) skewX(-18deg);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.55) 50%,
    rgba(255, 255, 255, 0) 100%
  );
}
.fab-in .fab-shine { animation: fab-sweep 1.05s ease-out 0.25s 1; }
.fab-root:hover .fab-shine { animation: fab-sweep 0.9s ease-out 1; }
@keyframes fab-sweep {
  from { transform: translateX(-160%) skewX(-18deg); }
  to { transform: translateX(320%) skewX(-18deg); }
}

@media (prefers-reduced-motion: reduce) {
  .fab-btn, .fab-icon, .fab-shine, .fab-halo { animation: none !important; transition: none !important; }
  .fab-btn { opacity: 1; transform: none; }
}
`;
