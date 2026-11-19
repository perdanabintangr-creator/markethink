"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useApp } from "./app-context";
import { PROMO_SLIDE_MS, isExternalLink, type Promo, type PromoTheme } from "@/lib/promos";
import { shellText } from "@/lib/i18n/shell";
import { cn } from "@/lib/utils";

/** Latar tiap tema (tanpa gambar): gradasi gelap + cahaya brand, tetap gelap di mode terang & gelap agar terasa premium. */
const THEME: Record<PromoTheme, { base: string; glowA: string; glowB: string; accent: string }> = {
  midnight: {
    base: "linear-gradient(150deg,#040b1f 0%,#08214f 55%,#0a3a8c 100%)",
    glowA: "radial-gradient(60% 60% at 85% 10%,rgba(18,208,245,.55),transparent 70%)",
    glowB: "radial-gradient(55% 55% at 0% 100%,rgba(10,108,255,.45),transparent 70%)",
    accent: "#5fe3ff",
  },
  aurora: {
    base: "linear-gradient(160deg,#050a1c 0%,#0d1b45 50%,#1b1360 100%)",
    glowA: "radial-gradient(65% 55% at 90% 0%,rgba(124,92,255,.6),transparent 70%)",
    glowB: "radial-gradient(60% 60% at 10% 95%,rgba(18,208,245,.45),transparent 70%)",
    accent: "#b6a6ff",
  },
  sunrise: {
    base: "linear-gradient(155deg,#140816 0%,#3a0f2e 55%,#6b1d1d 100%)",
    glowA: "radial-gradient(60% 60% at 90% 5%,rgba(251,191,36,.55),transparent 70%)",
    glowB: "radial-gradient(60% 55% at 0% 100%,rgba(244,63,94,.4),transparent 70%)",
    accent: "#fcd34d",
  },
  ink: {
    base: "linear-gradient(160deg,#07080b 0%,#12141b 60%,#1c1f29 100%)",
    glowA: "radial-gradient(55% 50% at 100% 0%,rgba(212,175,55,.35),transparent 70%)",
    glowB: "radial-gradient(50% 50% at 0% 100%,rgba(148,163,184,.18),transparent 70%)",
    accent: "#e9c46a",
  },
};

const SEEN_KEY = "mq:promo-seen";

function trackOnce(id: string) {
  try {
    const seen = new Set<string>(JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]"));
    if (seen.has(id)) return;
    seen.add(id);
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    // Penyimpanan tidak tersedia → tetap catat (tidak fatal).
  }
  void fetch("/api/promo", { method: "POST", body: JSON.stringify({ id, kind: "view" }), keepalive: true }).catch(() => {});
}

/**
 * Slot promosi sidebar kiri: slide otomatis (6 dtk), berhenti saat disorot/disentuh, bisa digeser di HP,
 * titik penanda dengan garis waktu. Promosi brand lain diberi label "Sponsor".
 */
export function PromoCarousel({ onNavigate }: { onNavigate?: () => void }) {
  const { promos = [], lang } = useApp();
  const s = shellText(lang);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = promos.length;
  const current = promos[count ? index % count : 0];

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  // Berhenti saat tab tidak terlihat.
  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState !== "visible");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (count < 2 || paused || hidden) return;
    const t = setTimeout(() => go(index + 1), PROMO_SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, paused, hidden, count, go]);

  useEffect(() => {
    if (current && !hidden) trackOnce(current.id);
  }, [current, hidden]);

  if (!current) return null;

  const click = (p: Promo) => {
    void fetch("/api/promo", { method: "POST", body: JSON.stringify({ id: p.id, kind: "click" }), keepalive: true }).catch(() => {});
    onNavigate?.();
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={s.promoLabel}
      className="group/promo relative h-[13.5rem] shrink-0 select-none overflow-hidden rounded-2xl shadow-lg shadow-black/20 ring-1 ring-black/5 dark:ring-white/10"
      onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        touchX.current = null;
        setPaused(false);
        if (start == null || end == null || Math.abs(end - start) < 40) return;
        go(index + (end < start ? 1 : -1));
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      {promos.map((p, i) => {
        const active = i === index % count;
        const theme = THEME[p.theme] ?? THEME.midnight;
        const external = isExternalLink(p.link_url);
        return (
          <div
            key={p.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${count}`}
            aria-hidden={!active}
            className={cn(
              "absolute inset-0 transition-all duration-700 ease-out",
              active ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-3 opacity-0",
            )}
          >
            {/* Latar */}
            {p.image_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- gambar promosi dari storage publik */}
                <img
                  src={p.image_url}
                  alt=""
                  className={cn("absolute inset-0 size-full object-cover transition-transform duration-[6000ms] ease-linear", active && "mq-motion scale-105")}
                  loading={i === 0 ? "eager" : "lazy"}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
              </>
            ) : (
              <>
                <div className="absolute inset-0" style={{ background: theme.base }} />
                <div className="mq-motion absolute inset-0 animate-[mt-glow_7s_ease-in-out_infinite]" style={{ background: theme.glowA }} />
                <div className="absolute inset-0" style={{ background: theme.glowB }} />
                {/* Grid halus + huruf Q besar sebagai watermark brand */}
                <div
                  className="absolute inset-0 opacity-[0.07]"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,.9) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.9) 1px,transparent 1px)",
                    backgroundSize: "22px 22px",
                    maskImage: "radial-gradient(90% 80% at 70% 20%,#000,transparent)",
                  }}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-5 -top-12 font-brand text-[10rem] font-black leading-none text-white/[0.05]"
                >
                  Q
                </span>
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
              </>
            )}

            {/* Isi */}
            <div className="relative flex h-full flex-col p-3.5 text-white">
              <div className="flex items-center justify-between gap-2">
                {p.eyebrow ? (
                  <span
                    className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] backdrop-blur-md"
                    style={{ color: p.image_url ? undefined : theme.accent }}
                  >
                    {p.eyebrow}
                  </span>
                ) : (
                  <span />
                )}
                {p.sponsored && (
                  <span className="rounded-md bg-black/30 px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wider text-white/75 backdrop-blur-md">
                    {s.promoSponsor}
                  </span>
                )}
              </div>

              <div className="mt-auto space-y-1.5">
                {p.brand && p.sponsored && <p className="text-[10.5px] font-medium text-white/60">{p.brand}</p>}
                <h3 className="font-brand text-[15px] font-bold leading-snug tracking-tight [text-wrap:balance] line-clamp-3">{p.title}</h3>
                {p.subtitle && <p className="line-clamp-2 text-[11.5px] leading-snug text-white/70">{p.subtitle}</p>}
                <Link
                  href={p.link_url}
                  target={external ? "_blank" : undefined}
                  rel={external ? (p.sponsored ? "noopener noreferrer sponsored" : "noopener noreferrer") : undefined}
                  tabIndex={active ? 0 : -1}
                  onClick={() => click(p)}
                  className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-900 shadow-md shadow-black/20 transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  {p.cta_label}
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {/* Penanda slide: garis yang terisi selama slide tampil */}
      {count > 1 && (
        <div className="absolute bottom-[1.3rem] right-3.5 z-10 flex items-center gap-1" role="tablist" aria-label={s.promoLabel}>
          {promos.map((p, i) => {
            const active = i === index % count;
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={active}
                aria-label={`${s.promoGoTo} ${i + 1}`}
                onClick={() => go(i)}
                className={cn(
                  "relative h-1 overflow-hidden rounded-full bg-white/25 transition-all duration-300",
                  active ? "w-5" : "w-1.5 hover:bg-white/50",
                )}
              >
                {active && (
                  <span
                    key={`${p.id}-${index}`}
                    className="mq-motion absolute inset-0 origin-left animate-[mq-grow_linear_both] rounded-full bg-white"
                    style={{ animationDuration: `${PROMO_SLIDE_MS}ms`, animationPlayState: paused || hidden ? "paused" : "running" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
