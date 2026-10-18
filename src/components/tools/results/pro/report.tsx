"use client";

import { STATUS_LABEL, type ReportOutput } from "@/lib/addons/pro/specs/report";
import { cn } from "@/lib/utils";
import { DataTable, Pill, SectionCard, useResultsI18n } from "./kit";

const statusTone = { tercapai: "good", hampir: "warn", tertinggal: "bad", tanpa_target: "muted" } as const;
const verdictTone = { bagus: "good", stabil: "muted", perlu_perbaikan: "bad" } as const;

function delta(k: ReportOutput["kpis"][number]) {
  if (k.value === null || k.previous === null || k.previous === 0) return null;
  const pct = ((k.value - k.previous) / Math.abs(k.previous)) * 100;
  return pct;
}

export function ReportResult({ data }: { data: ReportOutput }) {
  const { t: tr, f } = useResultsI18n();
  const t = tr.report;
  const { kpiValue, shortRp } = f;
  const statusLabel = (s: keyof typeof STATUS_LABEL) => tr.labels.reportStatus[s] ?? STATUS_LABEL[s];
  const money = data.channels.filter((c) => c.spend !== null || c.revenue !== null);
  const maxMoney = Math.max(1, ...money.flatMap((c) => [c.spend ?? 0, c.revenue ?? 0]));
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{tr.common.execSummary}</p>
        <h2 className="mt-1 text-lg font-bold">{data.headline}</h2>
        <p className="mt-2 text-sm">{data.summary}</p>
      </section>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {data.kpis.slice(0, 8).map((k) => {
          const d = delta(k);
          return (
            <div key={k.name} className="rounded-xl border bg-card p-3 print:break-inside-avoid">
              <div className="flex items-start justify-between gap-1">
                <p className="text-xs text-muted-foreground">{k.name}</p>
                <Pill tone={statusTone[k.status]}>{statusLabel(k.status)}</Pill>
              </div>
              <p className="mt-1 text-xl font-bold tabular-nums">{kpiValue(k, k.value)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {d !== null && (
                  <span className={cn("font-medium", d >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                    {d >= 0 ? "▲" : "▼"} {f.n(Math.abs(d), { maximumFractionDigits: 1 })}%{" "}
                  </span>
                )}
                {k.target !== null && <>{t.target(kpiValue(k, k.target))}</>}
              </p>
            </div>
          );
        })}
      </div>

      <SectionCard title={t.kpiVsTarget}>
        <DataTable
          headers={t.kpiHeaders}
          minWidth={720}
          rows={data.kpis.map((k) => [
            k.name,
            kpiValue(k, k.value),
            kpiValue(k, k.previous),
            kpiValue(k, k.target),
            <Pill key="s" tone={statusTone[k.status]}>{statusLabel(k.status)}</Pill>,
            <span key="n" className="text-xs text-muted-foreground">{k.note}</span>,
          ])}
        />
      </SectionCard>

      <SectionCard title={t.channelPerf}>
        {money.length > 0 && (
          <div className="mb-4 space-y-3">
            {money.map((c) => (
              <div key={c.channel} className="text-sm">
                <div className="mb-1 flex justify-between">
                  <span className="font-medium">{c.channel}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.spend !== null && c.revenue !== null && c.spend > 0 ? `ROAS ${f.n(c.revenue / c.spend, { maximumFractionDigits: 2 })}x` : ""}
                  </span>
                </div>
                <div className="space-y-1">
                  {c.spend !== null && (
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full bg-amber-500" style={{ width: `${Math.max(2, (c.spend / maxMoney) * 100)}%` }} />
                      <span className="shrink-0 text-[11px] text-muted-foreground">{t.spend(shortRp(c.spend))}</span>
                    </div>
                  )}
                  {c.revenue !== null && (
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max(2, (c.revenue / maxMoney) * 100)}%` }} />
                      <span className="shrink-0 text-[11px] text-muted-foreground">{t.revenue(shortRp(c.revenue))}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {data.channels.map((c) => (
            <div key={c.channel} className="rounded-xl border bg-background p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <b>{c.channel}</b>
                <Pill tone={verdictTone[c.verdict]}>{t.verdict[c.verdict]}</Pill>
              </div>
              {c.result !== null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {f.n(c.result)} {c.result_label}
                </p>
              )}
              <p className="mt-1">✓ {c.highlight}</p>
              {c.issue && <p className="mt-1 text-red-600 dark:text-red-400">! {c.issue}</p>}
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title={t.wins}>
          <div className="space-y-2">
            {data.wins.map((w) => (
              <div key={w.title} className="rounded-xl bg-emerald-500/10 p-3 text-sm">
                <b>{w.title}</b>
                <p className="mt-0.5 text-muted-foreground">{w.detail}</p>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title={t.issues}>
          <div className="space-y-2">
            {data.issues.map((w) => (
              <div key={w.title} className="rounded-xl bg-red-500/10 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <b>{w.title}</b>
                  <Pill tone={w.impact === "tinggi" ? "bad" : w.impact === "sedang" ? "warn" : "muted"}>{t.impact(tr.ev(w.impact))}</Pill>
                </div>
                <p className="mt-0.5 text-muted-foreground">{w.detail}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title={t.insight}>
        <div className="space-y-2">
          {data.insights.map((i, k) => (
            <div key={k} className="grid gap-2 rounded-xl border bg-background p-3 text-sm md:grid-cols-3">
              <p className="font-medium">{i.insight}</p>
              <p className="text-muted-foreground">
                <span className="text-xs font-semibold uppercase">{tr.common.evidenceDot}</span>
                {i.evidence}
              </p>
              <p>
                <span className="text-xs font-semibold uppercase text-primary">{tr.common.soWhatDot}</span>
                {i.so_what}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t.nextMonth} hint={data.next_month.focus}>
        <DataTable
          headers={t.actionHeaders}
          rows={data.next_month.actions.map((a) => [a.action, a.owner, a.deadline, a.kpi])}
        />
        {data.next_month.budget && <p className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">💰 {data.next_month.budget}</p>}
      </SectionCard>

      {data.data_notes && <p className="text-xs text-muted-foreground">{tr.common.dataNotes(data.data_notes)}</p>}
    </div>
  );
}
