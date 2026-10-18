"use client";

import { useState } from "react";
import { CheckCircle2, Crown, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { rupiah } from "@/lib/addons/format";
import { RECOMMENDED_PLAN, type PlanOffer } from "@/lib/plan-offers";
import { useApp } from "@/components/app/app-context";
import { toolsText } from "@/lib/i18n/tools";

/**
 * Kartu paket (harga, besar kuota relatif, keunggulan) + tombol minta upgrade. Angka kredit tidak ditampilkan.
 * Permintaan masuk ke back office → Calon pelanggan untuk dikirimi cara bayar.
 */
export function PlanCards({ plans, currentPlan, note }: { plans: PlanOffer[]; currentPlan?: string; note: string }) {
  const T = toolsText(useApp().lang);
  const [sentPlan, setSentPlan] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function requestPlan(plan: PlanOffer) {
    setBusy(plan.id);
    const res = await fetch("/api/tools/request", { method: "POST", body: JSON.stringify({ plan: plan.id, note }) });
    setBusy(null);
    if (!res.ok) return toast.error(T.sendFailed);
    setSentPlan(plan.id);
  }

  // Besar kuota dibandingkan Starter (mis. "3,6× kuota Starter"), seperti cara Claude menyebut paket.
  const base = plans.find((p) => p.id === "starter")?.credits ?? 0;
  const quotaLabel = (p: PlanOffer) =>
    !p.price
      ? T.trialQuota
      : p.id === "starter" || !base
        ? T.standardQuota
        : T.starterMultiple((p.credits / base).toLocaleString(T.numberLocale, { maximumFractionDigits: 1 }));

  return (
    <div className={cn("grid gap-3", plans.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3")}>
      {plans.map((p) => {
        const current = p.id === currentPlan;
        const best = p.id === RECOMMENDED_PLAN;
        return (
          <div key={p.id} className={cn("flex flex-col rounded-xl border bg-card p-4", best && "border-primary/50 bg-primary/5 ring-1 ring-primary/30")}>
            <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {best ? (
                <>
                  <Crown className="size-3.5" /> {T.bestFit}
                </>
              ) : (
                T.plan
              )}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 font-semibold">
              {p.name}
              {p.originalPrice !== undefined && (
                <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-white">{p.promoLabel ?? T.promo}</span>
              )}
            </p>
            {p.originalPrice !== undefined && (
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="line-through">{rupiah(p.originalPrice)}</span>
                <span className="ml-1.5 font-medium text-destructive">{T.save(Math.round((1 - p.price / p.originalPrice) * 100))}</span>
              </p>
            )}
            <p className={cn("text-2xl font-bold", p.originalPrice === undefined && "mt-1")}>
              {p.price ? rupiah(p.price) : T.free}
              {(p.price > 0 || p.originalPrice !== undefined) && <span className="text-sm font-normal text-muted-foreground">{T.perMonth}</span>}
            </p>
            {p.promoUntil && (
              <p className="text-xs text-muted-foreground">
                {T.promoUntil(new Date(p.promoUntil).toLocaleDateString(T.numberLocale, { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }))}
              </p>
            )}
            <p className="mt-1 text-sm font-medium text-primary">{quotaLabel(p)}</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {(T.planFeatures[p.id] ?? []).map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            <div className="mt-auto pt-4">
              {current ? (
                <p className="rounded-md border py-2 text-center text-sm text-muted-foreground">{T.currentPlan}</p>
              ) : !p.price ? null : sentPlan === p.id ? (
                <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" /> {T.sentContact}
                </p>
              ) : (
                <Button variant={best ? "default" : "outline"} className="w-full" disabled={busy !== null} onClick={() => requestPlan(p)}>
                  {busy === p.id ? <Loader2 className="animate-spin" /> : <ShoppingBag />} {T.choosePlan(p.name)}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
