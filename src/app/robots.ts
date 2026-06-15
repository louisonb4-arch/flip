import type { MetadataRoute } from "next";
import { LEGAL } from "@/lib/legal";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // zones privées / techniques : pas d'indexation
        disallow: [
          "/dashboard",
          "/settings",
          "/referrals",
          "/profile",
          "/invite",
          "/goodbye",
          "/auth",
          "/api",
        ],
      },
    ],
    sitemap: `${LEGAL.baseUrl}/sitemap.xml`,
    host: LEGAL.baseUrl,
  };
}
