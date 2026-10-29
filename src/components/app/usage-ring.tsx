"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CREDITS_CHANGED } from "@/lib/events";
import { UNLIMITED_CREDITS } from "@/lib/addons/format";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { shellText, type ShellText } from "@/lib/i18n/shell";
import { cn } from "@/lib/utils";
import { useApp } from "./app-context";

/** Tanggal 1 bulan depan, 00.00 WIB (saat kuota direset). */
function nextReset(now = new Date()) {
  const wib = new Date(now.getTime() + 7 * 3600_000);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth() + 1, 1) - 7 * 3600_000);
}

function resetText(s: ShellText, now = new Date()) {
  const at = nextReset(now);
  const days = Math.ceil((at.getTime() - now.getTime()) / 86400_000);
  const date = at.toLocaleDateString(s.dateLocale, { day: "numeric", month: "short", timeZone: "Asia/Jakarta" });
  return days <= 1 ? s.resetTomorrow(date) : s.resetIn(days, date);
}

/** Kuota yang sudah dipakai bulan ini (persen) — ikut berubah setelah setiap chat. */
export function useUsage() {
  const { credits } = useApp();
  const [remaining, setRemaining] = useState(credits.remaining);
  useEffect(() => setRemaining(credits.remaining), [credits.remaining]);
  useEffect(() => {
    const onChange = (e: Event) => setRemaining((e as CustomEvent<number>).detail);
    window.addEventListener(CREDITS_CHANGED, onChange);
    return () => window.removeEventListener(CREDITS_CHANGED, onChange);
  }, []);
  const unlimited = credits.monthLimit >= UNLIMITED_CREDITS;
  const used = unlimited || credits.monthLimit <= 0 ? 0 : Math.max(0, Math.min(100, Math.round(((credits.monthLimit - remaining) / credits.monthLimit) * 100)));
  return { used, unlimited, remaining };
}

const tone = (used: number) => (used >= 100 ? "text-destructive" : used >= 80 ? "text-amber-500" : "text-primary");
const barTone = (used: number) => (used >= 100 ? "bg-destructive" : used >= 80 ? "bg-amber-500" : "bg-primary");

/** Lingkaran pemakaian (seperti Claude) — klik untuk melihat detail. */
export function UsageRing({ className }: { className?: string }) {
  const { planName, lang } = useApp();
  const s = shellText(lang);
  const { used, unlimited } = useUsage();
  const r = 7;
  const c = 2 * Math.PI * r;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={s.usageAria(used)}
        title={unlimited ? s.usageUnlimitedTitle : s.usageTitle(used)}
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
            strokeDashoffset={c * (1 - used / 100)}
            className={cn("stroke-current transition-all", tone(used))}
          />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-72 p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{s.usage}</p>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{s.plan(planName)}</span>
        </div>
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
            {used >= 80 ? s.addQuota : s.seePlans}
          </Link>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
