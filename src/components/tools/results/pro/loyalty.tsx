"use client";

import { useMemo, useState } from "react";
import { VERDICT_LABEL, calcRows, computeLoyalty, type LoyaltyEconomics, type LoyaltyOutput } from "@/lib/addons/pro/specs/loyalty";
import { cn } from "@/lib/utils";
import { CopyCard, DataTable, KeyValues, Pill, Points, SectionCard, StatGrid, Summary, Timeline, useResultsI18n } from "./kit";
import type { ResultFmt } from "../fmt";

const TIER_STYLE = [
  "from-zinc-100 to-zinc-200 text-zinc-900 dark:from-zinc-800 dark:to-zinc-700 dark:text-zinc-50",
  "from-amber-100 to-amber-300 text-amber-950 dark:from-amber-900/70 dark:to-amber-700/70 dark:text-amber-50",
  "from-violet-200 to-fuchsia-300 text-violet-950 dark:from-violet-900/80 dark:to-fuchsia-800/70 dark:text-violet-50",
  "from-zinc-800 to-zinc-950 text-amber-200 dark:from-zinc-950 dark:to-black",
];
/** Tier teratas selalu bergaya premium (gelap), sisanya naik bertahap. */
const tierStyle = (i: number, n: number) => (n === 1 ? 1 : i === n - 1 ? 3 : Math.min(i, 2));
const verdictTone = { untung: "good", tipis: "warn", rugi: "bad" } as const;
const pctOf = (num: ResultFmt["num"]) => (n: number | null) => (n === null ? "-" : `${num(n, 1)}%`);

/** Baris rumus versi Inggris (padanan `calcRows` di spec, yang berbahasa Indonesia). */
function calcRowsEN(e: LoyaltyEconomics, f: ResultFmt) {
  const pct = pctOf(f.num);
  const rpText = (n: number | null) => (n === null ? "-" : `${n < 0 ? "-" : ""}Rp${f.n(Math.abs(Math.round(n)))}`);
  const verdict = { untung: "Profitable", tipis: "Thin profit", rugi: "Loss" }[e.verdict];
  return [
    { k: "Active customers", f: "Input", rp: null, v: f.n(e.customers) },
    { k: "Average order value (AOV)", f: "Input", rp: e.aov, v: "" },
    { k: "Purchase frequency per year", f: "Input", rp: null, v: `${e.frequency}×` },
    { k: "Gross margin", f: "Input", rp: null, v: pct(e.margin_pct) },
    { k: "Baseline annual revenue", f: "Customers × AOV × frequency", rp: e.base_revenue, v: "" },
    { k: "Member participation", f: "Assumption", rp: null, v: pct(e.participation_pct) },
    { k: "Number of members", f: "Customers × participation", rp: null, v: f.n(e.members) },
    { k: "Member revenue (without program)", f: "Members × AOV × frequency", rp: e.member_revenue_base, v: "" },
    { k: "Member frequency uplift", f: "Assumption", rp: null, v: pct(e.uplift_pct) },
    { k: "Incremental revenue", f: "Member revenue × uplift", rp: e.incremental_revenue, v: "" },
    {
      k: "Effective earn rate",
      f: `Value of 1 point (${rpText(e.point_value)}) ÷ spend per point (${rpText(e.spend_per_point)}) × tier multiplier ${e.avg_multiplier}`,
      rp: null,
      v: pct(e.earn_rate_pct),
    },
    { k: "Redemption rate", f: "Assumption", rp: null, v: pct(e.redemption_pct) },
    { k: "Reward cost (full redemption value)", f: "(Member revenue + incremental revenue) × earn rate × redemption", rp: e.reward_cost, v: "" },
    { k: "Fixed cost per year", f: "App/system, materials, training", rp: e.fixed_cost_year, v: "" },
    { k: "Total program cost", f: "Reward cost + fixed cost", rp: e.total_cost, v: `${pct(e.cost_pct_of_member_revenue)} of member revenue` },
    { k: "Incremental gross profit", f: "Incremental revenue × gross margin", rp: e.incremental_profit, v: "" },
    { k: "Program net gain", f: "Incremental profit − total cost", rp: e.net_gain, v: verdict },
    { k: "ROI", f: "Net gain ÷ total cost", rp: null, v: pct(e.roi_pct) },
    {
      k: "Break-even uplift",
      f: "(B×earn×redemption + fixed cost) ÷ (B×(margin − earn×redemption)), B = member revenue",
      rp: null,
      v: e.breakeven_uplift_pct === null ? "Not reachable (reward cost ≥ margin)" : pct(e.breakeven_uplift_pct),
    },
    ...(e.reward_cost_real !== null
      ? [{ k: "Real reward cost (est. COGS)", f: "Reward cost × average (reward COGS ÷ redemption value)", rp: e.reward_cost_real, v: "" }]
      : []),
  ];
}

export function LoyaltyResult({ data }: { data: LoyaltyOutput }) {
  const { t: tr, f } = useResultsI18n();
  const t = tr.loyalty;
  const { num, rp, shortRp } = f;
  const pct = pctOf(num);
  const e = data.economics;
  return (
    <div className="space-y-4">
      <Summary text={data.summary} />

      <section className="rounded-2xl border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t.model}</p>
          <Pill tone="primary">{t.type[data.model.type] ?? data.model.type}</Pill>
        </div>
        <h2 className="mt-1 text-xl font-bold">{data.model.name}</h2>
        <p className="mt-2 text-sm">{data.model.why}</p>
        <p className="mt-2 text-xs text-muted-foreground">{t.notChosen(data.model.not_chosen)}</p>
      </section>

      {e && (
        <>
          <StatGrid
            items={[
              { label: t.baseRevenue, value: shortRp(e.base_revenue), note: t.baseNote(num(e.customers), shortRp(e.aov), num(e.frequency)) },
              { label: t.costYear, value: shortRp(e.total_cost), tone: "warn", note: t.costNote(pct(e.cost_pct_of_member_revenue)) },
              { label: t.netGain, value: shortRp(e.net_gain), tone: e.net_gain < 0 ? "bad" : "good", note: `ROI ${pct(e.roi_pct)}` },
              { label: t.breakeven, value: pct(e.breakeven_uplift_pct), tone: "primary", note: t.upliftNote(pct(e.uplift_pct)) },
            ]}
          />
          <Calculator e={e} rewards={data.rewards} />
        </>
      )}

      <SectionCard title={t.earnBurn}>
        <KeyValues
          items={[
            { k: t.earn, v: data.earn_burn.earn_rule },
            { k: t.pointValue, v: <b>{rp(data.earn_burn.point_value)}</b> },
            { k: t.burn, v: data.earn_burn.burn_rule },
            { k: t.expiry, v: data.earn_burn.expiry },
          ]}
        />
        {!!data.earn_burn.bonus_rules.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {data.earn_burn.bonus_rules.map((b) => (
              <span key={b} className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs">
                ✨ {b}
              </span>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title={t.levels}>
        <div className={cn("grid gap-3", data.tiers.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
          {data.tiers.map((tier, i) => (
            <div
              key={tier.name}
              className={cn(
                "flex flex-col rounded-2xl bg-gradient-to-br p-4 shadow-sm print:break-inside-avoid",
                TIER_STYLE[tierStyle(i, data.tiers.length)],
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">{t.levelN(i + 1)}</p>
                  <p className="text-lg font-bold">{tier.name}</p>
                </div>
                {tier.multiplier !== null && <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs font-semibold dark:bg-white/15">{t.mult(num(tier.multiplier, 2))}</span>}
              </div>
              <p className="mt-1 text-xs opacity-80">{tier.requirement}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {tier.benefits.map((b) => (
                  <li key={b}>✓ {b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t.catalog} hint={t.catalogHint}>
        <DataTable
          headers={t.catalogHeaders}
          minWidth={640}
          rows={data.rewards.map((r) => {
            const face = r.face_value ?? r.points * data.earn_burn.point_value;
            const ratio = face > 0 ? (r.cost / face) * 100 : null;
            return [
              <span key="r">
                {r.reward}
                <span className="block text-xs font-normal text-muted-foreground">{r.note}</span>
              </span>,
              <b key="p" className="tabular-nums">{num(r.points)}</b>,
              <span key="f" className="tabular-nums">{rp(face)}</span>,
              <span key="c" className="tabular-nums">{rp(r.cost)}</span>,
              ratio === null ? "-" : <Pill key="x" tone={ratio > 100 ? "bad" : ratio > 60 ? "warn" : "good"}>{num(ratio, 0)}%</Pill>,
            ];
          })}
        />
      </SectionCard>

      <SectionCard title={t.launch}>
        <Timeline items={data.launch.map((l) => ({ title: l.phase, when: l.when, body: l.actions }))} />
      </SectionCard>

      <SectionCard title={t.comms}>
        <div className="grid gap-3 md:grid-cols-2">
          {data.comms.map((c, i) => (
            <CopyCard key={i} title={c.title} meta={<Pill tone="primary">{c.channel}</Pill>} text={c.text} />
          ))}
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
          <div className="space-y-2">
            {data.risks.map((r, i) => (
              <div key={i} className="rounded-xl bg-red-500/5 p-3 text-sm">
                <b>{r.risk}</b>
                <p className="mt-0.5 text-muted-foreground">→ {r.prevention}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title={t.assumptions}>
        <Points items={[data.assumptions.notes]} />
      </SectionCard>
    </div>
  );
}

/** Kalkulator ringkas: hasil hitungan sistem + geser asumsi untuk melihat dampaknya. */
function Calculator({ e, rewards }: { e: LoyaltyEconomics; rewards: LoyaltyOutput["rewards"] }) {
  const { lang, t: tr, f } = useResultsI18n();
  const t = tr.loyalty;
  const { num, rp, shortRp } = f;
  const pct = pctOf(num);
  const [p, setP] = useState({ participation_pct: e.participation_pct, redemption_pct: e.redemption_pct, uplift_pct: e.uplift_pct });
  const changed = p.participation_pct !== e.participation_pct || p.redemption_pct !== e.redemption_pct || p.uplift_pct !== e.uplift_pct;
  const live = useMemo(() => (changed ? computeLoyalty({ ...e, ...p }, rewards) : e), [changed, e, p, rewards]);
  const rows = lang === "en" ? calcRowsEN(live, f) : calcRows(live);
  const maxAbs = Math.max(1, ...live.scenarios.map((s) => Math.abs(s.net_gain)));
  const sliders: { key: keyof typeof p; label: string; min: number; max: number }[] = [
    { key: "participation_pct", label: t.participation, min: 5, max: 90 },
    { key: "redemption_pct", label: t.redemption, min: 10, max: 100 },
    { key: "uplift_pct", label: t.uplift, min: 0, max: 50 },
  ];
  return (
    <SectionCard
      title={t.calcTitle}
      hint={
        <span className="flex items-center gap-2">
          <Pill tone={verdictTone[live.verdict]}>{tr.labels.loyaltyVerdict[live.verdict] ?? VERDICT_LABEL[live.verdict]}</Pill>
          {changed && (
            <button type="button" className="text-primary hover:underline print:hidden" onClick={() => setP({ participation_pct: e.participation_pct, redemption_pct: e.redemption_pct, uplift_pct: e.uplift_pct })}>
              {t.reset}
            </button>
          )}
        </span>
      }
    >
      <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border bg-background p-3 print:hidden">
            {sliders.map((s) => (
              <label key={s.key} className="block text-sm">
                <span className="flex justify-between">
                  <span>{s.label}</span>
                  <b className="tabular-nums">{p[s.key]}%</b>
                </span>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={1}
                  value={p[s.key]}
                  onChange={(ev) => setP((x) => ({ ...x, [s.key]: Number(ev.target.value) }))}
                  className="mt-1 w-full accent-[var(--color-primary)]"
                />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Box label={t.members} value={num(live.members)} />
            <Box label={t.incRevenue} value={shortRp(live.incremental_revenue)} />
            <Box label={t.incProfit} value={shortRp(live.incremental_profit)} />
            <Box label={t.programCost} value={shortRp(live.total_cost)} />
            <Box label={t.net} value={shortRp(live.net_gain)} tone={live.net_gain < 0 ? "bad" : "good"} />
            <Box label={t.breakevenIf} value={pct(live.breakeven_uplift_pct)} />
          </div>
          {live.reward_cost_real !== null && (
            <p className="text-xs text-muted-foreground">{t.rewardNote(shortRp(live.reward_cost), shortRp(live.reward_cost_real))}</p>
          )}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{t.perScenario}</p>
            <div className="space-y-1.5">
              {live.scenarios.map((s) => (
                <div key={s.uplift_pct} className="grid grid-cols-[64px_1fr_72px] items-center gap-2 text-xs">
                  <span className={cn(s.uplift_pct === live.uplift_pct && "font-bold text-primary")}>{t.upliftN(s.uplift_pct)}</span>
                  <div className="relative h-3 rounded-full bg-muted">
                    <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
                    <span
                      className={cn("absolute inset-y-0 rounded-full", s.net_gain < 0 ? "right-1/2 bg-red-500" : "left-1/2 bg-emerald-500")}
                      style={{ width: `${(Math.abs(s.net_gain) / maxAbs) * 50}%` }}
                    />
                  </div>
                  <span className={cn("text-right tabular-nums", s.net_gain < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400")}>{shortRp(s.net_gain)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <details className="rounded-xl border bg-background p-3 text-sm" open>
          <summary className="cursor-pointer font-medium">{t.formula}</summary>
          <dl className="mt-2 divide-y">
            {rows.map((r) => (
              <div key={r.k} className={cn("grid grid-cols-[1fr_auto] gap-x-3 py-1.5", r.k === t.netRowKey && "font-semibold")}>
                <dt>
                  {r.k}
                  <span className="block text-[11px] font-normal text-muted-foreground">{r.f}</span>
                </dt>
                <dd className="text-right tabular-nums">{r.rp !== null ? rp(r.rp) : r.v}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </SectionCard>
  );
}

function Box({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg border bg-background p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("font-semibold tabular-nums", tone === "good" && "text-emerald-600 dark:text-emerald-400", tone === "bad" && "text-red-600 dark:text-red-400")}>{value}</p>
    </div>
  );
}
