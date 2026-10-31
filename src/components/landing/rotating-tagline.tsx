"use client";

import { useEffect, useState } from "react";
import { BRAND_TAGLINES } from "@/lib/brand";

/** Tagline yang berganti halus. */
export function RotatingTagline({ className }: { className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % BRAND_TAGLINES.length), 3200);
    return () => clearInterval(t);
  }, []);
  return (
    <span key={i} className={`inline-block animate-[mq-in_.6s_ease-out_both] ${className ?? ""}`}>
      {BRAND_TAGLINES[i]}
    </span>
  );
}
