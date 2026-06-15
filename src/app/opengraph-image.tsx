import { ImageResponse } from "next/og";

export const alt = "Flip — alerte quand un profil Instagram public change";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Image OG simple générée à la volée (pas d'asset externe).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ff2d78, #ff5e62 52%, #ff9a3d)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 180, fontWeight: 800, letterSpacing: "-0.05em" }}>Flip.</div>
        <div style={{ fontSize: 44, fontWeight: 600, marginTop: 4, opacity: 0.96 }}>
          alerte quand un profil Instagram public change
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            marginTop: 30,
            padding: "12px 34px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.18)",
          }}
        >
          appflip.online · 🎁 3 jours offerts
        </div>
      </div>
    ),
    { ...size },
  );
}
