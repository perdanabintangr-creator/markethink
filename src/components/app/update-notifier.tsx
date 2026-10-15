"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const CURRENT = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

/**
 * Tab yang dibuka sebelum deploy terbaru masih memakai tampilan lama.
 * Cek versi saat tab kembali dibuka / tiap 3 menit; bila ada versi baru, tawarkan muat ulang.
 */
export function UpdateNotifier() {
  const shown = useRef(false);

  useEffect(() => {
    if (CURRENT === "dev") return;
    async function check() {
      if (shown.current || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { build } = (await res.json()) as { build?: string };
        if (!build || build === "dev" || build === CURRENT) return;
        shown.current = true;
        toast("✨ Markethink baru saja diperbarui", {
          description: "Muat ulang untuk memakai fitur & tampilan terbaru.",
          duration: Infinity,
          action: { label: "Muat ulang", onClick: () => window.location.reload() },
        });
      } catch {
        /* offline — coba lagi nanti */
      }
    }
    const t = setInterval(check, 3 * 60 * 1000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  return null;
}
