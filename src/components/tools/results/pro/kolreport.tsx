"use client";

import { useMemo, useState } from "react";
import {
  METRIC_LABEL,
  OBJECTIVE_LABEL,
  PRIMARY_METRIC,
  TIER_LABEL,
  VERDICT_LABEL,
  WEIGHTS,
  kolCalcOf,
  type KolMetric,
  type KolObjective,
  type KolRow,
  type KolVerdict,
  type KolreportOutput,
} from "@/lib/addons/pro/specs/kolreport";
import { cn } from "@/lib/utils";
import { CardGrid, DataTable, Pill, Points, SectionCard, StatGrid, useResultsI18n } from "./kit";

const TONE: Record<KolVerdict, "good" | "warn" | "bad" | "muted"> = { lanjut: "good", negosiasi: "warn", stop: "bad", cek_data: "muted" };
const BAR: Record<KolVerdict, string> = { lanjut: "bg-emerald-500", negosiasi: "bg-amber-500", stop: "bg-red-500", cek_data: "bg-muted-foreground/40" };
const VERDICTS: KolVerdict[] = ["lanjut", "negosiasi", "stop", "cek_data"];
const LOWER_BETTER = new Set<KolMetric>(["cpm", "cpe", "cpc", "cpo"]);
/** Dua kolom metrik di tabel peringkat, sesuai tujuan kampanye. */
const TABLE_COLS: Record<KolObjective, { m: "cpm" | "cpe" | "cpc" | "cpo" | "roas"; label: string }[]> = {
  awareness: [{ m: "cpm", label: "CPM" }, { m: "cpe", label: "CPE" }],
  engagement: [{ m: "cpe", label: "CPE" }, { m: "cpm", label: "CPM" }],
  penjualan: [{ m: "cpo", label: "CPO" }, { m: "roas", label: "ROAS" }],
  install: [{ m: "cpo", label: "CPI" }, { m: "cpc", label: "CPC" }],
};

function ScoreBar({ score, verdict }: { score: number | null; verdict: KolVerdict }) {
  if (score === null) return <span className="text-xs text-muted-foreground">-</span>;
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 text-right font-semibold tabular-nums">{score}</span>
      <div className="h-1.5 w-16 rounded-full bg-muted">
        <div className={cn("h-1.5 rounded-full", BAR[verdict])} style={{ width: `${Math.max(3, score)}%` }} />
      </div>
    </div>
  );
}

function CreatorCard({ r }: { r: KolRow }) {
  const { t: tr, f } = useResultsI18n();
  const t = tr.kolreport;
  const { kolNum, kolRp, metricText } = f;
  const cells: [string, string][] = [
    [t.followers, kolNum(r.followers)],
    [t.fee, kolRp(r.fee)],
    [t.views, kolNum(r.views)],
    [t.engagement, kolNum(r.engagements)],
    [r.er_base === "followers" ? t.erFollowers : "ER", metricText("er", r.er)],
    [t.clicks, kolNum(r.clicks)],
    [t.orders, kolNum(r.orders)],
    [t.revenue, kolRp(r.revenue)],
    ["CPM", metricText("cpm", r.cpm)],
    ["CPE", metricText("cpe", r.cpe)],
    ["CPO", metricText("cpo", r.cpo)],
    ["ROAS", metricText("roas", r.roas)],
  ];
  return (
    <div className="rounded-xl border bg-background p-3 text-sm print:break-inside-avoid">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">
            <span className="text-muted-foreground">#{r.rank}</span> {r.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {[r.platform, TIER_LABEL[r.tier] !== "-" ? TIER_LABEL[r.tier] : "", r.content].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Pill tone={TONE[r.verdict]}>{tr.labels.kolVerdict[r.verdict] ?? VERDICT_LABEL[r.verdict]}</Pill>
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
        {cells
          .filter(([, v]) => v !== "-")
          .map(([k, v]) => (
            <div key={k}>
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium tabular-nums">{v}</dd>
            </div>
          ))}
      </dl>
      {r.note && <p className="mt-2 text-muted-foreground">{r.note}</p>}
      <p className="mt-2 rounded-lg bg-muted/60 p-2">
        <span className="text-xs font-semibold uppercase text-primary">{t.next}</span>
        {r.next_step}
        {r.fair_fee !== null && <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">{t.fairFee(kolRp(r.fair_fee))}</span>}
      </p>
    </div>
  );
}

export function KolreportResult({ data, objective }: { data: KolreportOutput; objective?: string }) {
  const { t: tr, f } = useResultsI18n();
  const t = tr.kolreport;
  const { kolNum, kolRp, metricText } = f;
  const verdictLabel = (v: KolVerdict) => tr.labels.kolVerdict[v] ?? VERDICT_LABEL[v];
  const calc = useMemo(() => kolCalcOf(data, (objective as KolObjective) || "penjualan"), [data, objective]);
  const o = calc.objective;
  const T = calc.totals;
  const primary = PRIMARY_METRIC[o];
  const cols = TABLE_COLS[o];
  const [filter, setFilter] = useState<KolVerdict | "all">("all");
  const metrics = (["cpm", "cpe", "cpc", "cpo", "roas", "er"] as KolMetric[]).filter((m) => calc.rows.filter((r) => r[m as keyof KolRow] !== null).length >= 1);
  const [metric, setMetric] = useState<KolMetric>(metrics.includes(primary) ? primary : (metrics[0] ?? "cpm"));
  const rows = filter === "all" ? calc.rows : calc.rows.filter((r) => r.verdict === filter);

  const metricRows = calc.rows
    .map((r) => ({ r, v: r[metric as keyof KolRow] as number | null }))
    .filter((x): x is { r: KolRow; v: number } => x.v !== null)
    .sort((a, b) => (LOWER_BETTER.has(metric) ? a.v - b.v : b.v - a.v));
  const maxV = Math.max(1e-9, ...metricRows.map((x) => x.v));

  const stats: { label: string; value: string; note?: string; tone?: "good" | "warn" | "bad" | "primary" }[] = [
    { label: t.totalFee, value: kolRp(T.fee), note: t.feeNote(T.creators, kolRp(T.avg_fee)), tone: "primary" },
    { label: t.totalViews, value: kolNum(T.views), note: T.followers ? t.fromFollowers(kolNum(T.followers)) : undefined },
    { label: t.engagement, value: kolNum(T.engagements), note: T.er !== null ? `ER ${metricText("er", T.er)}` : undefined },
    { label: t.campaignCpm, value: metricText("cpm", T.cpm), note: T.cpe !== null ? `CPE ${metricText("cpe", T.cpe)}` : undefined },
  ];
  if (T.clicks || T.orders || T.revenue) {
    stats.push(
      { label: t.clicks, value: kolNum(T.clicks), note: T.cpc !== null ? `CPC ${metricText("cpc", T.cpc)}` : undefined },
      { label: o === "install" ? t.installs : t.orders, value: kolNum(T.orders), note: T.cpo !== null ? `${o === "install" ? "CPI" : "CPO"} ${metricText("cpo", T.cpo)}` : undefined },
      { label: t.attributed, value: kolRp(T.revenue) },
      { label: t.campaignRoas, value: metricText("roas", T.roas), tone: T.roas === null ? undefined : T.roas >= 3 ? "good" : T.roas >= 1.5 ? "warn" : "bad" },
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t.summary}</p>
          <Pill tone="primary">{t.objective(tr.labels.kolObjective[o] ?? OBJECTIVE_LABEL[o])}</Pill>
        </div>
        <h2 className="mt-1 text-lg font-bold">{data.headline}</h2>
        <p className="mt-2 text-sm">{data.summary}</p>
      </section>

      <StatGrid items={stats} />

      <SectionCard
        title={t.ranking}
        hint={
          <span>{t.scoreBy(Object.entries(WEIGHTS[o]).map(([m, w]) => `${METRIC_LABEL[m as KolMetric]} ${Math.round((w ?? 0) * 100)}%`).join(" · "))}</span>
        }
      >
        <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-muted">
          {VERDICTS.map((v) => (calc.counts[v] ? <div key={v} className={BAR[v]} style={{ width: `${(calc.counts[v] / Math.max(1, T.creators)) * 100}%` }} title={`${verdictLabel(v)}: ${calc.counts[v]}`} /> : null))}
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5 print:hidden">
          {(["all", ...VERDICTS] as const)
            .filter((v) => v === "all" || calc.counts[v])
            .map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setFilter(v)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  filter === v ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary/50",
                )}
              >
                {v === "all" ? t.all(T.creators) : `${verdictLabel(v)} (${calc.counts[v]})`}
              </button>
            ))}
        </div>
        <DataTable
          headers={["#", t.creator, t.fee, t.views, "ER", ...cols.map((c) => c.label), t.score, t.verdict]}
          minWidth={820}
          rows={rows.map((r) => [
            <span key="r" className="text-muted-foreground">{r.rank}</span>,
            <div key="n" className="min-w-0">
              <p className="font-medium">{r.name}</p>
              <p className="text-xs font-normal text-muted-foreground">
                {r.platform} · {TIER_LABEL[r.tier]}
                {r.followers !== null ? ` · ${kolNum(r.followers)}` : ""}
              </p>
            </div>,
            <span key="f" className="tabular-nums">{kolRp(r.fee)}</span>,
            <span key="v" className="tabular-nums">{kolNum(r.views)}</span>,
            <span key="e" className="tabular-nums">{metricText("er", r.er)}</span>,
            ...cols.map((c) => (
              <span key={c.m} className="tabular-nums">
                {metricText(c.m, r[c.m])}
              </span>
            )),
            <ScoreBar key="s" score={r.score} verdict={r.verdict} />,
            <Pill key="p" tone={TONE[r.verdict]}>{verdictLabel(r.verdict)}</Pill>,
          ])}
        />
        <details className="group mt-3 rounded-xl border">
          <summary className="cursor-pointer list-none p-3 text-sm font-medium text-primary">
            <span className="group-open:hidden">{t.seeDetails}</span>
            <span className="hidden group-open:inline">{t.hideDetails}</span>
          </summary>
          <div className="grid gap-2 p-3 pt-0 md:grid-cols-2">
            {rows.map((r) => (
              <CreatorCard key={r.rank} r={r} />
            ))}
          </div>
        </details>
      </SectionCard>

      {metrics.length > 0 && (
        <SectionCard title={t.costPer} hint={LOWER_BETTER.has(metric) ? t.shorter : t.longer}>
          <div className="mb-3 flex flex-wrap gap-1.5 print:hidden">
            {metrics.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                className={cn("rounded-full border px-3 py-1 text-xs", metric === m ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary/50")}
              >
                {METRIC_LABEL[m]}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {metricRows.map(({ r, v }) => (
              <div key={r.rank} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-2 text-sm sm:grid-cols-[minmax(0,12rem)_1fr_auto]">
                <span className="truncate">{r.name}</span>
                <div className="h-2.5 rounded-full bg-muted">
                  <div className={cn("h-2.5 rounded-full", BAR[r.verdict])} style={{ width: `${Math.max(2, (v / maxV) * 100)}%` }} />
                </div>
                <span className="w-20 text-right font-medium tabular-nums">{metricText(metric, v)}</span>
              </div>
            ))}
          </div>
          {T[metric as "cpm"] !== undefined && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t.avg} <b>{metricText(metric, T[metric as "cpm" | "cpe" | "cpc" | "cpo" | "roas" | "er"])}</b>
              {t.barNote}
            </p>
          )}
        </SectionCard>
      )}

      <SectionCard title={t.insights}>
        <div className="space-y-2">
          {data.insights.map((i, k) => (
            <div key={k} className="grid gap-2 rounded-xl border bg-background p-3 text-sm md:grid-cols-3 print:break-inside-avoid">
              <p className="font-medium">{i.title}</p>
              <p className="text-muted-foreground">
                <span className="text-xs font-semibold uppercase">{tr.common.evidenceDot}</span>
                {i.evidence}
              </p>
              <p>
                <span className="text-xs font-semibold uppercase text-primary">{tr.common.soWhatDot}</span>
                {i.action}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t.lessons}>
        <CardGrid
          items={data.lessons.map((l) => ({
            title: l.lesson,
            tag: l.aspect,
            tone: "primary" as const,
            body: <span className="italic">{t.example(l.example)}</span>,
          }))}
        />
      </SectionCard>

      <SectionCard title={t.nextWave} hint={data.next_wave.budget_total ? t.budgetProposal(kolRp(data.next_wave.budget_total)) : undefined}>
        <p className="mb-3 text-sm">{data.next_wave.strategy}</p>
        <div className="grid gap-3 md:grid-cols-3">
          {(["lanjut", "negosiasi", "stop"] as const).map((v) => {
            const list = calc.rows.filter((r) => r.verdict === v);
            return (
              <div key={v} className={cn("rounded-xl p-3 text-sm", v === "lanjut" ? "bg-emerald-500/10" : v === "negosiasi" ? "bg-amber-500/10" : "bg-red-500/10")}>
                <div className="mb-2 flex items-center justify-between">
                  <b>{verdictLabel(v)}</b>
                  <Pill tone={TONE[v]}>{t.nCreators(list.length)}</Pill>
                </div>
                {list.length ? (
                  <ul className="space-y-2">
                    {list.map((r) => (
                      <li key={r.rank}>
                        <p className="font-medium">
                          {r.name} <span className="text-xs font-normal text-muted-foreground">{t.scoreOf(String(r.score ?? "-"))}</span>
                        </p>
                        <p className="text-muted-foreground">{r.next_step}</p>
                        {r.fair_fee !== null && (
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            {t.feeArrow(kolRp(r.fee), kolRp(r.fair_fee))}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">{t.none}</p>
                )}
              </div>
            );
          })}
        </div>

        {data.next_wave.budget.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{t.budgetAlloc}</p>
            <div className="mb-2 flex h-3 overflow-hidden rounded-full">
              {data.next_wave.budget.map((b, i) => (
                <div key={i} style={{ width: `${b.share_pct}%`, opacity: 1 - i * 0.15 }} className="bg-primary" title={`${b.bucket} ${b.share_pct}%`} />
              ))}
            </div>
            <div className="space-y-1.5">
              {data.next_wave.budget.map((b, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 size-2.5 shrink-0 rounded-full bg-primary" style={{ opacity: 1 - i * 0.15 }} />
                  <span className="flex-1">
                    <b>
                      {b.share_pct}% · {b.bucket}
                    </b>
                    {data.next_wave.budget_total ? <span className="text-muted-foreground"> ({kolRp((data.next_wave.budget_total * b.share_pct) / 100)})</span> : null}
                    <span className="block text-muted-foreground">{b.reason}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.next_wave.tests.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{t.experiments}</p>
            <Points items={data.next_wave.tests} />
          </div>
        )}
      </SectionCard>

      {data.data_notes && <p className="text-xs text-muted-foreground">{tr.common.dataNotes(data.data_notes)}</p>}
      <p className="text-xs text-muted-foreground">{t.method}</p>
    </div>
  );
}

