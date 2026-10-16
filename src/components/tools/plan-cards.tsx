"use client";

import { useState } from "react";
import { CheckCircle2, Crown, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { rupiah } from "@/lib/addons/format";
import { PLAN_FEATURES, RECOMMENDED_PLAN, type PlanOffer } from "@/lib/plan-offers";

/**
 * Kartu paket (harga, besar kuota relatif, keunggulan) + tombol minta upgrade. Angka kredit tidak ditampilkan.
 * Permintaan masuk ke back office → Calon pelanggan untuk dikirimi cara bayar.
 */
export function PlanCards({ plans, currentPlan, note }: { plans: PlanOffer[]; currentPlan?: string; note: string }) {
  const [sentPlan, setSentPlan] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function requestPlan(plan: PlanOffer) {
    setBusy(plan.id);
    const res = await fetch("/api/tools/request", { method: "POST", body: JSON.stringify({ plan: plan.id, note }) });
    setBusy(null);
    if (!res.ok) return toast.error("Gagal mengirim. Coba lagi.");
    setSentPlan(plan.id);
  }

  // Besar kuota dibandingkan Starter (mis. "3,6× kuota Starter"), seperti cara Claude menyebut paket.
  const base = plans.find((p) => p.id === "starter")?.credits ?? 0;
  const quotaLabel = (p: PlanOffer) =>
    !p.price ? "Kuota percobaan" : p.id === "starter" || !base ? "Kuota bulanan standar" : `${(p.credits / base).toLocaleString("id-ID", { maximumFractionDigits: 1 })}× kuota Starter`;

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
                  <Crown className="size-3.5" /> Paling pas
                </>
              ) : (
                "Paket"
              )}
            </p>
            <p className="mt-1 font-semibold">{p.name}</p>
            <p className="mt-1 text-2xl font-bold">
              {p.price ? rupiah(p.price) : "Gratis"}
              {p.price > 0 && <span className="text-sm font-normal text-muted-foreground">/bulan</span>}
            </p>
            <p className="mt-1 text-sm font-medium text-primary">{quotaLabel(p)}</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {(PLAN_FEATURES[p.id] ?? []).map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            <div className="mt-auto pt-4">
              {current ? (
                <p className="rounded-md border py-2 text-center text-sm text-muted-foreground">Paket kamu sekarang</p>
              ) : !p.price ? null : sentPlan === p.id ? (
                <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" /> Terkirim — tim kami segera menghubungi kamu.
                </p>
              ) : (
                <Button variant={best ? "default" : "outline"} className="w-full" disabled={busy !== null} onClick={() => requestPlan(p)}>
                  {busy === p.id ? <Loader2 className="animate-spin" /> : <ShoppingBag />} Pilih {p.name}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
