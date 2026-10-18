"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useResultsI18n } from "./common";

const nID = (v: string) => Number(v.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".")) || 0;
/** Format Inggris: koma = pemisah ribuan, titik = desimal. */
const nEN = (v: string) => Number(v.replace(/[^\d.-]/g, "")) || 0;

function Num({ label, value, onChange, suffix, hint }: { label: string; value: string; onChange: (v: string) => void; suffix?: string; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className={suffix ? "pr-10" : undefined} />
        {suffix && <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Result({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "text-lg font-semibold text-primary tabular-nums" : "font-medium tabular-nums"}>{value}</span>
    </div>
  );
}

function Card({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mb-4 text-xs text-muted-foreground">{desc}</p>
      {children}
    </section>
  );
}

/** Kalkulator bisnis (tanpa AI, tidak memakai kuota). */
export function Calculators({ locked }: { locked: boolean }) {
  const { lang, t: tr, f } = useResultsI18n();
  const t = tr.calculators;
  const { rupiah, numID } = f;
  const n = lang === "en" ? nEN : nID;

  // 1) Harga jual dari HPP
  const [hpp, setHpp] = useState("25000");
  const [extra, setExtra] = useState("3000");
  const [fee, setFee] = useState("10");
  const [margin, setMargin] = useState("30");
  const denom = 1 - n(fee) / 100 - n(margin) / 100;
  const price = denom > 0 ? (n(hpp) + n(extra)) / denom : NaN;

  // 2) ROAS impas & CPA maksimum
  const [sell, setSell] = useState("75000");
  const [cogs, setCogs] = useState("30000");
  const [other, setOther] = useState("5000");
  const [fee2, setFee2] = useState("10");
  const profit = n(sell) - n(cogs) - n(other) - (n(sell) * n(fee2)) / 100;
  const beRoas = profit > 0 ? n(sell) / profit : NaN;

  // 3) Budget iklan untuk target omzet
  const [omzet, setOmzet] = useState("30000000");
  const [aov, setAov] = useState("75000");
  const [roas, setRoas] = useState("4");
  const budget = n(roas) > 0 ? n(omzet) / n(roas) : NaN;
  const orders = n(aov) > 0 ? n(omzet) / n(aov) : NaN;

  return (
    <div className="relative">
      <div className={locked ? "pointer-events-none select-none blur-[3px]" : undefined} aria-hidden={locked}>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title={t.priceTitle} desc={t.priceDesc}>
            <div className="grid grid-cols-2 gap-3">
              <Num label={t.hppUnit} value={hpp} onChange={setHpp} suffix="Rp" />
              <Num label={t.otherUnit} value={extra} onChange={setExtra} suffix="Rp" hint={t.otherUnitHint} />
              <Num label={t.platformFee} value={fee} onChange={setFee} suffix="%" />
              <Num label={t.targetMargin} value={margin} onChange={setMargin} suffix="%" />
            </div>
            <div className="mt-4">
              <Result label={t.minPrice} value={Number.isFinite(price) ? rupiah(price) : t.marginOver} strong />
              {Number.isFinite(price) && (
                <>
                  <Result label={t.platformFee} value={rupiah((price * n(fee)) / 100)} />
                  <Result label={t.netProfitUnit} value={rupiah((price * n(margin)) / 100)} />
                </>
              )}
            </div>
          </Card>

          <Card title={t.roasTitle} desc={t.roasDesc}>
            <div className="grid grid-cols-2 gap-3">
              <Num label={t.sellPrice} value={sell} onChange={setSell} suffix="Rp" />
              <Num label={t.hpp} value={cogs} onChange={setCogs} suffix="Rp" />
              <Num label={t.otherOrder} value={other} onChange={setOther} suffix="Rp" />
              <Num label={t.platformFee} value={fee2} onChange={setFee2} suffix="%" />
            </div>
            <div className="mt-4">
              <Result label={t.beRoas} value={Number.isFinite(beRoas) ? `${numID(beRoas, 2)}x` : t.lossBeforeAds} strong />
              <Result label={t.maxCpa} value={profit > 0 ? rupiah(profit) : "-"} />
              <Result label={t.profitBeforeAds} value={rupiah(profit)} />
            </div>
          </Card>

          <Card title={t.budgetTitle} desc={t.budgetDesc}>
            <div className="grid grid-cols-2 gap-3">
              <Num label={t.targetRevenue} value={omzet} onChange={setOmzet} suffix="Rp" />
              <Num label={t.aov} value={aov} onChange={setAov} suffix="Rp" />
              <Num label={t.targetRoas} value={roas} onChange={setRoas} suffix="x" hint={t.targetRoasHint} />
            </div>
            <div className="mt-4">
              <Result label={t.budgetMonth} value={Number.isFinite(budget) ? rupiah(budget) : "-"} strong />
              <Result label={t.budgetDay} value={Number.isFinite(budget) ? rupiah(budget / 30) : "-"} />
              <Result label={t.ordersNeeded} value={Number.isFinite(orders) ? numID(orders, 0) : "-"} />
              <Result label={t.adCostOrder} value={Number.isFinite(budget / orders) ? rupiah(budget / orders) : "-"} />
            </div>
          </Card>
        </div>
      </div>
      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/70 p-6 text-center">
          <Lock className="size-6 text-muted-foreground" />
          <p className="max-w-sm text-sm">{t.locked}</p>
          <Button asChild>
            <Link href="/pricing">{t.seePlans}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
