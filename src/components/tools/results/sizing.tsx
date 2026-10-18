"use client";

import type { SizingOutput } from "@/lib/addons/schemas";
import { Pill, SectionCard, useResultsI18n } from "../common";
import { BarList, Recommendations, Sources, Summary, toneOf } from "./research-common";

/** Lingkaran bertingkat TAM ⊃ SAM ⊃ SOM (luas sebanding nilai, dengan batas minimum agar terbaca). */
function MarketCircles({ data }: { data: SizingOutput }) {
  const tam = Math.max(1, data.tam.value_idr);
  const r = (v: number) => Math.max(18, 120 * Math.sqrt(Math.max(0, v) / tam));
  const levels = [
    { key: "TAM", v: data.tam.value_idr, cls: "fill-primary/15" },
    { key: "SAM", v: data.sam.value_idr, cls: "fill-primary/35" },
    { key: "SOM", v: data.som.value_idr, cls: "fill-primary" },
  ];
  return (
    <svg viewBox="0 0 260 260" className="mx-auto w-full max-w-[260px]" role="img" aria-label="TAM SAM SOM">
      {levels.map((l, i) => {
        const rad = Math.min(r(l.v), i === 0 ? 120 : r(levels[i - 1].v) - 6);
        return <circle key={l.key} cx={130} cy={250 - rad - 4} r={rad} className={l.cls} />;
      })}
      <text x={130} y={36} textAnchor="middle" className="fill-foreground text-[12px] font-semibold">TAM</text>
    </svg>
  );
}

function Projection({ data }: { data: SizingOutput }) {
  const { t: tr, f } = useResultsI18n();
  const t = tr.sizing;
  const shortRp = f.shortRp;
  const rows = data.projection.slice(0, 6);
  if (rows.length < 2) return null;
  const W = 520;
  const H = 220;
  const pad = 36;
  const max = Math.max(1, ...rows.flatMap((p) => [p.conservative, p.base, p.optimistic]));
  const x = (i: number) => pad + (i / (rows.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - (Math.max(0, v) / max) * (H - pad * 2);
  const series = [
    { key: "optimistic" as const, name: t.optimistic, color: "#10b981" },
    { key: "base" as const, name: t.base, color: "#2563eb" },
    { key: "conservative" as const, name: t.conservative, color: "#f59e0b" },
  ];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t.projAria}>
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} className="stroke-border" />
        {rows.map((p, i) => (
          <text key={p.year} x={x(i)} y={H - pad + 16} textAnchor="middle" className="fill-muted-foreground text-[11px]">
            {p.year}
          </text>
        ))}
        {series.map((s) => (
          <g key={s.key}>
            <polyline fill="none" stroke={s.color} strokeWidth={2.5} points={rows.map((p, i) => `${x(i)},${y(p[s.key])}`).join(" ")} />
            {rows.map((p, i) => (
              <circle key={i} cx={x(i)} cy={y(p[s.key])} r={3} fill={s.color} />
            ))}
          </g>
        ))}
        <text x={x(rows.length - 1)} y={y(rows.at(-1)!.optimistic) - 8} textAnchor="end" className="fill-foreground text-[11px] font-medium">
          {shortRp(rows.at(-1)!.optimistic)}
        </text>
        <text x={x(0)} y={y(rows[0].base) - 8} className="fill-foreground text-[11px]">
          {shortRp(rows[0].base)}
        </text>
      </svg>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-full" style={{ background: s.color }} /> {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

const PESTEL_KEYS = ["politik", "ekonomi", "sosial", "teknologi", "lingkungan", "hukum"];

export function SizingResult({ data }: { data: SizingOutput }) {
  const { t: tr, f } = useResultsI18n();
  const t = tr.sizing;
  const shortRp = f.shortRp;
  const levels = [
    { key: "TAM", name: t.tam, d: data.tam, cls: "bg-primary/10" },
    { key: "SAM", name: t.sam, d: data.sam, cls: "bg-primary/20" },
    { key: "SOM", name: t.som, d: data.som, cls: "bg-primary text-primary-foreground" },
  ];
  return (
    <div className="space-y-4">
      <Summary text={data.summary}>
        <div className="mt-2 flex flex-wrap gap-2">
          <Pill tone="primary">{t.growth(f.n(data.cagr_pct, { maximumFractionDigits: 1 }))}</Pill>
          <Pill tone="muted">{t.phase(tr.ev(data.lifecycle))}</Pill>
          <Pill tone={toneOf(data.confidence)}>{t.confidence(tr.ev(data.confidence))}</Pill>
        </div>
      </Summary>

      <SectionCard title={t.sizeTitle} hint={data.market_definition}>
        <div className="grid items-center gap-4 md:grid-cols-[260px_1fr]">
          <MarketCircles data={data} />
          <div className="space-y-2">
            {levels.map((l) => (
              <div key={l.key} className={`rounded-xl p-3 ${l.cls}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                    {l.key} · {l.name}
                  </span>
                  <span className="text-xl font-bold">{shortRp(l.d.value_idr)}</span>
                </div>
                <p className="text-xs opacity-80">{l.d.buyers}. {l.d.definition}</p>
                <p className="mt-1 font-mono text-[11px] opacity-80">{l.d.formula}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <SectionCard title={t.projTitle} hint={t.scenariosHint}>
          <Projection data={data} />
          <p className="mt-2 text-xs text-muted-foreground">{data.lifecycle_note}</p>
        </SectionCard>
        <SectionCard title={t.channelShare}>
          <BarList items={data.channels.map((c) => ({ label: c.channel, value: c.share_pct }))} max={100} unit="%" />
        </SectionCard>
      </div>

      <SectionCard title={t.bottomUp} hint={t.bottomUpHint}>
        <ol className="space-y-1.5 text-sm">
          {data.bottom_up.map((b, i) => (
            <li key={i} className="grid gap-1 rounded-lg border bg-background px-3 py-2 sm:grid-cols-[1fr_auto]">
              <span>
                <span className="mr-2 text-xs text-muted-foreground">{i + 1}.</span>
                {b.step}
                <span className="block text-xs text-muted-foreground">{b.source}</span>
              </span>
              <b className="tabular-nums sm:text-right">{b.value}</b>
            </li>
          ))}
        </ol>
      </SectionCard>

      <SectionCard title={t.trends}>
        <div className="grid gap-2 sm:grid-cols-2">
          {data.trends.map((x, i) => (
            <div key={i} className="rounded-xl border bg-background p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <b>{x.title}</b>
                <Pill tone={toneOf(x.impact)}>{tr.ev(x.impact)}</Pill>
              </div>
              <p className="mt-1 text-muted-foreground">{x.detail}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t.pestelTitle}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PESTEL_KEYS.map((k) => {
            const items = data.pestel.filter((p) => p.factor === k);
            if (!items.length) return null;
            return (
              <div key={k} className="rounded-xl border bg-background p-3 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">{t.pestel[k]}</p>
                <ul className="space-y-1.5">
                  {items.map((p, k) => (
                    <li key={k} className="flex items-start gap-2">
                      <Pill tone={toneOf(p.impact)}>{p.impact === "positif" ? "+" : p.impact === "negatif" ? "−" : "•"}</Pill>
                      <span>{p.point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title={t.drivers}>
          <ul className="space-y-1.5 text-sm">{data.drivers.map((d, i) => <li key={i}>• {d}</li>)}</ul>
        </SectionCard>
        <SectionCard title={t.barriers}>
          <ul className="space-y-1.5 text-sm">{data.barriers.map((d, i) => <li key={i}>• {d}</li>)}</ul>
        </SectionCard>
      </div>

      <Recommendations items={data.recommendations} />

      {!!data.data_gaps.length && (
        <SectionCard title={t.gaps}>
          <ul className="space-y-1.5 text-sm text-muted-foreground">{data.data_gaps.map((d, i) => <li key={i}>• {d}</li>)}</ul>
        </SectionCard>
      )}
      <Sources sources={data.sources} />
    </div>
  );
}
