import type { MetadataRoute } from "next";
import { resolveAppUrl } from "@/lib/env";

/** Mesin pencari boleh membaca halaman publik; isi aplikasi (butuh login) & API tidak diindeks. */
export default function robots(): MetadataRoute.Robots {
  const base = resolveAppUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/dashboard", "/chat", "/tools", "/hasil", "/kalender", "/settings", "/workspaces", "/agents", "/pricing", "/onboarding", "/share/"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
