"use client";

import { FORCE_LABEL, type EntryOutput } from "@/lib/addons/schemas";
import { cn } from "@/lib/utils";
import { Pill, SectionCard, useResultsI18n } from "../common";
import { BarList, Sources, Summary, toneOf } from "./research-common";

const VERDICT: Record<EntryOutput["verdict"], { cls: string; color: string }> = {
  go: { cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", color: "#10b981" },
  go_bersyarat: { cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300", color: "#0ea5e9" },
  tunda: { cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300", color: "#f59e0b" },
  no_go: { cls: "bg-red-500/15 text-red-700 dark:text-red-300", color: "#ef4444" },
};

function Gauge({ score, color }: { score: number; color: string }) {
  const { t } = useResultsI18n();
  const r = 70;
  const c = Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  return (
    <svg viewBox="0 0 180 104" className="w-full max-w-[220px]" role="img" aria-label={t.entry.scoreAria(score)}>
      <path d="M20 94 A70 70 0 0 1 160 94" fill="none" className="stroke-muted" strokeWidth={14} strokeLinecap="round" />
      <path d="M20 94 A70 70 0 0 1 160 94" fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} />
      <text x={90} y={84} textAnchor="middle" className="fill-foreground text-[30px] font-bold">{score}</text>
      <text x={90} y={100} textAnchor="middle" className="fill-muted-foreground text-[10px]">{t.common.of100}</text>
    </svg>
  );
}

const LEVEL_W: Record<string, string> = { rendah: "w-1/3 bg-emerald-500", sedang: "w-2/3 bg-amber-500", tinggi: "w-full bg-red-500" };

/** Matriks risiko 5×5: peluang (X) × dampak (Y). */
function RiskMatrix({ risks }: { risks: EntryOutput["risks"] }) {
  const t = useResultsI18n().t.entry;
  const cell = (l: number, i: number) => {
    const s = l * i;
    return s >= 12 ? "bg-red-500/25" : s >= 6 ? "bg-amber-500/25" : "bg-emerald-500/20";
  };
  const clampI = (v: number) => Math.min(5, Math.max(1, Math.round(v)));
  return (
    <div className="mx-auto flex max-w-[300px] gap-2">
      <div className="flex items-center text-[10px] text-muted-foreground [writing-mode:vertical-rl] rotate-180">{t.impactAxis}</div>
      <div className="flex-1">
        <div className="grid grid-cols-5 gap-1">
          {[5, 4, 3, 2, 1].flatMap((imp) =>
            [1, 2, 3, 4, 5].map((lik) => {
              const here = risks.map((r, k) => ({ r, k })).filter(({ r }) => clampI(r.likelihood) === lik && clampI(r.impact) === imp);
              return (
                <div key={`${imp}-${lik}`} className={cn("flex aspect-square flex-wrap content-center items-center justify-center gap-0.5 rounded-md", cell(lik, imp))}>
                  {here.map(({ k }) => (
                    <span key={k} className="flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                      {k + 1}
                    </span>
                  ))}
                </div>
              );
            }),
          )}
        </div>
        <p className="mt-1 text-center text-[10px] text-muted-foreground">{t.likelihoodAxis}</p>
      </div>
    </div>
  );
}

export function EntryResult({ data }: { data: EntryOutput }) {
  const { t: tr, f } = useResultsI18n();
  const t = tr.entry;
  const shortRp = f.shortRp;
  const verdictKey = VERDICT[data.verdict] ? data.verdict : "tunda";
  const v = VERDICT[verdictKey];
  const score = data.weighted_score ?? 0;
  const ue = data.unit_economics;
  const profit = ue.price - ue.cogs - ue.marketing - ue.other;
  const margin = ue.price > 0 ? (profit / ue.price) * 100 : 0;
  const capital = data.capital.reduce((s, c) => s + c.amount_idr, 0);
  return (
    <div className="space-y-4">
      <section className="grid items-center gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-[220px_1fr] sm:p-5">
        <div className="flex justify-center">
          <Gauge score={score} color={v.color} />
        </div>
        <div className="space-y-2">
          <span className={cn("inline-flex rounded-full px-3 py-1 text-sm font-bold", v.cls)}>{t.verdict[verdictKey]}</span>
          <p className="text-sm">{data.verdict_reason}</p>
          <p className="text-sm text-muted-foreground">{data.summary}</p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={t.scorecard} hint={t.scorecardHint}>
          <BarList items={data.scorecard.map((c) => ({ label: `${c.criterion} (${Math.round(c.weight_pct)}%)`, value: c.score, hint: c.note }))} max={10} />
        </SectionCard>
        <SectionCard title={t.forces} hint={t.forcesHint}>
          <div className="space-y-3">
            {data.five_forces.map((f) => (
              <div key={f.force} className="text-sm">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <b>{tr.labels.force[f.force] ?? FORCE_LABEL[f.force]}</b>
                  <Pill tone={f.level === "tinggi" ? "bad" : f.level === "sedang" ? "warn" : "good"}>{tr.ev(f.level)}</Pill>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div className={cn("h-1.5 rounded-full", LEVEL_W[f.level])} />
                </div>
                <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">{f.reasons.map((r, k) => <li key={k}>• {r}</li>)}</ul>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={t.ue} hint={t.estimate}>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {[
              [t.price, ue.price],
              [t.cogs, ue.cogs],
              [t.marketing, ue.marketing],
              [t.other, ue.other],
            ].map(([l, val]) => (
              <div key={l as string} className="rounded-xl border bg-background p-2">
                <p className="text-xs text-muted-foreground">{l}</p>
                <p className="font-semibold">{shortRp(val as number)}</p>
              </div>
            ))}
          </div>
          <div className={cn("mt-3 rounded-xl p-3 text-sm", profit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10")}>
            {t.profitPerOrder} <b>{shortRp(profit)}</b> · {t.margin} <b>{f.n(margin, { maximumFractionDigits: 1 })}%</b>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{ue.note}</p>
        </SectionCard>
        <SectionCard title={t.capital} hint={t.total(shortRp(capital))}>
          <BarList items={data.capital.map((c) => ({ label: c.item, value: c.amount_idr / 1e6 }))} unit={t.millionUnit} color="bg-sky-500" />
        </SectionCard>
      </div>

      <SectionCard title={t.regs} hint={t.regsHint}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2">{t.thPermit}</th>
                <th>{t.thStatus}</th>
                <th>{t.thDetail}</th>
                <th>{t.thTime}</th>
                <th>{t.thCost}</th>
              </tr>
            </thead>
            <tbody className="divide-y align-top">
              {data.regulations.map((r, i) => (
                <tr key={i}>
                  <td className="py-2 pr-2 font-medium">{r.name}</td>
                  <td className="pr-2"><Pill tone={r.status === "wajib" ? "bad" : toneOf(r.status)}>{tr.ev(r.status)}</Pill></td>
                  <td className="pr-2 text-muted-foreground">{r.detail}</td>
                  <td className="pr-2 text-xs">{r.time}</td>
                  <td className="text-xs">{r.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title={t.entryModes} hint={t.pricingHint(data.pricing.strategy, data.pricing.price_range)}>
        <div className="grid gap-2 sm:grid-cols-2">
          {[...data.entry_modes]
            .sort((a, b) => b.fit - a.fit)
            .map((m, i) => (
              <div key={i} className={cn("rounded-xl border bg-background p-3 text-sm", i === 0 && "border-primary ring-1 ring-primary")}>
                <div className="flex items-center justify-between gap-2">
                  <b>{m.mode}</b>
                  <Pill tone={i === 0 ? "primary" : "muted"}>{i === 0 ? t.recommendedPrefix : ""}{Math.round(m.fit)}/10</Pill>
                </div>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">+ {m.pros}</p>
                <p className="text-xs text-red-600 dark:text-red-400">− {m.cons}</p>
              </div>
            ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{data.pricing.rationale}</p>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <SectionCard title={t.riskMap}>
          <RiskMatrix risks={data.risks} />
        </SectionCard>
        <SectionCard title={tr.common.risksMitigation}>
          <ol className="space-y-2 text-sm">
            {data.risks.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">{i + 1}</span>
                <span>
                  <b>{r.risk}</b>
                  <span className="block text-xs text-muted-foreground">{r.mitigation}</span>
                </span>
              </li>
            ))}
          </ol>
        </SectionCard>
      </div>

      <SectionCard title={t.plan90}>
        <div className="grid gap-2 md:grid-cols-3">
          {data.plan.map((p, i) => (
            <div key={i} className="rounded-xl border bg-background p-3 text-sm">
              <p className="text-xs font-semibold uppercase text-primary">{p.phase}</p>
              <p className="font-medium">{p.focus}</p>
              <ul className="mt-2 space-y-1 text-xs">{p.actions.map((a, k) => <li key={k}>☐ {a}</li>)}</ul>
              <p className="mt-2 rounded-md bg-muted px-2 py-1 text-xs">🎯 {p.kpi}</p>
            </div>
          ))}
        </div>
        {!!data.kpis.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {data.kpis.map((k, i) => (
              <span key={i} className="rounded-lg border px-2 py-1 text-xs">
                {k.metric}: <b>{k.target}</b>
              </span>
            ))}
          </div>
        )}
      </SectionCard>

      {!!data.barriers.length && (
        <SectionCard title={t.barriers}>
          <ul className="space-y-1.5 text-sm">{data.barriers.map((b, i) => <li key={i}>• {b}</li>)}</ul>
        </SectionCard>
      )}
      <Summary text={t.note} />
      <Sources sources={data.sources} />
    </div>
  );
}
