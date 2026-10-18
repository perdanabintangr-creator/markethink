"use client";

import { useMemo } from "react";
import { CHECK_PHASES, MARGIN_LABEL, SCALE_LABEL, platformFeeRp, type PromoOutput } from "@/lib/addons/pro/specs/promo";
import { cn } from "@/lib/utils";
import { Checklist, DataTable, KeyValues, Pill, Points, SectionCard, StatGrid, Summary, useResultsI18n } from "./kit";

type Campaign = PromoOutput["campaigns"][number];

const SCALE_STYLE: Record<Campaign["scale"], { bar: string; dot: string; tone: "bad" | "warn" | "primary" }> = {
  besar: { bar: "bg-rose-500 text-white", dot: "bg-rose-500", tone: "bad" },
  sedang: { bar: "bg-amber-400 text-amber-950", dot: "bg-amber-400", tone: "warn" },
  rutin: { bar: "bg-sky-500 text-white", dot: "bg-sky-500", tone: "primary" },
};
const STATUS_TONE = { aman: "good", tipis: "warn", rugi: "bad" } as const;

const dm = (s: string, months: string[]) => `${Number(s.slice(8, 10))} ${months[Number(s.slice(5, 7)) - 1]?.slice(0, 3) ?? ""}`;
const range = (c: Campaign, months: string[]) => (c.start === c.end ? dm(c.start, months) : `${dm(c.start, months)} – ${dm(c.end, months)}`);

export function PromoResult({ data }: { data: PromoOutput }) {
  const { t: tr, f } = useResultsI18n();
  const t = tr.promo;
  const { num, rp, shortRp } = f;
  const scaleLabel = (s: Campaign["scale"]) => tr.labels.promoScale[s] ?? SCALE_LABEL[s];
  const totalRev = data.campaigns.reduce((s, c) => s + (c.target_revenue ?? 0), 0);
  const totalUnits = data.campaigns.reduce((s, c) => s + (c.target_units ?? 0), 0);
  const bad = data.margins.filter((m) => m.status === "rugi").length;
  const thin = data.margins.filter((m) => m.status === "tipis").length;
  const big = data.campaigns.filter((c) => c.scale === "besar").length;

  return (
    <div className="space-y-4">
      <Summary text={data.summary} />

      <StatGrid
        items={[
          { label: t.revenueTarget, value: shortRp(totalRev), tone: "primary", note: t.revenueNote },
          { label: t.unitTarget, value: num(totalUnits) },
          { label: t.campaigns, value: String(data.campaigns.length), note: t.nBig(big) },
          {
            label: t.badMargins,
            value: String(bad + thin),
            tone: bad ? "bad" : thin ? "warn" : "good",
            note: bad ? t.lossThin(bad, thin) : thin ? t.thin(thin) : t.allSafe,
          },
        ]}
      />

      <SectionCard title={t.strategy}>
        <KeyValues
          items={[
            { k: t.focus, v: data.strategy.focus },
            { k: t.guard, v: data.strategy.margin_guard },
            { k: t.traffic, v: data.strategy.traffic },
          ]}
        />
      </SectionCard>

      <SectionCard
        title={t.calendar}
        hint={
          <span className="flex flex-wrap gap-3">
            {(Object.keys(SCALE_LABEL) as Campaign["scale"][]).map((s) => (
              <span key={s} className="flex items-center gap-1">
                <span className={cn("size-2.5 rounded-full", SCALE_STYLE[s].dot)} /> {scaleLabel(s)}
              </span>
            ))}
          </span>
        }
      >
        <MonthGrids campaigns={data.campaigns} dow={t.dow} months={t.months} empty={t.noCampaign} />
      </SectionCard>

      <SectionCard title={t.detail} hint={t.detailHint}>
        <div className="divide-y rounded-xl border">
          {data.campaigns.map((c, i) => (
            <details key={i} className="group p-3 print:break-inside-avoid" open={i === 0}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                <span className={cn("size-2.5 shrink-0 rounded-full", SCALE_STYLE[c.scale].dot)} />
                <b className="tabular-nums">{range(c, t.months)}</b>
                <span className="font-medium">{c.event}</span>
                <Pill tone={SCALE_STYLE[c.scale].tone}>{scaleLabel(c.scale)}</Pill>
                <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                  {c.target_revenue ? <b className="text-foreground">{shortRp(c.target_revenue)}</b> : null}
                  {c.target_units ? t.units(num(c.target_units)) : ""}
                </span>
              </summary>
              <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                <div className="space-y-2">
                  <p>
                    <span className="text-xs font-semibold uppercase text-muted-foreground">{t.mechanism}</span>
                    {c.mechanism}
                  </p>
                  {!!c.hero_products.length && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-xs font-semibold uppercase text-muted-foreground">{t.hero}</span>
                      {c.hero_products.map((h) => (
                        <Pill key={h}>{h}</Pill>
                      ))}
                    </div>
                  )}
                  {!!c.vouchers.length && (
                    <div className="flex flex-wrap gap-2">
                      {c.vouchers.map((v, k) => (
                        <div key={k} className="flex overflow-hidden rounded-lg border border-dashed border-rose-400/60 text-xs">
                          <span className="bg-rose-500/10 px-2 py-1.5 font-semibold text-rose-700 dark:text-rose-300">{v.discount}</span>
                          <span className="px-2 py-1.5">
                            <b>{v.name}</b>
                            <span className="block text-muted-foreground">
                              {v.min_spend ? t.minSpend(shortRp(v.min_spend)) : t.noMin}
                              {v.quota ? t.quota(num(v.quota)) : ""}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="rounded-lg bg-muted/60 p-2">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">{t.support}</span>
                    {c.support}
                  </p>
                  <p className="rounded-lg bg-amber-500/10 p-2">
                    <span className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-300">{t.prep}</span>
                    {c.prep}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.platforms(c.platforms)}</p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </SectionCard>

      {!!data.margins.length && (
        <SectionCard title={t.margins} hint={t.marginsHint}>
          <DataTable
            headers={t.marginHeaders}
            minWidth={820}
            highlight={(i) => (data.margins[i]?.status === "rugi" ? "bg-red-500/10" : data.margins[i]?.status === "tipis" ? "bg-amber-500/10" : undefined)}
            rows={data.margins.map((m) => [
              <span key="p">
                {m.product}
                <span className="block text-xs font-normal text-muted-foreground">{m.scenario}</span>
              </span>,
              <span key="h" className="tabular-nums">
                <span className="text-xs text-muted-foreground line-through">{rp(m.price)}</span>
                <span className="block">
                  {rp(m.promo_price)} <span className="text-xs text-rose-600 dark:text-rose-400">−{num(m.discount_pct, 1)}%</span>
                </span>
              </span>,
              <span key="c" className="tabular-nums">{rp(m.cogs)}</span>,
              <span key="f" className="tabular-nums">
                {rp(platformFeeRp(m))}
                <span className="block text-xs text-muted-foreground">{num(m.platform_fee_pct, 1)}%</span>
              </span>,
              <span key="o" className="tabular-nums">{m.other_cost ? rp(m.other_cost) : "-"}</span>,
              <span key="m" className="tabular-nums">
                <b className={cn(m.margin_rp < 0 && "text-red-600 dark:text-red-400")}>{rp(m.margin_rp)}</b>
                <span className="mt-1 flex items-center gap-1.5">
                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                    <span
                      className={cn("block h-full", m.status === "aman" ? "bg-emerald-500" : m.status === "tipis" ? "bg-amber-500" : "bg-red-500")}
                      style={{ width: `${Math.max(4, Math.min(100, m.margin_pct * 2))}%` }}
                    />
                  </span>
                  <span className="text-xs">{num(m.margin_pct, 1)}%</span>
                </span>
              </span>,
              <span key="s" className="space-y-1">
                <Pill tone={STATUS_TONE[m.status]}>{tr.labels.marginStatus[m.status] ?? MARGIN_LABEL[m.status]}</Pill>
                <span className="block text-xs font-normal text-muted-foreground">{m.note}</span>
              </span>,
            ])}
          />
          <p className="mt-2 text-xs text-muted-foreground">{t.marginNote}</p>
        </SectionCard>
      )}

      {!!data.stock.length && (
        <SectionCard title={t.stock}>
          <DataTable
            headers={t.stockHeaders}
            minWidth={680}
            rows={data.stock.map((s) => [
              s.product,
              s.peak_event,
              <b key="u" className="tabular-nums">{num(s.units_needed)}</b>,
              <Pill key="r" tone="warn">{s.ready_by}</Pill>,
              <span key="n" className="text-xs text-muted-foreground">{s.note}</span>,
            ])}
          />
        </SectionCard>
      )}

      <SectionCard title={t.checklist}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {CHECK_PHASES.map((ph) => {
            const tasks = data.checklist.filter((c) => c.phase === ph);
            if (!tasks.length) return null;
            return (
              <div key={ph} className="rounded-xl border bg-background p-3 print:break-inside-avoid">
                <p className="mb-2 flex items-center justify-between text-sm font-semibold">
                  {tr.labels.checkPhase[ph] ?? ph}
                  <span className="text-xs font-normal text-muted-foreground">{t.nTasks(tasks.length)}</span>
                </p>
                <Checklist items={tasks.map((x) => ({ task: x.task, owner: x.owner }))} />
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title={t.kpis}>
          <div className="space-y-2">
            {data.kpis.map((k) => (
              <div key={k.metric} className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
                <span>{k.metric}</span>
                <b className="text-right">{k.target}</b>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title={t.risks}>
          <Points items={data.risks} />
        </SectionCard>
      </div>
    </div>
  );
}

/** Kalender bulanan dengan blok campaign berwarna menurut skala. */
function MonthGrids({ campaigns, dow, months: monthNames, empty }: { campaigns: Campaign[]; dow: string[]; months: string[]; empty: string }) {
  const months = useMemo(() => {
    const set = new Set<string>();
    for (const c of campaigns) {
      set.add(c.start.slice(0, 7));
      set.add(c.end.slice(0, 7));
    }
    return [...set].filter((m) => /^\d{4}-\d{2}$/.test(m)).sort();
  }, [campaigns]);
  if (!months.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className={cn("grid gap-4", months.length > 1 && "lg:grid-cols-2")}>
      {months.map((ym) => {
        const [y, m] = ym.split("-").map(Number);
        const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
        const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
        const cells = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${ym}-${String(i + 1).padStart(2, "0")}`)];
        return (
          <div key={ym} className="print:break-inside-avoid">
            <p className="mb-1 text-sm font-semibold">
              {monthNames[m - 1]} {y}
            </p>
            <div className="grid grid-cols-7 gap-0.5 text-[10px]">
              {dow.map((d) => (
                <div key={d} className="py-0.5 text-center font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
              {cells.map((date, i) => {
                if (!date) return <div key={`x${i}`} />;
                const hits = campaigns.filter((c) => c.start <= date && date <= c.end);
                const top = hits.sort((a, b) => ["besar", "sedang", "rutin"].indexOf(a.scale) - ["besar", "sedang", "rutin"].indexOf(b.scale))[0];
                const first = top && (top.start === date || date.endsWith("-01"));
                return (
                  <div
                    key={date}
                    title={hits.map((h) => h.event).join(", ")}
                    className={cn("flex min-h-12 min-w-0 flex-col overflow-hidden rounded-md border p-1", top ? SCALE_STYLE[top.scale].bar : "bg-background")}
                  >
                    <span className={cn("font-semibold", !top && "text-muted-foreground")}>{Number(date.slice(8))}</span>
                    {first && <span className="mt-auto hidden leading-tight font-medium break-words sm:line-clamp-2">{top.event}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
