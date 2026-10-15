"use client";

import { useMemo, useState } from "react";
import { VERDICT_LABEL, calcRows, computeLoyalty, type LoyaltyEconomics, type LoyaltyOutput } from "@/lib/addons/pro/specs/loyalty";
import { cn } from "@/lib/utils";
import { CopyCard, DataTable, KeyValues, Pill, Points, SectionCard, StatGrid, Summary, Timeline, num, rp, shortRp } from "./kit";

const TYPE_LABEL: Record<LoyaltyOutput["model"]["type"], string> = {
  poin: "Poin",
  tier: "Tier member",
  stamp: "Stamp card",
  referral: "Referral",
  berbayar: "Member berbayar",
  gabungan: "Poin + tier",
};
const TIER_STYLE = [
  "from-zinc-100 to-zinc-200 text-zinc-900 dark:from-zinc-800 dark:to-zinc-700 dark:text-zinc-50",
  "from-amber-100 to-amber-300 text-amber-950 dark:from-amber-900/70 dark:to-amber-700/70 dark:text-amber-50",
  "from-violet-200 to-fuchsia-300 text-violet-950 dark:from-violet-900/80 dark:to-fuchsia-800/70 dark:text-violet-50",
  "from-zinc-800 to-zinc-950 text-amber-200 dark:from-zinc-950 dark:to-black",
];
/** Tier teratas selalu bergaya premium (gelap), sisanya naik bertahap. */
const tierStyle = (i: number, n: number) => (n === 1 ? 1 : i === n - 1 ? 3 : Math.min(i, 2));
const verdictTone = { untung: "good", tipis: "warn", rugi: "bad" } as const;
const pct = (n: number | null) => (n === null ? "-" : `${num(n, 1)}%`);

export function LoyaltyResult({ data }: { data: LoyaltyOutput }) {
  const e = data.economics;
  return (
    <div className="space-y-4">
      <Summary text={data.summary} />

      <section className="rounded-2xl border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Model yang direkomendasikan</p>
          <Pill tone="primary">{TYPE_LABEL[data.model.type] ?? data.model.type}</Pill>
        </div>
        <h2 className="mt-1 text-xl font-bold">{data.model.name}</h2>
        <p className="mt-2 text-sm">{data.model.why}</p>
        <p className="mt-2 text-xs text-muted-foreground">Tidak dipilih: {data.model.not_chosen}</p>
      </section>

      {e && (
        <>
          <StatGrid
            items={[
              { label: "Omzet tahunan dasar", value: shortRp(e.base_revenue), note: `${num(e.customers)} pelanggan × ${shortRp(e.aov)} × ${num(e.frequency)}×` },
              { label: "Biaya program / tahun", value: shortRp(e.total_cost), tone: "warn", note: `${pct(e.cost_pct_of_member_revenue)} dari omzet anggota` },
              { label: "Untung bersih program", value: shortRp(e.net_gain), tone: e.net_gain < 0 ? "bad" : "good", note: `ROI ${pct(e.roi_pct)}` },
              { label: "Uplift minimal agar impas", value: pct(e.breakeven_uplift_pct), tone: "primary", note: `Asumsi uplift ${pct(e.uplift_pct)}` },
            ]}
          />
          <Calculator e={e} rewards={data.rewards} />
        </>
      )}

      <SectionCard title="Aturan dapat & tukar poin">
        <KeyValues
          items={[
            { k: "Dapat poin", v: data.earn_burn.earn_rule },
            { k: "Nilai 1 poin", v: <b>{rp(data.earn_burn.point_value)}</b> },
            { k: "Tukar poin", v: data.earn_burn.burn_rule },
            { k: "Masa berlaku", v: data.earn_burn.expiry },
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

      <SectionCard title="Level member">
        <div className={cn("grid gap-3", data.tiers.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
          {data.tiers.map((t, i) => (
            <div
              key={t.name}
              className={cn(
                "flex flex-col rounded-2xl bg-gradient-to-br p-4 shadow-sm print:break-inside-avoid",
                TIER_STYLE[tierStyle(i, data.tiers.length)],
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">Level {i + 1}</p>
                  <p className="text-lg font-bold">{t.name}</p>
                </div>
                {t.multiplier !== null && <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs font-semibold dark:bg-white/15">{num(t.multiplier, 2)}× poin</span>}
              </div>
              <p className="mt-1 text-xs opacity-80">{t.requirement}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {t.benefits.map((b) => (
                  <li key={b}>✓ {b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Katalog hadiah" hint="Nilai ke pelanggan = poin × nilai 1 poin; biaya ke bisnis = HPP hadiah">
        <DataTable
          headers={["Hadiah", "Poin", "Nilai ke pelanggan", "Biaya ke bisnis", "Biaya / nilai"]}
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

      <SectionCard title="Rencana peluncuran">
        <Timeline items={data.launch.map((l) => ({ title: l.phase, when: l.when, body: l.actions }))} />
      </SectionCard>

      <SectionCard title="Materi komunikasi siap pakai">
        <div className="grid gap-3 md:grid-cols-2">
          {data.comms.map((c, i) => (
            <CopyCard key={i} title={c.title} meta={<Pill tone="primary">{c.channel}</Pill>} text={c.text} />
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="KPI program">
          <div className="space-y-2">
            {data.kpis.map((k) => (
              <div key={k.metric} className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
                <span>{k.metric}</span>
                <b className="text-right">{k.target}</b>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="🛡️ Risiko & pencegahan kecurangan">
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

      <SectionCard title="Dasar asumsi">
        <Points items={[data.assumptions.notes]} />
      </SectionCard>
    </div>
  );
}

/** Kalkulator ringkas: hasil hitungan sistem + geser asumsi untuk melihat dampaknya. */
function Calculator({ e, rewards }: { e: LoyaltyEconomics; rewards: LoyaltyOutput["rewards"] }) {
  const [p, setP] = useState({ participation_pct: e.participation_pct, redemption_pct: e.redemption_pct, uplift_pct: e.uplift_pct });
  const changed = p.participation_pct !== e.participation_pct || p.redemption_pct !== e.redemption_pct || p.uplift_pct !== e.uplift_pct;
  const live = useMemo(() => (changed ? computeLoyalty({ ...e, ...p }, rewards) : e), [changed, e, p, rewards]);
  const rows = calcRows(live);
  const maxAbs = Math.max(1, ...live.scenarios.map((s) => Math.abs(s.net_gain)));
  const sliders: { key: keyof typeof p; label: string; min: number; max: number }[] = [
    { key: "participation_pct", label: "Partisipasi member", min: 5, max: 90 },
    { key: "redemption_pct", label: "Redemption rate", min: 10, max: 100 },
    { key: "uplift_pct", label: "Uplift frekuensi anggota", min: 0, max: 50 },
  ];
  return (
    <SectionCard
      title="Kalkulator biaya vs untung"
      hint={
        <span className="flex items-center gap-2">
          <Pill tone={verdictTone[live.verdict]}>{VERDICT_LABEL[live.verdict]}</Pill>
          {changed && (
            <button type="button" className="text-primary hover:underline print:hidden" onClick={() => setP({ participation_pct: e.participation_pct, redemption_pct: e.redemption_pct, uplift_pct: e.uplift_pct })}>
              Kembalikan asumsi awal
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
            <Box label="Anggota" value={num(live.members)} />
            <Box label="Omzet tambahan" value={shortRp(live.incremental_revenue)} />
            <Box label="Laba kotor tambahan" value={shortRp(live.incremental_profit)} />
            <Box label="Biaya program" value={shortRp(live.total_cost)} />
            <Box label="Untung bersih" value={shortRp(live.net_gain)} tone={live.net_gain < 0 ? "bad" : "good"} />
            <Box label="Impas bila uplift ≥" value={pct(live.breakeven_uplift_pct)} />
          </div>
          {live.reward_cost_real !== null && (
            <p className="text-xs text-muted-foreground">
              Biaya hadiah dihitung dengan nilai tukar penuh ({shortRp(live.reward_cost)}) agar konservatif. Bila hadiah berupa produk sendiri, biaya riilnya ±{shortRp(live.reward_cost_real)}.
            </p>
          )}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Untung bersih per skenario uplift</p>
            <div className="space-y-1.5">
              {live.scenarios.map((s) => (
                <div key={s.uplift_pct} className="grid grid-cols-[64px_1fr_72px] items-center gap-2 text-xs">
                  <span className={cn(s.uplift_pct === live.uplift_pct && "font-bold text-primary")}>Uplift {s.uplift_pct}%</span>
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
          <summary className="cursor-pointer font-medium">Rincian rumus</summary>
          <dl className="mt-2 divide-y">
            {rows.map((r) => (
              <div key={r.k} className={cn("grid grid-cols-[1fr_auto] gap-x-3 py-1.5", r.k === "Untung bersih program" && "font-semibold")}>
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
