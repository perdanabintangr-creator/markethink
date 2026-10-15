"use client";

import { FUNNEL_LABEL, idr, type PlanOutput } from "@/lib/addons/pro/specs/plan";
import { cn } from "@/lib/utils";
import { Checklist, CopyButton, DataTable, KeyValues, Pill, Points, SectionCard, StatGrid, Timeline } from "./kit";

const STAGES = ["awareness", "consideration", "conversion", "retention"] as const;
const STAGE_TONE: Record<(typeof STAGES)[number], string> = {
  awareness: "border-sky-500/40 bg-sky-500/5",
  consideration: "border-violet-500/40 bg-violet-500/5",
  conversion: "border-emerald-500/40 bg-emerald-500/5",
  retention: "border-amber-500/40 bg-amber-500/5",
};
export const SPLIT_COLORS = ["#6366f1", "#0ea5e9", "#14b8a6", "#f59e0b", "#ec4899", "#8b5cf6", "#64748b"];

/** Bar komposisi 100% + rincian pos budget (dipakai plan, campaign, gtm). */
export function BudgetSplit({ items }: { items: { item: string; pct: number; amount: number | null; note: string }[] }) {
  return (
    <div>
      <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-muted">
        {items.map((b, i) => (
          <div key={i} style={{ width: `${b.pct}%`, background: SPLIT_COLORS[i % SPLIT_COLORS.length] }} title={`${b.item} ${b.pct}%`} />
        ))}
      </div>
      <div className="divide-y text-sm">
        {items.map((b, i) => (
          <div key={i} className="flex items-start gap-2 py-2">
            <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: SPLIT_COLORS[i % SPLIT_COLORS.length] }} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <b>{b.item}</b>
                <span className="tabular-nums">
                  <b>{b.pct}%</b>
                  {b.amount !== null && <span className="text-muted-foreground"> · {idr(b.amount)}</span>}
                </span>
              </div>
              {b.note && <p className="text-xs text-muted-foreground">{b.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const levelTone = (l: string) => (l === "tinggi" ? "bad" : l === "sedang" ? "warn" : "muted") as "bad" | "warn" | "muted";

export function PlanResult({ data }: { data: PlanOutput }) {
  const s = data.situation;
  const monthly = data.budget.monthly;
  const paid = data.channels.filter((c) => c.budget_pct > 0).length;
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Ringkasan eksekutif</p>
        <h2 className="mt-1 text-lg font-bold">{data.headline}</h2>
        <p className="mt-2 text-sm">{data.summary}</p>
        {!!data.assumptions.length && (
          <p className="mt-3 text-xs text-muted-foreground">
            <b>Asumsi:</b> {data.assumptions.join(" · ")}
          </p>
        )}
      </section>

      <StatGrid
        items={[
          { label: "Budget per bulan", value: idr(monthly), note: data.budget.basis === "rekomendasi" ? "Rekomendasi (belum diisi)" : "Sesuai isian", tone: "primary" },
          { label: "Tujuan SMART", value: String(data.objectives.length), note: `${data.objectives.filter((o) => o.level === "bisnis").length} tujuan bisnis` },
          { label: "Kanal", value: String(data.channels.length), note: `${paid} berbayar` },
          { label: "Periode roadmap", value: String(data.roadmap.length), note: data.roadmap.length ? `${data.roadmap[0].period} – ${data.roadmap[data.roadmap.length - 1].period}` : "" },
        ]}
      />

      <SectionCard title="Analisis situasi">
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { label: "Kekuatan", items: s.strengths, cls: "bg-emerald-500/10", head: "text-emerald-700 dark:text-emerald-300" },
            { label: "Kelemahan", items: s.weaknesses, cls: "bg-red-500/10", head: "text-red-700 dark:text-red-300" },
            { label: "Peluang", items: s.opportunities, cls: "bg-sky-500/10", head: "text-sky-700 dark:text-sky-300" },
            { label: "Ancaman", items: s.threats, cls: "bg-amber-500/10", head: "text-amber-700 dark:text-amber-300" },
          ].map((q) => (
            <div key={q.label} className={cn("rounded-xl p-3 print:break-inside-avoid", q.cls)}>
              <p className={cn("mb-1 text-xs font-semibold uppercase", q.head)}>{q.label}</p>
              <Points items={q.items} />
            </div>
          ))}
        </div>
        {!!s.insights.length && (
          <div className="mt-3 space-y-2">
            {s.insights.map((i, k) => (
              <div key={k} className="grid gap-1 rounded-xl border bg-background p-3 text-sm sm:grid-cols-2 sm:gap-3 print:break-inside-avoid">
                <p className="font-medium">{i.insight}</p>
                <p>
                  <span className="text-xs font-semibold uppercase text-primary">Artinya · </span>
                  {i.implication}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Tujuan SMART">
        <DataTable
          headers={["Tujuan", "Metrik", "Sekarang", "Target", "Deadline"]}
          minWidth={680}
          rows={data.objectives.map((o) => [
            <span key="o" className="flex flex-col gap-1">
              {o.objective}
              <span>
                <Pill tone={o.level === "bisnis" ? "primary" : "muted"}>{o.level}</Pill>
              </span>
            </span>,
            o.metric,
            <span key="b" className="text-muted-foreground">{o.baseline}</span>,
            <b key="t" className="text-primary">{o.target}</b>,
            o.deadline,
          ])}
        />
      </SectionCard>

      <SectionCard title="Target pasar & positioning">
        <KeyValues
          items={[
            { k: "Segmen utama", v: data.segment.primary },
            { k: "Kebutuhan utama", v: data.segment.need },
            ...(data.segment.secondary ? [{ k: "Segmen berikutnya", v: data.segment.secondary }] : []),
          ]}
        />
        <div className="mt-3 rounded-xl border-l-4 border-primary bg-muted/50 p-3 text-sm">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase text-primary">Positioning statement</p>
            <CopyButton text={data.segment.positioning} />
          </div>
          <p className="italic">{data.segment.positioning}</p>
        </div>
      </SectionCard>

      <SectionCard title="Pilar strategis" hint={`${data.pillars.length} taruhan utama`}>
        <div className="grid gap-2 sm:grid-cols-2">
          {data.pillars.map((p, i) => (
            <div key={i} className="rounded-xl border bg-background p-3 text-sm print:break-inside-avoid">
              <div className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                <b>{p.name}</b>
              </div>
              <p className="mt-1.5 font-medium text-primary">{p.goal}</p>
              <p className="mt-1 text-muted-foreground">{p.why}</p>
              <Points items={p.initiatives} className="mt-2" />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Channel plan" hint="Peran tiap kanal di funnel">
        <div className="mb-3 grid gap-2 sm:grid-cols-4">
          {STAGES.map((st) => {
            const list = data.channels.filter((c) => c.funnel === st);
            return (
              <div key={st} className={cn("rounded-xl border p-2.5 text-xs", STAGE_TONE[st])}>
                <p className="font-semibold uppercase tracking-wide">{FUNNEL_LABEL[st]}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {list.length ? list.map((c) => <Pill key={c.channel}>{c.channel}</Pill>) : <span className="text-muted-foreground">—</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="divide-y rounded-xl border">
          {data.channels.map((c, i) => (
            <details key={i} className="group p-3 print:break-inside-avoid" open={i === 0}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 text-sm">
                <b className="min-w-0 flex-1">{c.channel}</b>
                <Pill tone="primary">{FUNNEL_LABEL[c.funnel]}</Pill>
                <Pill>{c.budget_pct > 0 ? `${c.budget_pct}% budget` : "organik"}</Pill>
                <span className="text-xs text-muted-foreground">
                  {c.kpi}: <b className="text-foreground">{c.target}</b>
                </span>
              </summary>
              <div className="mt-2 space-y-2 text-sm">
                <p className="text-muted-foreground">{c.role}</p>
                <Points items={c.tactics} />
              </div>
            </details>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Roadmap">
        <Timeline
          items={data.roadmap.map((r) => ({
            title: r.theme,
            when: r.period,
            body: (
              <div className="space-y-1.5">
                <Points items={r.activities} />
                <p className="text-xs">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">Milestone · </span>
                  {r.milestone}
                </p>
              </div>
            ),
          }))}
        />
      </SectionCard>

      <SectionCard title="Alokasi budget" hint={monthly !== null ? `${idr(monthly)}/bulan${data.budget.basis === "rekomendasi" ? " · rekomendasi" : ""}` : undefined}>
        <BudgetSplit items={data.budget.items} />
        {data.budget.note && <p className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">{data.budget.note}</p>}
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Rencana pengukuran">
          <div className="space-y-2">
            {data.measurement.map((m, i) => (
              <div key={i} className="rounded-lg border bg-background px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <b>{m.kpi}</b>
                  <Pill tone="primary">{m.frequency}</Pill>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {m.tool} · PIC {m.owner}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Quick wins 30 hari">
          <Checklist items={data.quick_wins.map((q) => ({ task: `${q.action} → ${q.impact}`, owner: q.owner, when: q.due }))} />
        </SectionCard>
      </div>

      <SectionCard title="Risiko & mitigasi">
        <div className="space-y-2">
          {data.risks.map((r, i) => (
            <div key={i} className="grid gap-2 rounded-xl border bg-background p-3 text-sm sm:grid-cols-[1fr_1fr] print:break-inside-avoid">
              <div>
                <p className="font-medium">{r.risk}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Pill tone={levelTone(r.likelihood)}>peluang {r.likelihood}</Pill>
                  <Pill tone={levelTone(r.impact)}>dampak {r.impact}</Pill>
                </div>
              </div>
              <p className="text-muted-foreground">
                <span className="text-xs font-semibold uppercase text-primary">Mitigasi · </span>
                {r.mitigation}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
