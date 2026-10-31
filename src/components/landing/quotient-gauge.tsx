"use client";

import { useEffect, useRef, useState } from "react";

/** "Marketing Quotient": skor yang naik saat terlihat di layar (ilustrasi). */
export function QuotientGauge({ from = 54, to = 92 }: { from?: number; to?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(from);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setV(to);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / 1600);
        setV(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [from, to]);
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div ref={ref} className="relative mx-auto size-36">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <defs>
          <linearGradient id="mq-gauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0a6cff" />
            <stop offset="1" stopColor="#12d0f5" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-muted" />
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" strokeLinecap="round" stroke="url(#mq-gauge)" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-brand text-3xl font-black tabular-nums">{v}</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">MQ</span>
      </div>
    </div>
  );
}
