"use client";

import { cn } from "@/lib/utils";
import { Bullets, Pill, SectionCard, useResultsI18n } from "../common";
import { shortRpID } from "./fmt";

/** Rupiah ringkas versi Indonesia. Untuk tampilan per bahasa pakai `useResultsI18n().f.shortRp`. */
export const shortRp = shortRpID;

export const toneOf = (level: string): "good" | "warn" | "bad" | "muted" =>
  ["tinggi", "positif", "peluang", "wajib"].includes(level) ? "good" : ["sedang", "netral", "disarankan", "cek"].includes(level) ? "warn" : ["rendah", "negatif", "ancaman"].includes(level) ? "bad" : "muted";

export function Summary({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
      {text}
      {children}
    </div>
  );
}

/** Batang horizontal berlabel (nilai 0..max). */
export function BarList({ items, max, unit = "", color = "bg-primary" }: { items: { label: string; value: number; hint?: string }[]; max?: number; unit?: string; color?: string }) {
  const { f } = useResultsI18n();
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2">
      {items.map((i, k) => (
        <div key={k} className="text-sm">
          <div className="mb-1 flex justify-between gap-2">
            <span className="truncate">{i.label}</span>
            <span className="shrink-0 font-medium tabular-nums">
              {new Intl.NumberFormat(f.locale, { maximumFractionDigits: 1 }).format(i.value)}
              {unit}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className={cn("h-2 rounded-full", color)} style={{ width: `${Math.max(2, Math.min(100, (i.value / top) * 100))}%` }} />
          </div>
          {i.hint && <p className="mt-0.5 text-xs text-muted-foreground">{i.hint}</p>}
        </div>
      ))}
    </div>
  );
}

export function Recommendations({ items, title }: { items: { title: string; detail: string; priority: string }[]; title?: string }) {
  const { t } = useResultsI18n();
  return (
    <SectionCard title={title ?? t.common.recommendations}>
      <ol className="space-y-2">
        {items.map((r, i) => (
          <li key={i} className="flex gap-3 rounded-xl border bg-background p-3 text-sm">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
            <span className="flex-1">
              <b>{r.title}</b>
              <span className="block text-muted-foreground">{r.detail}</span>
            </span>
            <Pill tone={r.priority === "tinggi" ? "good" : r.priority === "sedang" ? "warn" : "muted"}>{t.ev(r.priority)}</Pill>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

export function Sources({ sources }: { sources?: { title: string; url: string }[] }) {
  const { t } = useResultsI18n();
  if (!sources?.length) return <Bullets items={[t.common.noWebResearch]} className="text-xs text-muted-foreground" />;
  return (
    <SectionCard title={t.common.researchSources} hint={t.common.nSources(sources.length)}>
      <ol className="list-decimal space-y-1 pl-5 text-xs">
        {sources.map((s) => (
          <li key={s.url} className="truncate">
            <a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              {s.title || s.url}
            </a>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}
