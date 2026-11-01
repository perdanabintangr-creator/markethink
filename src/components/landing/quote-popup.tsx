"use client";

import { useEffect, useRef, useState } from "react";
import { Lightbulb, X } from "lucide-react";
import { MARKETING_QUOTES } from "@/lib/marketing-quotes";
import { cn } from "@/lib/utils";

const SHOW_MS = 7000;
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
 * Pop-up kata-kata marketing di bagian paling atas hero (tidak ikut turun saat scroll), berganti terus.
 * 100 kalimat diacak tiap kunjungan; berhenti saat kursor di atasnya; bisa ditutup (selama sesi).
 */
export function QuotePopup() {
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
    const t = setTimeout(() => setVisible(true), 900);
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
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-6xl justify-center px-4 pt-5">
        <div
          role="status"
          aria-live="polite"
          onPointerEnter={() => (paused.current = true)}
          onPointerLeave={() => (paused.current = false)}
          className={cn(
            "group pointer-events-auto relative flex w-full max-w-xl items-start gap-3 overflow-hidden rounded-2xl border border-white/15 bg-[#0b1636]/85 p-3 pr-9 text-white shadow-2xl shadow-cyan-500/20 backdrop-blur-xl transition-all duration-500 ease-out sm:p-3.5 sm:pr-10",
            visible ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-3 scale-95 opacity-0",
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0a6cff] to-[#12d0f5] shadow-lg shadow-cyan-500/30">
            <Lightbulb className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug sm:text-[15px]">“{q.text}”</p>
            <p className="mt-0.5 text-xs text-cyan-300">{q.by ? `— ${q.by}` : "Tips Marqthink"}</p>
          </div>
          <button
            type="button"
            aria-label="Tutup kata-kata marketing"
            onClick={() => {
              setClosed(true);
              try {
                sessionStorage.setItem(HIDE_KEY, "1");
              } catch {}
            }}
            className="absolute right-2 top-2 rounded-full p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
          {visible && (
            <span
              key={pos}
              className="mq-motion absolute bottom-0 left-0 h-0.5 w-full origin-left animate-[mq-grow_linear_both] group-hover:[animation-play-state:paused] bg-gradient-to-r from-[#0a6cff] to-[#12d0f5]"
              style={{ animationDuration: `${SHOW_MS}ms` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
