"use client";

import type { AdsOutput } from "@/lib/addons/schemas";
import { cn } from "@/lib/utils";
import { Bullets, Pill, SectionCard, numID, rupiah } from "../common";

const STATUS = {
  bagus: { label: "Bagus", tone: "good" as const, bar: "bg-emerald-500" },
  perhatian: { label: "Perhatian", tone: "warn" as const, bar: "bg-amber-500" },
  boros: { label: "Boros", tone: "bad" as const, bar: "bg-red-500" },
};

/** Gauge setengah lingkaran untuk skor 0-100. */
function ScoreGauge({ score, verdict }: { score: number; verdict: AdsOutput["verdict"] }) {
  const r = 70;
  const c = Math.PI * r;
  const color = verdict === "sehat" ? "#10b981" : verdict === "kritis" ? "#ef4444" : "#f59e0b";
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 100" className="w-44" role="img" aria-label={`Skor ${score} dari 100`}>
        <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="currentColor" strokeWidth="14" className="text-muted" strokeLinecap="round" />
        <path
          d="M20 90 A70 70 0 0 1 160 90"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${(Math.max(0, Math.min(100, score)) / 100) * c} ${c}`}
        />
        <text x="90" y="82" textAnchor="middle" className="fill-foreground text-[34px] font-bold">
          {score}
        </text>
      </svg>
      <Pill tone={verdict === "sehat" ? "good" : verdict === "kritis" ? "bad" : "warn"}>
        {verdict === "sehat" ? "Sehat" : verdict === "kritis" ? "Kritis" : "Perlu perhatian"}
      </Pill>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function AdsResult({ data }: { data: AdsOutput }) {
  const camps = [...data.campaigns].sort((a, b) => b.spend - a.spend);
  const maxSpend = Math.max(...camps.map((c) => c.spend), 1);
  const useRoas = data.totals.roas !== null;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-[auto_1fr] sm:p-5">
        <ScoreGauge score={data.score} verdict={data.verdict} />
        <div className="space-y-3">
          <p className="text-base font-semibold sm:text-lg">{data.headline}</p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Kpi label="Total biaya" value={rupiah(data.totals.spend)} />
            <Kpi label={`Total ${data.result_label.toLowerCase()}`} value={numID(data.totals.results, 0)} />
            <Kpi label={useRoas ? "ROAS" : `Biaya / ${data.result_label.toLowerCase()}`} value={useRoas ? `${numID(data.totals.roas, 2)}x` : rupiah(data.totals.cpa)} />
            <Kpi label={data.totals.revenue !== null ? "Pendapatan" : "CTR"} value={data.totals.revenue !== null ? rupiah(data.totals.revenue) : data.totals.ctr !== null ? `${numID(data.totals.ctr, 2)}%` : "-"} />
          </div>
        </div>
      </div>

      <SectionCard title="Biaya per kampanye" hint={<span className="flex gap-3"><span>🟢 Bagus</span><span>🟡 Perhatian</span><span>🔴 Boros</span></span>}>
        <div className="space-y-2">
          {camps.slice(0, 12).map((c) => (
            <div key={c.name} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,16rem)_1fr_auto]">
              <span className="truncate" title={c.name}>
                {c.name}
              </span>
              <div className="h-3 rounded-full bg-muted">
                <div className={cn("h-3 rounded-full", STATUS[c.status].bar)} style={{ width: `${Math.max(2, (c.spend / maxSpend) * 100)}%` }} />
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">{rupiah(c.spend)}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Rapor per kampanye">
        <div className="space-y-2">
          {camps.map((c) => (
            <div key={c.name} className="rounded-xl border bg-background p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Pill>
                <span className="font-medium">{c.name}</span>
                <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                  {rupiah(c.spend)} · {numID(c.results, 0)} {data.result_label.toLowerCase()}
                  {c.roas !== null ? ` · ROAS ${numID(c.roas, 2)}x` : c.cpa !== null ? ` · ${rupiah(c.cpa)}/hasil` : ""}
                  {c.ctr !== null ? ` · CTR ${numID(c.ctr, 2)}%` : ""}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{c.diagnosis}</p>
              <p className="mt-1 text-sm font-medium">→ {c.action}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="🚨 Masalah utama">
          <Bullets items={data.problems} />
        </SectionCard>
        <SectionCard title="✅ Yang sudah bagus">
          <Bullets items={data.wins} />
        </SectionCard>
      </div>

      <SectionCard title="Usulan pembagian budget" hint="Sekarang → rekomendasi">
        <div className="space-y-3">
          {data.budget_plan.map((b) => {
            const up = b.recommended_share > b.current_share;
            return (
              <div key={b.name}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{b.name}</span>
                  <span className={cn("tabular-nums", up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                    {Math.round(b.current_share)}% → {Math.round(b.recommended_share)}% {up ? "▲" : b.recommended_share < b.current_share ? "▼" : ""}
                  </span>
                </div>
                <div className="mt-1 space-y-1">
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-muted-foreground/40" style={{ width: `${b.current_share}%` }} />
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${b.recommended_share}%` }} />
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{b.reason}</p>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Langkah perbaikan (urut dampak)">
        <ol className="space-y-2">
          {data.next_steps.map((s, i) => (
            <li key={i} className="flex gap-3 rounded-xl border bg-background p-3 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
              <span className="flex-1">{s.step}</span>
              <Pill tone={s.impact === "tinggi" ? "good" : s.impact === "sedang" ? "warn" : "muted"}>Dampak {s.impact}</Pill>
            </li>
          ))}
        </ol>
      </SectionCard>

      <p className="text-xs text-muted-foreground">Catatan data: {data.data_notes}</p>
    </div>
  );
}
