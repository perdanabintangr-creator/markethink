"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { BRAND_ICON } from "@/lib/brand";
import { MARKETING_QUOTES } from "@/lib/marketing-quotes";
import { cn } from "@/lib/utils";

const SHOW_MS = 8000;
const GAP_MS = 700;
const HIDE_KEY = "mq_quote_popup_hidden";

function shuffled(n: number) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pop-up kecil di pojok kanan bawah (tetap ada saat scroll) berisi kalimat yang mengajak berlangganan.
 * 100 kalimat diacak tiap kunjungan; berhenti saat kursor di atasnya; bisa ditutup (selama sesi).
 */
export function QuotePopup({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  const [order, setOrder] = useState<number[] | null>(null);
  const [pos, setPos] = useState(0);
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);
  const paused = useRef(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(HIDE_KEY) === "1") return setClosed(true);
    } catch {}
    setOrder(shuffled(MARKETING_QUOTES.length));
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!order || closed) return;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (paused.current) {
        t = setTimeout(tick, 500);
        return;
      }
      setVisible(false);
      t = setTimeout(() => {
        setPos((p) => (p + 1) % order.length);
        setVisible(true);
      }, GAP_MS);
    };
    t = setTimeout(tick, SHOW_MS);
    return () => clearTimeout(t);
  }, [pos, order, closed]);

  if (closed || !order) return null;
  const q = MARKETING_QUOTES[order[pos]];

  return (
    <div
      role="status"
      aria-live="polite"
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
      className={cn(
        "group fixed bottom-3 right-3 z-40 w-[min(19rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/15 bg-[#0b1636]/90 p-3 pr-8 text-white shadow-2xl shadow-cyan-500/20 backdrop-blur-xl transition-all duration-500 ease-out sm:bottom-5 sm:right-5",
        visible ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-3 scale-95 opacity-0",
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND_ICON} alt="" className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0">
          <p className="text-[13px] leading-snug text-white/90">{q.text}</p>
          <Link href={ctaHref} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200">
            {ctaLabel} <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
      <button
        type="button"
        aria-label="Tutup"
        onClick={() => {
          setClosed(true);
          try {
            sessionStorage.setItem(HIDE_KEY, "1");
          } catch {}
        }}
        className="absolute right-1.5 top-1.5 rounded-full p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="size-3.5" />
      </button>
      {visible && (
        <span
          key={pos}
          className="mq-motion absolute bottom-0 left-0 h-0.5 w-full origin-left animate-[mq-grow_linear_both] bg-gradient-to-r from-[#0a6cff] to-[#12d0f5] group-hover:[animation-play-state:paused]"
          style={{ animationDuration: `${SHOW_MS}ms` }}
        />
      )}
    </div>
  );
}
