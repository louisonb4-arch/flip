import type { MetadataRoute } from "next";
import { LEGAL } from "@/lib/legal";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = ["", "/privacy", "/terms", "/mentions-legales"];
  return routes.map((path) => ({
    url: `${LEGAL.baseUrl}${path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.5,
  }));
}
