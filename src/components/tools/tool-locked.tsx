"use client";

import { useState } from "react";
import { CheckCircle2, Crown, Loader2, Lock, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RequestAddonButton } from "./request-addon";
import { rupiah, type AddonStatusLite } from "./common";

interface PlanOffer {
  id: "pro" | "promax";
  name: string;
  price: number;
  credits: number;
}

/**
 * Pengganti form saat Tools Pro terkunci (mis. paket Free): pilihan beli add-on per bulan atau upgrade paket.
 * Permintaan masuk ke back office → Calon pelanggan untuk dikirimi cara bayar.
 */
export function ToolLocked({ status, toolName, plans }: { status: AddonStatusLite; toolName: string; plans: PlanOffer[] }) {
  const [sentPlan, setSentPlan] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function requestPlan(plan: PlanOffer) {
    setBusy(plan.id);
    const res = await fetch("/api/tools/request", { method: "POST", body: JSON.stringify({ plan: plan.id, note: `Dari Tools Pro: ${toolName}` }) });
    setBusy(null);
    if (!res.ok) return toast.error("Gagal mengirim. Coba lagi.");
    setSentPlan(plan.id);
  }

  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Lock className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">{toolName} belum terbuka di paket kamu</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tools Pro menghasilkan dokumen setara konsultan & agency (halaman visual + PPT/Excel). Buka dengan salah satu cara berikut:
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="flex flex-col rounded-xl border border-primary/40 bg-primary/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Beli add-on</p>
          <p className="mt-1 font-semibold">{status.name}</p>
          <p className="mt-1 text-2xl font-bold">
            {rupiah(status.price)}
            <span className="text-sm font-normal text-muted-foreground">/bulan</span>
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>✓ {status.quota}× pemakaian per bulan</li>
            <li>✓ Semua tools di kelompok {status.name}</li>
            <li>✓ Hasil + file PPT/Excel, bisa diperbaiki gratis 3×</li>
          </ul>
          <div className="mt-auto pt-4">
            <RequestAddonButton addon={status.id} name={status.name} price={status.price} quota={status.quota} label="Beli add-on ini" className="w-full" />
          </div>
        </div>

        {plans.map((p) => (
          <div key={p.id} className="flex flex-col rounded-xl border p-4">
            <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              <Crown className="size-3.5" /> Upgrade paket
            </p>
            <p className="mt-1 font-semibold">{p.name}</p>
            <p className="mt-1 text-2xl font-bold">
              {rupiah(p.price)}
              <span className="text-sm font-normal text-muted-foreground">/bulan</span>
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {p.id === "promax" ? (
                <>
                  <li>✓ Gratis {status.promaxQuota}× tiap add-on Tools Pro per bulan</li>
                  <li>✓ {p.credits} kredit chat per hari & semua otak AI</li>
                  <li>✓ Penyimpanan file 5 GB</li>
                </>
              ) : (
                <>
                  <li>✓ {p.credits} kredit chat per hari</li>
                  <li>✓ Coba gratis 1× tiap add-on Tools Pro</li>
                  <li>✓ Penyimpanan file 1 GB</li>
                </>
              )}
            </ul>
            <div className="mt-auto pt-4">
              {sentPlan === p.id ? (
                <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" /> Terkirim — tim kami segera menghubungi kamu.
                </p>
              ) : (
                <Button variant={p.id === "promax" ? "default" : "outline"} className="w-full" disabled={busy !== null} onClick={() => requestPlan(p)}>
                  {busy === p.id ? <Loader2 className="animate-spin" /> : <ShoppingBag />} Upgrade ke {p.name}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
