import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Flip — Ne rate aucun update",
  description:
    "Ton crush change sa bio ? Flip te le dit. Suivi de profils Instagram publics : bio, photo, nom, lien.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
