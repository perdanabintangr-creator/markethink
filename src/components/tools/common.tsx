"use client";

import { useState } from "react";
import { Check, Copy, Download, FileSpreadsheet, Presentation, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ToolFileLite {
  id: string;
  name: string;
  kind: "pptx" | "xlsx";
  label: string;
}

/** Status kuota add-on yang aman dikirim ke client. */
export interface AddonStatusLite {
  id: string;
  name: string;
  price: number;
  quota: number;
  promaxQuota: number;
  trialQuota: number;
  isAdmin: boolean;
  isPromax: boolean;
  paidUntil: string | null;
  paidRemaining: number;
  promaxRemaining: number;
  trialRemaining: number;
  hasAccess: boolean;
  nextSource: "admin" | "promax" | "paid" | "trial" | null;
}

export const rupiah = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? "-" : `Rp${new Intl.NumberFormat("id-ID").format(Math.round(n))}`;
export const numID = (n: number | null | undefined, digits = 1) =>
  n === null || n === undefined || Number.isNaN(n) ? "-" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(n);
export const dateID = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }) : "-";

export function CopyButton({ text, label = "Salin", className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={cn("h-7 gap-1 px-2 text-xs print:hidden", className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Gagal menyalin. Salin manual ya.");
        }
      }}
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {done ? "Tersalin" : label}
    </Button>
  );
}

/** Tombol unduh file hasil + cetak/simpan PDF halaman hasil. */
export function FilesBar({ files }: { files: ToolFileLite[] }) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {files.map((f) => (
        <Button key={f.id} asChild variant={f.kind === "pptx" ? "default" : "outline"} size="sm">
          <a href={`/api/attachments/${f.id}?download`}>
            {f.kind === "pptx" ? <Presentation /> : <FileSpreadsheet />}
            {f.label}
            <Download className="opacity-60" />
          </a>
        </Button>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
        <Printer /> Cetak / simpan PDF
      </Button>
    </div>
  );
}

export function SectionCard({ title, hint, children, className }: { title: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-4 sm:p-5 print:break-inside-avoid", className)}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </section>
  );
}

export function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "good" | "warn" | "bad" | "primary" }) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    good: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    bad: "bg-red-500/15 text-red-700 dark:text-red-300",
    primary: "bg-primary/15 text-primary",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", tones[tone])}>{children}</span>;
}

export function Bullets({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("space-y-1.5 text-sm", className)}>
      {items.map((t, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/** Ringkasan status kuota add-on dalam satu kalimat. */
export function quotaText(s: AddonStatusLite) {
  if (s.isAdmin) return "Admin · tanpa batas";
  const parts: string[] = [];
  if (s.isPromax) parts.push(`Gratis Promax: sisa ${s.promaxRemaining}/${s.promaxQuota} bulan ini`);
  if (s.paidUntil) parts.push(`Add-on aktif s/d ${dateID(s.paidUntil)} · sisa ${s.paidRemaining}/${s.quota} bulan ini`);
  if (s.trialRemaining > 0) parts.push(`Coba gratis ${s.trialRemaining}×`);
  if (!parts.length) return "Belum aktif";
  return parts.join(" · ");
}
