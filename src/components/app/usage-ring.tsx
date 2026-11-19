"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CREDITS_CHANGED } from "@/lib/events";
import { UNLIMITED_CREDITS } from "@/lib/addons/format";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { shellText, type ShellText } from "@/lib/i18n/shell";
import { cn } from "@/lib/utils";
import { nextWeekResetWib } from "@/lib/quota";
import { useApp } from "./app-context";

/** Teks waktu terisi ulang jatah mingguan (Senin 00.00 WIB). */
function resetText(s: ShellText, now = new Date()) {
  const at = nextWeekResetWib(now);
  const days = Math.ceil((at.getTime() - now.getTime()) / 86400_000);
  const date = at.toLocaleDateString(s.dateLocale, { day: "numeric", month: "short", timeZone: "Asia/Jakarta" });
  return days <= 1 ? s.resetTomorrow(date) : s.resetIn(days, date);
}

const pctOf = (used: number, limit: number) => (limit <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((used / limit) * 100))));

/** Jatah minggu ini & hari ini yang sudah dipakai (persen) — ikut berubah setelah setiap chat. */
export function useUsage() {
  const { credits } = useApp();
  const [remaining, setRemaining] = useState(credits.remaining);
  const [dayUsed, setDayUsed] = useState(credits.dayUsed ?? 0);
  const last = useRef(credits.remaining);
  useEffect(() => {
    last.current = credits.remaining;
    setRemaining(credits.remaining);
  }, [credits.remaining]);
  useEffect(() => setDayUsed(credits.dayUsed ?? 0), [credits.dayUsed]);
  useEffect(() => {
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<number>).detail;
      // Pemakaian hari ini ikut bertambah sebesar kredit yang baru terpakai.
      const spent = last.current - next;
      if (spent > 0) setDayUsed((d) => d + spent);
      last.current = next;
      setRemaining(next);
    };
    window.addEventListener(CREDITS_CHANGED, onChange);
    return () => window.removeEventListener(CREDITS_CHANGED, onChange);
  }, []);
  const unlimited = credits.monthLimit >= UNLIMITED_CREDITS;
  const used = unlimited ? 0 : pctOf(credits.monthLimit - remaining, credits.monthLimit);
  const day = unlimited || !credits.dayLimit ? 0 : pctOf(dayUsed, credits.dayLimit);
  // Lingkaran menampilkan yang paling penuh (yang lebih dulu membatasi).
  return { used, day, ring: Math.max(used, day), unlimited };
}

const tone = (used: number) => (used >= 100 ? "text-destructive" : used >= 80 ? "text-amber-500" : "text-primary");
const barTone = (used: number) => (used >= 100 ? "bg-destructive" : used >= 80 ? "bg-amber-500" : "bg-primary");

/** Lingkaran pemakaian (seperti Claude) — klik untuk melihat detail. */
export function UsageRing({ className }: { className?: string }) {
  const { planName, lang } = useApp();
  const s = shellText(lang);
  const { used, day, ring, unlimited } = useUsage();
  const r = 7;
  const c = 2 * Math.PI * r;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={s.usageAria(ring)}
        title={unlimited ? s.usageUnlimitedTitle : s.usageTitle(ring)}
        className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-accent", className)}
      >
        <svg viewBox="0 0 18 18" className="size-[18px] -rotate-90">
          <circle cx="9" cy="9" r={r} fill="none" strokeWidth="2.5" className="stroke-muted-foreground/25" />
          <circle
            cx="9"
            cy="9"
            r={r}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - ring / 100)}
            className={cn("stroke-current transition-all", tone(ring))}
          />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-72 p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{s.usage}</p>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{s.plan(planName)}</span>
        </div>
        {!unlimited && (
          <>
            <div className="mt-3 flex items-baseline justify-between text-sm">
              <span className="font-medium">{s.today}</span>
              <span className="text-muted-foreground">{s.usedPct(day)}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full transition-all", barTone(day))} style={{ width: `${day}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{s.resetTonight}</p>
          </>
        )}
        <div className="mt-3 flex items-baseline justify-between text-sm">
          <span className="font-medium">{s.thisMonth}</span>
          <span className="text-muted-foreground">{unlimited ? s.unlimited : s.usedPct(used)}</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", barTone(used))} style={{ width: `${unlimited ? 0 : used}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{resetText(s)}</p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{s.usageNote}</p>
        {!unlimited && (
          <Link href="/pricing" className="mt-3 block rounded-md border py-1.5 text-center text-sm font-medium hover:bg-accent">
            {ring >= 80 ? s.addQuota : s.seePlans}
          </Link>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
