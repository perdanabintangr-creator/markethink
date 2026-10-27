"use client";

import { Megaphone, TrendingUp } from "lucide-react";
import { googleTrendsUrl, metaAdLibraryUrl } from "@/lib/addons/exports";
import { exportsText } from "@/lib/i18n/exports";
import type { CompetitorOutput } from "@/lib/addons/schemas";
import { Bullets, Pill, SectionCard, useResultsI18n } from "../common";

const COLORS = ["#2563eb", "#0ea5e9", "#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6"];

/** Peta posisi: harga (X) vs kekuatan brand (Y). */
function PositioningMap({ data, brand }: { data: CompetitorOutput; brand: string }) {
  const t = useResultsI18n().t.competitor;
  const W = 520;
  const H = 360;
  const pad = 40;
  const x = (v: number) => pad + ((Math.min(10, Math.max(1, v)) - 1) / 9) * (W - pad * 2);
  const y = (v: number) => H - pad - ((Math.min(10, Math.max(1, v)) - 1) / 9) * (H - pad * 2);
  const points = [
    ...data.competitors.map((c, i) => ({ name: c.name, px: c.price_score, py: c.quality_score, color: COLORS[i % COLORS.length], us: false })),
    { name: t.you(brand), px: data.our_position.price_score, py: data.our_position.quality_score, color: "#10b981", us: true },
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t.map}>
      <rect x={pad} y={pad} width={W - pad * 2} height={H - pad * 2} fill="none" className="stroke-border" />
      <line x1={W / 2} y1={pad} x2={W / 2} y2={H - pad} className="stroke-border" strokeDasharray="4 4" />
      <line x1={pad} y1={H / 2} x2={W - pad} y2={H / 2} className="stroke-border" strokeDasharray="4 4" />
      <text x={W / 2} y={H - 10} textAnchor="middle" className="fill-muted-foreground text-[11px]">
        {t.axisX}
      </text>
      <text x={14} y={H / 2} textAnchor="middle" transform={`rotate(-90 14 ${H / 2})`} className="fill-muted-foreground text-[11px]">
        {t.axisY}
      </text>
      <text x={pad + 6} y={pad + 14} className="fill-muted-foreground text-[10px]">{t.cheapStrong}</text>
      <text x={W - pad - 6} y={pad + 14} textAnchor="end" className="fill-muted-foreground text-[10px]">{t.premiumStrong}</text>
      {points.map((p) => (
        <g key={p.name}>
          <circle cx={x(p.px)} cy={y(p.py)} r={p.us ? 9 : 7} fill={p.color} stroke="white" strokeWidth={2} />
          <text x={x(p.px)} y={y(p.py) - 12} textAnchor="middle" className={`text-[11px] ${p.us ? "fill-emerald-600 font-bold" : "fill-foreground"}`}>
            {p.name}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function CompetitorResult({ data, brand }: { data: CompetitorOutput; brand: string }) {
  const { t: tr, lang } = useResultsI18n();
  const X = exportsText(lang);
  const t = tr.competitor;
  const c0 = tr.common;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">{data.summary}</div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <SectionCard title={t.map}>
          <PositioningMap data={data} brand={brand} />
          <p className="mt-2 text-xs text-muted-foreground">{data.our_position.note}</p>
        </SectionCard>
        <SectionCard title={t.swot}>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(
              [
                [c0.strengths, data.swot.strengths, "bg-emerald-500/10"],
                [c0.weaknesses, data.swot.weaknesses, "bg-red-500/10"],
                [c0.opportunities, data.swot.opportunities, "bg-sky-500/10"],
                [c0.threats, data.swot.threats, "bg-amber-500/10"],
              ] as const
            ).map(([label, items, bg]) => (
              <div key={label} className={`rounded-xl p-3 ${bg}`}>
                <p className="mb-1 text-xs font-semibold">{label}</p>
                <ul className="space-y-1 text-xs">
                  {items.map((i, k) => (
                    <li key={k}>• {i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title={t.compare}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2">{t.thBrand}</th>
                <th>{t.thPrice}</th>
                <th>{t.thPositioning}</th>
                <th>{t.thTarget}</th>
                <th>{t.thChannels}</th>
              </tr>
            </thead>
            <tbody className="divide-y align-top">
              {data.competitors.map((c, i) => (
                <tr key={c.name}>
                  <td className="py-2 pr-2 font-medium">
                    <span className="mr-1.5 inline-block size-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    {c.name}
                  </td>
                  <td className="pr-2">{c.price_range}</td>
                  <td className="pr-2">{c.positioning}</td>
                  <td className="pr-2 text-muted-foreground">{c.target}</td>
                  <td className="text-xs">{c.channels.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title={X.realData} hint={X.realDataHint}>
        <div className="flex flex-wrap gap-2">
          {data.competitors.map((c) => (
            <a
              key={c.name}
              href={metaAdLibraryUrl(c.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <Megaphone className="size-3.5 text-primary" /> {c.name}: {X.activeAds}
            </a>
          ))}
          <a
            href={googleTrendsUrl([brand, ...data.competitors.map((c) => c.name)])}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-sm hover:bg-accent"
          >
            <TrendingUp className="size-3.5 text-primary" /> {X.trends}
          </a>
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        {data.competitors.map((c) => (
          <SectionCard key={c.name} title={c.name} hint={c.price_range}>
            <p className="mb-3 text-xs text-muted-foreground">{t.contentStyle(c.content_style)}</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="mb-1 font-semibold text-emerald-600 dark:text-emerald-400">{c0.strengths}</p>
                <ul className="space-y-1">{c.strengths.map((s, k) => <li key={k}>• {s}</li>)}</ul>
              </div>
              <div>
                <p className="mb-1 font-semibold text-red-600 dark:text-red-400">{c0.weaknesses}</p>
                <ul className="space-y-1">{c.weaknesses.map((s, k) => <li key={k}>• {s}</li>)}</ul>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>

      <SectionCard title={t.gaps}>
        <div className="grid gap-2 sm:grid-cols-2">
          {data.content_gaps.map((g, i) => (
            <div key={i} className="rounded-xl border bg-background p-3 text-sm">
              <div className="flex items-center gap-2">
                <Pill tone="primary">{g.format}</Pill>
                <span className="font-medium">{g.gap}</span>
              </div>
              <p className="mt-1 text-muted-foreground">{g.idea}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t.strategy}>
        <ol className="space-y-2">
          {data.recommendations.map((r, i) => (
            <li key={i} className="flex gap-3 rounded-xl border bg-background p-3 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
              <span className="flex-1">
                <b>{r.title}</b>
                <span className="block text-muted-foreground">{r.detail}</span>
              </span>
              <Pill tone={r.priority === "tinggi" ? "good" : r.priority === "sedang" ? "warn" : "muted"}>{tr.ev(r.priority)}</Pill>
            </li>
          ))}
        </ol>
      </SectionCard>

      {!!data.sources?.length && (
        <SectionCard title={c0.researchSources}>
          <ul className="space-y-1 text-xs">
            {data.sources.map((s) => (
              <li key={s.url} className="truncate">
                <a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
      {!data.sources?.length && <Bullets items={[c0.noWebResearch]} className="text-xs text-muted-foreground" />}
    </div>
  );
}
