"use client";

import { GTM_PHASE_LABEL, TEAM_LABEL, weekLabel, type GtmOutput } from "@/lib/addons/pro/specs/gtm";
import { cn } from "@/lib/utils";
import { BudgetSplit } from "./plan";
import { Checklist, CopyButton, DataTable, Pill, Points, SectionCard, StatGrid, useResultsI18n } from "./kit";

const PHASE_STYLE = {
  pre: "border-sky-500/40 bg-sky-500/5",
  launch: "border-primary/50 bg-primary/5",
  post: "border-emerald-500/40 bg-emerald-500/5",
} as const;
const TEAMS = ["marketing", "sales", "operasional", "cs"] as const;
const PRIORITY_TONE = { utama: "primary", kedua: "warn", nanti: "muted" } as const;

function CanvasBox({ title, items, tone }: { title: string; items: string[]; tone: "customer" | "value" }) {
  return (
    <div className={cn("rounded-xl p-3 text-sm", tone === "customer" ? "bg-sky-500/10" : "bg-emerald-500/10")}>
      <p className={cn("mb-1 text-xs font-semibold uppercase", tone === "customer" ? "text-sky-700 dark:text-sky-300" : "text-emerald-700 dark:text-emerald-300")}>{title}</p>
      <Points items={items} />
    </div>
  );
}

export function GtmResult({ data }: { data: GtmOutput }) {
  const { t: tr, f } = useResultsI18n();
  const t = tr.gtm;
  const c0 = tr.common;
  const idr = f.idr;
  const wk = t.weekLabel ?? weekLabel;
  const c = data.canvas;
  const p = data.pricing;
  const weeks = [...new Set(data.timeline.map((x) => x.week))].sort((a, b) => a - b);
  const mainKpi = data.kpis[0];
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t.plan}</p>
        <h2 className="mt-1 text-lg font-bold">{data.headline}</h2>
        <p className="mt-2 text-sm">{data.summary}</p>
        {!!data.assumptions.length && (
          <p className="mt-3 text-xs text-muted-foreground">
            <b>{c0.assumptions}</b> {data.assumptions.join(" · ")}
          </p>
        )}
      </section>

      <StatGrid
        items={[
          { label: t.regularPrice, value: idr(p.recommended), note: p.tiers.length ? t.nTiers(p.tiers.length) : undefined, tone: "primary" },
          { label: t.launchBudget, value: idr(data.budget.total), note: data.budget.basis === "rekomendasi" ? c0.recommended : c0.asProvided },
          ...(mainKpi ? [{ label: mainKpi.metric, value: mainKpi.target, note: mainKpi.when }] : []),
          { label: t.weekly, value: String(data.timeline.length), note: weeks.length ? t.range(wk(weeks[0]), wk(weeks[weeks.length - 1])) : undefined },
        ]}
      />

      <SectionCard title={t.canvas}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t.buyer}</p>
            <CanvasBox title={t.jobs} items={c.jobs} tone="customer" />
            <CanvasBox title={t.pains} items={c.pains} tone="customer" />
            <CanvasBox title={t.gains} items={c.gains} tone="customer" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t.answer}</p>
            <CanvasBox title={t.products} items={c.products} tone="value" />
            <CanvasBox title={t.relievers} items={c.relievers} tone="value" />
            <CanvasBox title={t.creators} items={c.creators} tone="value" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t.icp}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.icp.map((s, i) => (
            <div key={i} className={cn("rounded-xl border bg-background p-3 text-sm print:break-inside-avoid", s.priority === "utama" && "border-primary ring-1 ring-primary/30")}>
              <div className="flex items-start justify-between gap-2">
                <b>{s.name}</b>
                <Pill tone={PRIORITY_TONE[s.priority]}>{tr.ev(s.priority)}</Pill>
              </div>
              <p className="mt-1 text-muted-foreground">{s.profile}</p>
              <p className="mt-2 text-xs">
                <b>{t.trigger}</b> {s.trigger}
              </p>
              <p className="mt-0.5 text-xs">
                <b>{t.where}</b> {s.where}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">{s.why}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t.positioning}>
        <div className="rounded-xl border-l-4 border-primary bg-muted/50 p-3 text-sm">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase text-primary">{t.statement}</p>
            <CopyButton text={data.positioning.statement} />
          </div>
          <p className="italic">{data.positioning.statement}</p>
        </div>
        <p className="mt-3 text-sm">
          <span className="text-xs font-semibold uppercase text-muted-foreground">{t.whyUs}</span>
          {data.positioning.versus}
        </p>
      </SectionCard>

      <SectionCard title={t.pricing} hint={p.recommended !== null ? t.regularPriceOf(idr(p.recommended)) : undefined}>
        <div className="grid gap-2 sm:grid-cols-3">
          {p.tiers.map((x, i) => (
            <div key={i} className={cn("rounded-xl border bg-background p-3 text-sm print:break-inside-avoid", /best/i.test(x.role) && "border-primary ring-1 ring-primary/30")}>
              <div className="flex items-start justify-between gap-2">
                <b>{x.name}</b>
                <Pill tone={/best/i.test(x.role) ? "primary" : "muted"}>{x.role}</Pill>
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums">{idr(x.price)}</p>
              <p className="text-xs text-muted-foreground">{x.contents}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl bg-amber-500/10 p-3 text-sm">
          <p className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-300">{t.intro}</p>
          <p className="mt-0.5 font-medium">{p.intro_offer}</p>
        </div>
        <div className="mt-3 space-y-1.5 text-sm">
          <p>
            <span className="text-xs font-semibold uppercase text-muted-foreground">{t.anchor}</span>
            {p.anchor}
          </p>
          <p>
            <span className="text-xs font-semibold uppercase text-muted-foreground">{t.rationale}</span>
            {p.rationale}
          </p>
          {p.margin_note && (
            <p>
              <span className="text-xs font-semibold uppercase text-muted-foreground">{t.margin}</span>
              {p.margin_note}
            </p>
          )}
        </div>
      </SectionCard>

      <SectionCard title={t.channels}>
        <div className="grid gap-2 sm:grid-cols-2">
          {data.channels.map((x, i) => (
            <div key={i} className="rounded-xl border bg-background p-3 text-sm print:break-inside-avoid">
              <div className="flex items-start justify-between gap-2">
                <b>{x.channel}</b>
                <Pill>{x.phase === "semua" ? t.allPhases : GTM_PHASE_LABEL[x.phase]}</Pill>
              </div>
              <p className="mt-1 text-muted-foreground">{x.role}</p>
              <Points items={x.tactics} className="mt-2" />
              <p className="mt-2 text-xs">
                <b>{t.kpi}</b> {x.kpi}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t.phases}>
        <div className="grid gap-2 md:grid-cols-3">
          {data.phases.map((x, i) => (
            <div key={i} className={cn("rounded-xl border p-3 text-sm print:break-inside-avoid", PHASE_STYLE[x.phase])}>
              <div className="flex flex-wrap items-center justify-between gap-1">
                <b>{GTM_PHASE_LABEL[x.phase]}</b>
                <Pill>{x.duration}</Pill>
              </div>
              <p className="mt-1 font-medium">{x.goal}</p>
              <Points items={x.activities} className="mt-2" />
              <div className="mt-2 flex flex-wrap gap-1">{x.kpis.map((k, n) => <Pill key={n} tone="primary">{k}</Pill>)}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t.timeline} hint={t.timelineHint}>
        <div className="space-y-1.5">
          {weeks.map((w) => (
            <div key={w} className={cn("grid gap-2 rounded-lg border p-2.5 text-sm sm:grid-cols-[130px_1fr]", w === 0 ? "border-primary bg-primary/5" : "bg-background")}>
              <span className={cn("text-xs font-semibold", w === 0 ? "text-primary" : w < 0 ? "text-sky-700 dark:text-sky-300" : "text-emerald-700 dark:text-emerald-300")}>{wk(w)}</span>
              <ul className="space-y-1">
                {data.timeline
                  .filter((x) => x.week === w)
                  .map((x, i) => (
                    <li key={i} className="flex flex-wrap justify-between gap-x-2">
                      <span>{x.activity}</span>
                      <span className="text-xs text-muted-foreground">{x.owner}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t.teamChecklist}>
        <div className="grid gap-3 sm:grid-cols-2">
          {TEAMS.map((team) => {
            const items = data.checklist.filter((x) => x.team === team);
            if (!items.length) return null;
            return (
              <div key={team} className="rounded-xl border bg-background p-3 print:break-inside-avoid">
                <p className="mb-2 text-sm font-semibold">{tr.labels.team[team] ?? TEAM_LABEL[team]}</p>
                <Checklist items={items.map((x) => ({ task: x.task, when: x.due }))} />
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title={t.runbook}>
        <DataTable
          headers={t.runbookHeaders}
          minWidth={640}
          rows={data.runbook.map((x) => [
            <span key="t" className="font-mono tabular-nums">{x.time}</span>,
            x.activity,
            <span key="o" className="whitespace-nowrap text-xs">{x.owner}</span>,
            <span key="n" className="text-xs text-muted-foreground">{x.note}</span>,
          ])}
        />
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title={t.kpis}>
          <div className="space-y-2">
            {data.kpis.map((k, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
                <span>
                  {k.metric}
                  <span className="block text-xs text-muted-foreground">{k.when}</span>
                </span>
                <b className="text-right text-primary">{k.target}</b>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title={t.budget} hint={data.budget.total !== null ? `${idr(data.budget.total)}${data.budget.basis === "rekomendasi" ? c0.recommendedSuffix : ""}` : undefined}>
          <BudgetSplit items={data.budget.items} />
        </SectionCard>
      </div>

      <SectionCard title={c0.risksMitigation}>
        <div className="space-y-2">
          {data.risks.map((r, i) => (
            <div key={i} className="grid gap-2 rounded-xl border bg-background p-3 text-sm sm:grid-cols-2 print:break-inside-avoid">
              <div>
                <p className="font-medium">{r.risk}</p>
                <Pill tone={r.likelihood === "tinggi" ? "bad" : r.likelihood === "sedang" ? "warn" : "muted"}>{t.likelihood(tr.ev(r.likelihood))}</Pill>
              </div>
              <p className="text-muted-foreground">
                <span className="text-xs font-semibold uppercase text-primary">{c0.mitigationDot}</span>
                {r.mitigation}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
