"use client";

import { useState } from "react";
import type { SizingOutput } from "@/lib/addons/schemas";
import { parseRupiah } from "@/lib/addons/exports";
import { exportsText } from "@/lib/i18n/exports";
import { SectionCard, useResultsI18n } from "../common";

/**
 * Simulator target dari hasil Ukuran Pasar: geser pangsa pasar, harga & pertumbuhan → omzet & jumlah transaksi
 * yang dibutuhkan per bulan/hari. Dihitung di browser (gratis, tanpa AI).
 */
export function SizingSimulator({ data, price }: { data: SizingOutput; price?: unknown }) {
  const { f, lang } = useResultsI18n();
  const X = exportsText(lang);
  const sam = Math.max(0, data.sam.value_idr);
  const defShare = sam > 0 ? Math.min(10, Math.max(0.1, Math.round((data.som.value_idr / sam) * 1000) / 10)) : 1;
  const defPrice = parseRupiah(price) ?? 50_000;
  const [share, setShare] = useState(defShare);
  const [unit, setUnit] = useState(defPrice);
  const [growth, setGrowth] = useState(Math.round(Math.min(50, Math.max(0, data.cagr_pct || 10))));
  if (sam <= 0) return null;

  const year = sam * (share / 100);
  const month = year / 12;
  const tx = unit > 0 ? month / unit : 0;
  const year3 = year * (1 + growth / 100) ** 2;
  const n = (v: number) => f.n(Math.round(v));

  // Dipanggil sebagai fungsi (bukan <Komponen/>) supaya input tidak dibuat ulang saat digeser.
  const slider = (p: { label: string; value: number; min: number; max: number; step: number; shown: string; onChange: (v: number) => void }) => (
    <label className="block text-sm">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground">{p.label}</span>
        <b className="tabular-nums">{p.shown}</b>
      </span>
      <input type="range" min={p.min} max={p.max} step={p.step} value={p.value} onChange={(e) => p.onChange(Number(e.target.value))} className="mt-1 w-full accent-primary" />
    </label>
  );

  return (
    <SectionCard title={X.simTitle} hint={X.simHint} className="border-primary/40">
      <div className="grid gap-5 md:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {X.sam}: <b className="text-foreground">{f.shortRp(sam)}</b>
          </p>
          {slider({ label: X.share, value: share, min: 0.1, max: 20, step: 0.1, shown: `${share.toLocaleString(lang === "en" ? "en-US" : "id-ID")}%`, onChange: setShare })}
          <label className="block text-sm">
            <span className="text-muted-foreground">{X.price}</span>
            <input
              type="number"
              min={1000}
              step={1000}
              value={unit}
              onChange={(e) => setUnit(Math.max(0, Number(e.target.value)))}
              className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          {slider({ label: X.growth, value: growth, min: 0, max: 60, step: 1, shown: `${growth}%`, onChange: setGrowth })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: X.perYear, value: f.shortRp(year), strong: true },
            { label: X.perMonth, value: f.shortRp(month), strong: true },
            { label: X.txMonth, value: n(tx) },
            { label: X.txDay, value: n(tx / 30) },
            { label: X.in3y, value: f.shortRp(year3) },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-3 ${s.strong ? "bg-primary/10" : "bg-background"}`}>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
