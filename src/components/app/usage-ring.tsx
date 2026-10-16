"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CREDITS_CHANGED } from "@/lib/events";
import { UNLIMITED_CREDITS } from "@/lib/addons/format";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useApp } from "./app-context";

/** Tanggal 1 bulan depan, 00.00 WIB (saat kuota direset). */
function nextReset(now = new Date()) {
  const wib = new Date(now.getTime() + 7 * 3600_000);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth() + 1, 1) - 7 * 3600_000);
}

function resetText(now = new Date()) {
  const at = nextReset(now);
  const days = Math.ceil((at.getTime() - now.getTime()) / 86400_000);
  const date = at.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" });
  return days <= 1 ? `Reset besok, ${date}` : `Reset dalam ${days} hari · ${date}`;
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
  return { used, unlimited };
}

const tone = (used: number) => (used >= 100 ? "text-destructive" : used >= 80 ? "text-amber-500" : "text-primary");
const barTone = (used: number) => (used >= 100 ? "bg-destructive" : used >= 80 ? "bg-amber-500" : "bg-primary");

/** Lingkaran pemakaian (seperti Claude) — klik untuk melihat detail. */
export function UsageRing({ className }: { className?: string }) {
  const { planName } = useApp();
  const { used, unlimited } = useUsage();
  const r = 7;
  const c = 2 * Math.PI * r;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Pemakaian bulan ini ${used}%`}
        title={unlimited ? "Pemakaian: tanpa batas" : `Pemakaian bulan ini: ${used}%`}
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
          <p className="font-semibold">Penggunaan</p>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">Paket {planName}</span>
        </div>
        <div className="mt-3 flex items-baseline justify-between text-sm">
          <span className="font-medium">Bulan ini</span>
          <span className="text-muted-foreground">{unlimited ? "Tanpa batas" : `${used}% terpakai`}</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", barTone(used))} style={{ width: `${unlimited ? 0 : used}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{resetText()}</p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Satu kuota untuk chat, riset, gambar, Tools Pro & Agent. Otak yang lebih pintar dan hasil yang lebih panjang memakai kuota lebih banyak.
        </p>
        {!unlimited && (
          <Link href="/pricing" className="mt-3 block rounded-md border py-1.5 text-center text-sm font-medium hover:bg-accent">
            {used >= 80 ? "Tambah kuota — lihat paket" : "Lihat paket"}
          </Link>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
