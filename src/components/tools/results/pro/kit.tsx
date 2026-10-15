"use client";

import { cn } from "@/lib/utils";
import { CopyButton, Pill, SectionCard } from "../../common";

export { SectionCard, Pill, CopyButton };
export { BarList, Recommendations, Sources, Summary, shortRp, toneOf } from "../research-common";

/** Angka-angka utama (KPI) dalam kotak besar. */
export function StatGrid({ items }: { items: { label: string; value: string; note?: string; tone?: "good" | "warn" | "bad" | "primary" }[] }) {
  const tones = {
    good: "text-emerald-600 dark:text-emerald-400",
    warn: "text-amber-600 dark:text-amber-400",
    bad: "text-red-600 dark:text-red-400",
    primary: "text-primary",
  };
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((s, i) => (
        <div key={i} className="rounded-xl border bg-card p-3 print:break-inside-avoid">
          <p className="text-xs text-muted-foreground">{s.label}</p>
          <p className={cn("mt-0.5 text-xl font-bold tabular-nums", s.tone && tones[s.tone])}>{s.value}</p>
          {s.note && <p className="mt-0.5 text-[11px] text-muted-foreground">{s.note}</p>}
        </div>
      ))}
    </div>
  );
}

/** Tabel rapi yang bisa digeser di layar kecil. */
export function DataTable({ headers, rows, minWidth = 560, highlight }: { headers: string[]; rows: React.ReactNode[][]; minWidth?: number; highlight?: (i: number) => string | undefined }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            {headers.map((h) => (
              <th key={h} className="py-2 pr-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y align-top">
          {rows.map((r, i) => (
            <tr key={i} className={highlight?.(i)}>
              {r.map((c, k) => (
                <td key={k} className={cn("py-2 pr-3", k === 0 && "font-medium")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Alur waktu / fase berurutan. */
export function Timeline({ items }: { items: { title: string; when?: string; body?: React.ReactNode; tag?: string }[] }) {
  return (
    <ol className="relative space-y-4 border-l pl-5">
      {items.map((it, i) => (
        <li key={i} className="relative print:break-inside-avoid">
          <span className="absolute -left-[27px] top-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {i + 1}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{it.title}</p>
            {it.when && <Pill tone="primary">{it.when}</Pill>}
            {it.tag && <Pill>{it.tag}</Pill>}
          </div>
          {it.body && <div className="mt-1 text-sm text-muted-foreground">{it.body}</div>}
        </li>
      ))}
    </ol>
  );
}

/** Kartu-kartu (pilar, strategi, opsi). */
export function CardGrid({
  items,
  cols = 2,
}: {
  items: { title: string; body?: React.ReactNode; tag?: string; tone?: "good" | "warn" | "bad" | "primary" | "muted"; footer?: React.ReactNode }[];
  cols?: 2 | 3;
}) {
  return (
    <div className={cn("grid gap-2", cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")}>
      {items.map((c, i) => (
        <div key={i} className="rounded-xl border bg-background p-3 text-sm print:break-inside-avoid">
          <div className="flex items-start justify-between gap-2">
            <b>{c.title}</b>
            {c.tag && <Pill tone={c.tone ?? "muted"}>{c.tag}</Pill>}
          </div>
          {c.body && <div className="mt-1 text-muted-foreground">{c.body}</div>}
          {c.footer && <div className="mt-2">{c.footer}</div>}
        </div>
      ))}
    </div>
  );
}

/** Teks siap pakai (copy, caption, pesan) + tombol salin. */
export function CopyCard({ title, text, meta, mono }: { title?: string; text: string; meta?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-xl border bg-background p-3 print:break-inside-avoid">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {title && <p className="text-sm font-medium">{title}</p>}
          {meta && <div className="mt-0.5 flex flex-wrap gap-1 text-xs text-muted-foreground">{meta}</div>}
        </div>
        <CopyButton text={text} />
      </div>
      <p className={cn("whitespace-pre-line text-sm", mono && "font-mono text-xs")}>{text}</p>
    </div>
  );
}

/** Daftar periksa tugas. */
export function Checklist({ items }: { items: { task: string; owner?: string; when?: string }[] }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-0.5 size-4 shrink-0 rounded border" />
          <span className="flex-1">
            {it.task}
            {(it.owner || it.when) && (
              <span className="ml-1 text-xs text-muted-foreground">
                {[it.owner, it.when].filter(Boolean).join(" · ")}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Pasangan label–isi. */
export function KeyValues({ items }: { items: { k: string; v: React.ReactNode }[] }) {
  return (
    <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[180px_1fr]">
      {items.map((it, i) => (
        <div key={i} className="contents">
          <dt className="text-muted-foreground">{it.k}</dt>
          <dd>{it.v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Dua kolom Lakukan / Hindari. */
export function DoDont({ dos, donts, doLabel = "Lakukan", dontLabel = "Hindari" }: { dos: string[]; donts: string[]; doLabel?: string; dontLabel?: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl bg-emerald-500/10 p-3 text-sm">
        <p className="mb-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{doLabel}</p>
        <ul className="space-y-1">{dos.map((d, i) => <li key={i}>✓ {d}</li>)}</ul>
      </div>
      <div className="rounded-xl bg-red-500/10 p-3 text-sm">
        <p className="mb-1 text-xs font-semibold text-red-700 dark:text-red-300">{dontLabel}</p>
        <ul className="space-y-1">{donts.map((d, i) => <li key={i}>✕ {d}</li>)}</ul>
      </div>
    </div>
  );
}

/** Poin-poin sederhana. */
export function Points({ items, className }: { items: string[]; className?: string }) {
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

export const rp = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n) ? "-" : `Rp${new Intl.NumberFormat("id-ID").format(Math.round(n))}`;
export const num = (n: number | null | undefined, d = 0) =>
  n === null || n === undefined || !Number.isFinite(n) ? "-" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: d }).format(n);
