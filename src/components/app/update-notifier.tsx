"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { shellText } from "@/lib/i18n/shell";
import { useApp } from "./app-context";

const CURRENT = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

/**
 * Tab yang dibuka sebelum deploy terbaru masih memakai tampilan lama.
 * Cek versi saat tab kembali dibuka / tiap 3 menit; bila ada versi baru, tawarkan muat ulang.
 */
export function UpdateNotifier() {
  const shown = useRef(false);
  const { lang } = useApp();
  // Disimpan di ref agar pengecekan berkala tidak perlu dipasang ulang saat bahasa berubah.
  const text = useRef(shellText(lang));
  useEffect(() => {
    text.current = shellText(lang);
  }, [lang]);

  useEffect(() => {
    if (CURRENT === "dev") return;
    async function check() {
      if (shown.current || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { build } = (await res.json()) as { build?: string };
        if (!build || build === "dev" || build === CURRENT) return;
        shown.current = true;
        const s = text.current;
        toast(s.updatedTitle, {
          description: s.updatedDesc,
          duration: Infinity,
          action: { label: s.reload, onClick: () => window.location.reload() },
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
