"use client";

import { useState } from "react";
import { Check, Copy, Download, FileSpreadsheet, Presentation, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ToolFileLite } from "@/lib/addons/format";
import { useApp } from "@/components/app/app-context";
import type { Lang } from "@/lib/i18n/dict";
import { resultsText } from "@/lib/i18n/tools-results";
import { fmtFor } from "./results/fmt";

export { rupiah, numID, dateID, quotaText } from "@/lib/addons/format";
export type { AddonStatusLite, ToolFileLite } from "@/lib/addons/format";

/** Bahasa UI untuk halaman hasil Tools Pro. Aman dipakai di luar AppContextProvider (bawaan: Indonesia). */
export function useResultLang(): Lang {
  try {
    return useApp().lang;
  } catch {
    return "id";
  }
}

/** Teks statis (t), formatter angka/tanggal (f), dan bahasa hasil Tools Pro. */
export function useResultsI18n() {
  const lang = useResultLang();
  return { lang, t: resultsText(lang), f: fmtFor(lang) };
}

export function CopyButton({ text, label, className }: { text: string; label?: string; className?: string }) {
  const { t } = useResultsI18n();
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
          toast.error(t.common.copyFailed);
        }
      }}
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {done ? t.common.copied : (label ?? t.common.copy)}
    </Button>
  );
}

/** Tombol unduh file hasil + cetak/simpan PDF halaman hasil. */
export function FilesBar({ files }: { files: ToolFileLite[] }) {
  const { t } = useResultsI18n();
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
        <Printer /> {t.common.printPdf}
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

