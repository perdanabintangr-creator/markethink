"use client";

import { useEffect, useState } from "react";
import { Check, Lightbulb } from "lucide-react";
import { ToolIcon } from "@/components/tools/tool-icon";
import { cn } from "@/lib/utils";
import { MARKETING_TIPS } from "@/lib/marketing-tips";

const SEEN_KEY = "mt-tips-seen";

/** Pilih tips berikutnya yang belum pernah tampil (diingat di browser); setelah semua tampil, mulai ulang. */
function nextTip(exclude?: number) {
  let seen: number[] = [];
  try {
    seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as number[];
  } catch {}
  let pool = MARKETING_TIPS.map((_, i) => i).filter((i) => !seen.includes(i));
  if (!pool.length) {
    seen = [];
    pool = MARKETING_TIPS.map((_, i) => i).filter((i) => i !== exclude);
  }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, pick]));
  } catch {}
  return pick;
}

/** Kemajuan yang terasa hidup tanpa menampilkan angka: cepat di awal, melambat mendekati 95%. */
function progressAt(ms: number, typicalSec: number) {
  const k = ms / 1000 / Math.max(20, typicalSec);
  return Math.min(0.95, 1 - Math.exp(-2.2 * k));
}

/**
 * Tampilan menunggu yang menyenangkan: orb beranimasi, daftar tahapan yang tercentang satu per satu,
 * bar kemajuan berkilau, dan tips marketing bergantian. Sengaja tanpa hitungan detik.
 */
export function WorkingShowcase({
  tool,
  title,
  steps,
  typical = 60,
  since,
  note,
  compact,
}: {
  tool?: string;
  title?: string;
  steps: string[];
  typical?: number;
  since?: number;
  note?: string;
  compact?: boolean;
}) {
  const [start, setStart] = useState(since ?? 0);
  const [now, setNow] = useState(since ?? 0);
  const [tip, setTip] = useState(-1);

  useEffect(() => {
    if (!since) setStart(Date.now());
    setNow(Date.now());
    setTip(nextTip());
    const t = setInterval(() => setNow(Date.now()), 400);
    const tt = setInterval(() => setTip((i) => nextTip(i)), 9000);
    return () => {
      clearInterval(t);
      clearInterval(tt);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const p = progressAt(now - start, typical);
  const step = Math.min(steps.length - 1, Math.floor((p / 0.95) * steps.length));
  const from = Math.max(0, Math.min(step - 1, steps.length - 4));
  const visible = steps.slice(from, from + 4);

  return (
    <div className={cn("flex w-full max-w-sm flex-col items-center text-center", compact ? "gap-4" : "gap-5")}>
      <div className={cn("relative grid place-items-center", compact ? "size-20" : "size-24")}>
        <div className="mt-glow absolute inset-2 rounded-full bg-primary/25 blur-xl" />
        <div className="mt-ring absolute inset-0 rounded-full" />
        <div className="mt-ring mt-ring-slow absolute inset-2 rounded-full" />
        <div className="mt-orbit absolute inset-0">
          <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
          <span className="absolute bottom-2 left-1 size-1 rounded-full bg-primary/70" />
        </div>
        <div className="mt-float relative grid size-11 place-items-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
          <ToolIcon id={tool ?? ""} className="size-5 text-primary" />
        </div>
      </div>

      <div className="space-y-1">
        <p className="mt-shimmer-text text-base font-semibold">{title ?? "Otak Markethink sedang bekerja…"}</p>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="mt-bar h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${Math.round(p * 100)}%` }} />
      </div>

      <ul className="w-full space-y-1.5 text-left text-sm">
        {visible.map((s, i) => {
          const idx = from + i;
          const done = idx < step;
          const active = idx === step;
          return (
            <li key={s} className={cn("mt-rise flex items-center gap-2", !done && !active && "opacity-40")}>
              <span
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full",
                  done ? "bg-primary text-primary-foreground" : active ? "ring-2 ring-primary/60" : "ring-1 ring-border",
                )}
              >
                {done ? <Check className="size-3" /> : active ? <span className="mt-glow size-1.5 rounded-full bg-primary" /> : null}
              </span>
              <span className={cn("truncate", active && "font-medium", done && "text-muted-foreground")}>{s.replace(/…$/, "")}</span>
            </li>
          );
        })}
      </ul>

      {!compact && tip >= 0 && (
        <div key={tip} className="mt-rise flex w-full items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-left text-xs">
          <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <span>
            <span className="font-medium">Sambil menunggu: </span>
            {MARKETING_TIPS[tip]}
          </span>
        </div>
      )}
    </div>
  );
}
