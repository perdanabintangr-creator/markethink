"use client";

import type { PersonaOutput } from "@/lib/addons/schemas";
import { Pill, SectionCard, useResultsI18n } from "../common";
import { BarList, Recommendations, Sources, Summary } from "./research-common";
import { PersonaLab, type LabTest } from "./persona-lab";

const COLORS = ["#2563eb", "#ec4899", "#0ea5e9", "#f59e0b", "#14b8a6"];

/** Matriks segmen: daya tarik (Y) vs kemudahan dimenangkan (X), ukuran gelembung = porsi pasar. */
function SegmentMatrix({ data }: { data: PersonaOutput }) {
  const t = useResultsI18n().t.persona;
  const W = 480;
  const H = 320;
  const pad = 40;
  const x = (v: number) => pad + ((Math.min(10, Math.max(1, v)) - 1) / 9) * (W - pad * 2);
  const y = (v: number) => H - pad - ((Math.min(10, Math.max(1, v)) - 1) / 9) * (H - pad * 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t.matrix}>
      <rect x={W / 2} y={pad} width={W / 2 - pad} height={H / 2 - pad} className="fill-emerald-500/10" />
      <rect x={pad} y={pad} width={W - pad * 2} height={H - pad * 2} fill="none" className="stroke-border" />
      <line x1={W / 2} y1={pad} x2={W / 2} y2={H - pad} className="stroke-border" strokeDasharray="4 4" />
      <line x1={pad} y1={H / 2} x2={W - pad} y2={H / 2} className="stroke-border" strokeDasharray="4 4" />
      <text x={W - pad - 6} y={pad + 14} textAnchor="end" className="fill-emerald-600 text-[10px] font-semibold">{t.goFirst}</text>
      <text x={W / 2} y={H - 10} textAnchor="middle" className="fill-muted-foreground text-[11px]">{t.easeAxis}</text>
      <text x={14} y={H / 2} textAnchor="middle" transform={`rotate(-90 14 ${H / 2})`} className="fill-muted-foreground text-[11px]">
        {t.attractAxis}
      </text>
      {data.segments.map((s, i) => (
        <g key={s.name}>
          <circle cx={x(s.ease)} cy={y(s.attractiveness)} r={8 + Math.sqrt(Math.max(0, s.share_pct)) * 2.2} fill={COLORS[i % COLORS.length]} fillOpacity={0.75} stroke="white" strokeWidth={2} />
          <text x={x(s.ease)} y={y(s.attractiveness) + 4} textAnchor="middle" className="fill-white text-[10px] font-bold">
            {Math.round(s.share_pct)}%
          </text>
          <text x={x(s.ease)} y={y(s.attractiveness) - 14 - Math.sqrt(Math.max(0, s.share_pct)) * 2.2} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
            {s.name}
          </text>
        </g>
      ))}
    </svg>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (!items.length) return null;
  return (
    <div>
      <p className={`mb-1 text-xs font-semibold ${tone}`}>{title}</p>
      <ul className="space-y-1 text-xs">
        {items.map((x, k) => (
          <li key={k}>• {x}</li>
        ))}
      </ul>
    </div>
  );
}

export function PersonaResult({ data, runId }: { data: PersonaOutput & { lab_tests?: LabTest[] }; runId?: string }) {
  const t = useResultsI18n().t.persona;
  return (
    <div className="space-y-4">
      <Summary text={data.summary} />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <SectionCard title={t.segMap} hint={t.bubbleHint}>
          <SegmentMatrix data={data} />
          <p className="mt-2 rounded-lg bg-emerald-500/10 p-2 text-xs">🎯 {data.priority_segment}</p>
        </SectionCard>
        <SectionCard title={t.segments}>
          <div className="space-y-2">
            {data.segments.map((s, i) => (
              <div key={s.name} className="rounded-xl border bg-background p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <b className="flex items-center gap-1.5">
                    <span className="inline-block size-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    {s.name}
                  </b>
                  <Pill tone="primary">{Math.round(s.share_pct)}%</Pill>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.personas.map((p, i) => (
          <section key={i} className="overflow-hidden rounded-2xl border bg-card print:break-inside-avoid">
            <div className="flex items-center gap-3 p-4 text-white" style={{ background: COLORS[i % COLORS.length] }}>
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/25 text-lg font-bold">{p.name.trim().charAt(0)}</span>
              <div className="min-w-0">
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs opacity-90">
                  {p.age} · {p.occupation} · {p.location}
                </p>
                <p className="text-xs opacity-90">{p.income}</p>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <p className="text-sm italic text-muted-foreground">“{p.quote}”</p>
              <div className="grid grid-cols-2 gap-3">
                <List title={t.goals} items={p.goals} tone="text-emerald-600 dark:text-emerald-400" />
                <List title={t.pains} items={p.pains} tone="text-red-600 dark:text-red-400" />
                <List title={t.triggers} items={p.triggers} tone="text-sky-600 dark:text-sky-400" />
                <List title={t.objections} items={p.objections} tone="text-amber-600 dark:text-amber-400" />
              </div>
              <List title={t.jtbd} items={p.jobs} tone="text-primary" />
              <div className="flex flex-wrap gap-1">
                {p.channels.map((c) => (
                  <Pill key={c}>{c}</Pill>
                ))}
              </div>
              <p className="rounded-lg bg-primary/10 p-2 text-xs">
                <b>{t.message}</b> {p.message}
              </p>
            </div>
          </section>
        ))}
      </div>

      {runId && data.personas.length > 0 && <PersonaLab runId={runId} data={data} />}

      <SectionCard title={t.journey}>
        <div className="overflow-x-auto">
          <div className="grid min-w-[760px] gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, data.journey.length)}, minmax(0, 1fr))` }}>
            {data.journey.map((j, i) => (
              <div key={i} className="space-y-2 rounded-xl border bg-background p-3 text-xs">
                <p className="rounded-md bg-primary px-2 py-1 text-center text-[11px] font-semibold uppercase text-primary-foreground">{j.stage}</p>
                <p><b>{t.doing}</b> {j.doing}</p>
                <p className="italic text-muted-foreground">“{j.thinking}”</p>
                <div className="flex flex-wrap gap-1">{j.touchpoints.map((x) => <Pill key={x}>{x}</Pill>)}</div>
                <p className="text-red-600 dark:text-red-400">⚠ {j.pain}</p>
                <p className="text-emerald-700 dark:text-emerald-300">💡 {j.opportunity}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <SectionCard title={t.drivers} hint={t.weightHint}>
          <BarList items={[...data.drivers].sort((a, b) => b.importance - a.importance).map((d) => ({ label: d.factor, value: d.importance }))} max={10} />
        </SectionCard>
        <SectionCard title={t.insight}>
          <div className="space-y-2">
            {data.insights.map((ins, i) => (
              <div key={i} className="rounded-xl border bg-background p-3 text-sm">
                <p className="font-medium">💡 {ins.insight}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.evidence(ins.evidence)}</p>
                <p className="mt-1 text-xs">→ {ins.implication}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <Recommendations items={data.recommendations} />
      <Sources sources={data.sources} />
    </div>
  );
}
