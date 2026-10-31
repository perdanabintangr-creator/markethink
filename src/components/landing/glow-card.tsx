"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/** Kartu dengan sorot cahaya yang mengikuti kursor (efek futuristik, ringan: hanya CSS variable). */
export function GlowCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--gx", `${e.clientX - r.left}px`);
        el.style.setProperty("--gy", `${e.clientY - r.top}px`);
      }}
      className={cn(
        "group relative overflow-hidden rounded-3xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl",
        "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100",
        "before:bg-[radial-gradient(260px_circle_at_var(--gx,50%)_var(--gy,50%),rgba(18,208,245,0.16),transparent_65%)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
