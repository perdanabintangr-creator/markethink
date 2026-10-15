"use client";

import { useMemo } from "react";
import { CHECK_PHASES, MARGIN_LABEL, SCALE_LABEL, platformFeeRp, type PromoOutput } from "@/lib/addons/pro/specs/promo";
import { cn } from "@/lib/utils";
import { Checklist, DataTable, KeyValues, Pill, Points, SectionCard, StatGrid, Summary, num, rp, shortRp } from "./kit";

type Campaign = PromoOutput["campaigns"][number];

const DOW = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const SCALE_STYLE: Record<Campaign["scale"], { bar: string; dot: string; tone: "bad" | "warn" | "primary" }> = {
  besar: { bar: "bg-rose-500 text-white", dot: "bg-rose-500", tone: "bad" },
  sedang: { bar: "bg-amber-400 text-amber-950", dot: "bg-amber-400", tone: "warn" },
  rutin: { bar: "bg-sky-500 text-white", dot: "bg-sky-500", tone: "primary" },
};
const STATUS_TONE = { aman: "good", tipis: "warn", rugi: "bad" } as const;

const dm = (s: string) => `${Number(s.slice(8, 10))} ${MONTHS[Number(s.slice(5, 7)) - 1]?.slice(0, 3) ?? ""}`;
const range = (c: Campaign) => (c.start === c.end ? dm(c.start) : `${dm(c.start)} – ${dm(c.end)}`);

export function PromoResult({ data }: { data: PromoOutput }) {
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
          { label: "Target omzet campaign", value: shortRp(totalRev), tone: "primary", note: "Jumlah target semua event" },
          { label: "Target unit", value: num(totalUnits) },
          { label: "Campaign", value: String(data.campaigns.length), note: `${big} event besar` },
          {
            label: "Skenario margin bermasalah",
            value: String(bad + thin),
            tone: bad ? "bad" : thin ? "warn" : "good",
            note: bad ? `${bad} rugi · ${thin} tipis` : thin ? `${thin} tipis` : "Semua aman",
          },
        ]}
      />

      <SectionCard title="Strategi">
        <KeyValues
          items={[
            { k: "Fokus produk", v: data.strategy.focus },
            { k: "Penjaga margin", v: data.strategy.margin_guard },
            { k: "Mesin trafik", v: data.strategy.traffic },
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Kalender campaign"
        hint={
          <span className="flex flex-wrap gap-3">
            {(Object.keys(SCALE_LABEL) as Campaign["scale"][]).map((s) => (
              <span key={s} className="flex items-center gap-1">
                <span className={cn("size-2.5 rounded-full", SCALE_STYLE[s].dot)} /> {SCALE_LABEL[s]}
              </span>
            ))}
          </span>
        }
      >
        <MonthGrids campaigns={data.campaigns} />
      </SectionCard>

      <SectionCard title="Detail tiap campaign" hint="Klik untuk melihat mekanisme, voucher & persiapan">
        <div className="divide-y rounded-xl border">
          {data.campaigns.map((c, i) => (
            <details key={i} className="group p-3 print:break-inside-avoid" open={i === 0}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                <span className={cn("size-2.5 shrink-0 rounded-full", SCALE_STYLE[c.scale].dot)} />
                <b className="tabular-nums">{range(c)}</b>
                <span className="font-medium">{c.event}</span>
                <Pill tone={SCALE_STYLE[c.scale].tone}>{SCALE_LABEL[c.scale]}</Pill>
                <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                  {c.target_revenue ? <b className="text-foreground">{shortRp(c.target_revenue)}</b> : null}
                  {c.target_units ? ` · ${num(c.target_units)} unit` : ""}
                </span>
              </summary>
              <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                <div className="space-y-2">
                  <p>
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Mekanisme · </span>
                    {c.mechanism}
                  </p>
                  {!!c.hero_products.length && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-xs font-semibold uppercase text-muted-foreground">Produk unggulan</span>
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
                              {v.min_spend ? `min. ${shortRp(v.min_spend)}` : "tanpa min."}
                              {v.quota ? ` · kuota ${num(v.quota)}` : ""}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="rounded-lg bg-muted/60 p-2">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Dukungan · </span>
                    {c.support}
                  </p>
                  <p className="rounded-lg bg-amber-500/10 p-2">
                    <span className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-300">Persiapan · </span>
                    {c.prep}
                  </p>
                  <p className="text-xs text-muted-foreground">Platform: {c.platforms}</p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </SectionCard>

      {!!data.margins.length && (
        <SectionCard title="Hitung margin setelah promo" hint="Dihitung ulang sistem: harga promo − HPP − biaya platform − biaya lain">
          <DataTable
            headers={["Produk · skenario", "Harga → promo", "HPP", "Biaya platform", "Biaya lain", "Margin/unit", "Status"]}
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
                <Pill tone={STATUS_TONE[m.status]}>{MARGIN_LABEL[m.status]}</Pill>
                <span className="block text-xs font-normal text-muted-foreground">{m.note}</span>
              </span>,
            ])}
          />
          <p className="mt-2 text-xs text-muted-foreground">Status: rugi bila margin &lt; 0, tipis bila &lt; 10% dari harga promo, aman bila ≥ 10%. Biaya platform adalah perkiraan — cek tarif terbaru di Seller Centre.</p>
        </SectionCard>
      )}

      {!!data.stock.length && (
        <SectionCard title="Persiapan stok">
          <DataTable
            headers={["Produk", "Event puncak", "Unit dibutuhkan", "Siap di gudang", "Dasar hitungan"]}
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

      <SectionCard title="Checklist persiapan event besar">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {CHECK_PHASES.map((ph) => {
            const tasks = data.checklist.filter((c) => c.phase === ph);
            if (!tasks.length) return null;
            return (
              <div key={ph} className="rounded-xl border bg-background p-3 print:break-inside-avoid">
                <p className="mb-2 flex items-center justify-between text-sm font-semibold">
                  {ph}
                  <span className="text-xs font-normal text-muted-foreground">{tasks.length} tugas</span>
                </p>
                <Checklist items={tasks.map((t) => ({ task: t.task, owner: t.owner }))} />
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="KPI periode ini">
          <div className="space-y-2">
            {data.kpis.map((k) => (
              <div key={k.metric} className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
                <span>{k.metric}</span>
                <b className="text-right">{k.target}</b>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Risiko & antisipasi">
          <Points items={data.risks} />
        </SectionCard>
      </div>
    </div>
  );
}

/** Kalender bulanan dengan blok campaign berwarna menurut skala. */
function MonthGrids({ campaigns }: { campaigns: Campaign[] }) {
  const months = useMemo(() => {
    const set = new Set<string>();
    for (const c of campaigns) {
      set.add(c.start.slice(0, 7));
      set.add(c.end.slice(0, 7));
    }
    return [...set].filter((m) => /^\d{4}-\d{2}$/.test(m)).sort();
  }, [campaigns]);
  if (!months.length) return <p className="text-sm text-muted-foreground">Belum ada campaign.</p>;
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
              {MONTHS[m - 1]} {y}
            </p>
            <div className="grid grid-cols-7 gap-0.5 text-[10px]">
              {DOW.map((d) => (
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
