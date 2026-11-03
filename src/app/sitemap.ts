import type { MetadataRoute } from "next";
import { resolveAppUrl } from "@/lib/env";

/** Halaman publik untuk Google (Search Console → Peta Situs → sitemap.xml). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = resolveAppUrl();
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/harga`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/kontak`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/refund`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
