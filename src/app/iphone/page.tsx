"use client";

import { useState } from "react";

// Page de prévisualisation : l'app réelle dans un cadre iPhone (même origine → iframe OK).
const SCREENS = [
  { path: "/", label: "Landing" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/notifications", label: "Flips" },
  { path: "/referrals", label: "Parrainage" },
  { path: "/settings", label: "Réglages" },
];

export default function IphonePreview() {
  const [src, setSrc] = useState("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-neutral-100 px-4 py-8">
      <div className="flex flex-wrap justify-center gap-2">
        {SCREENS.map((s) => (
          <button
            key={s.path}
            onClick={() => setSrc(s.path)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              src === s.path
                ? "flip-gradient text-white shadow"
                : "bg-white text-gray-500 hover:text-flip-pink"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* cadre iPhone 15 Pro */}
      <div
        className="relative shrink-0 bg-black"
        style={{
          width: 393 + 28,
          height: 852 + 28,
          borderRadius: 68,
          padding: 14,
          boxShadow: "0 30px 60px rgba(0,0,0,0.35), inset 0 0 0 2px #2a2a2a",
        }}
      >
        {/* dynamic island */}
        <div
          className="absolute left-1/2 z-10 -translate-x-1/2 rounded-full bg-black"
          style={{ top: 26, width: 118, height: 34 }}
        />
        <iframe
          key={src}
          src={src}
          title="Flip iPhone preview"
          style={{
            width: 393,
            height: 852,
            border: "none",
            borderRadius: 54,
            background: "#fff",
            display: "block",
          }}
        />
      </div>

      <p className="text-xs text-gray-400">Flip — aperçu iPhone 15 Pro (app réelle)</p>
    </div>
  );
}
