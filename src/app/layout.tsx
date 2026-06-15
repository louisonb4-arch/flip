import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LEGAL } from "@/lib/legal";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const TITLE = "Flip — Ne rate aucun update";
const DESCRIPTION =
  "Ton crush change sa bio ? Flip te le dit. Suivi des changements sur les comptes Instagram publics : bio, photo, nom, lien.";

export const metadata: Metadata = {
  metadataBase: new URL(LEGAL.baseUrl),
  title: TITLE,
  description: DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Flip",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Flip",
    title: TITLE,
    description: DESCRIPTION,
    url: LEGAL.baseUrl,
    locale: "fr_FR",
    images: ["/apple-touch-icon.png"],
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/apple-touch-icon.png"],
  },
};

export const viewport = {
  themeColor: "#f43f5e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
