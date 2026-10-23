"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, X, XCircle } from "lucide-react";
import { useApp } from "@/components/app/app-context";
import { paymentsText } from "@/lib/i18n/payments";

/** Banner setelah kembali dari halaman bayar (Midtrans/Duitku): cek status berkala sampai berhasil/gagal. */
export function PaymentReturn() {
  const P = paymentsText(useApp().lang);
  const router = useRouter();
  const params = useSearchParams();
  // Midtrans kembali dengan ?paid=<order>; Duitku bisa menambahkan ?merchantOrderId=<order>.
  const order = params.get("paid")?.split("?")[0] || params.get("merchantOrderId");
  const [state, setState] = useState<{ status: string; item: string } | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!order) return;
    let alive = true;
    let tries = 0;
    const check = async () => {
      const res = await fetch(`/api/pay/status?order=${encodeURIComponent(order)}`).catch(() => null);
      const data = res?.ok ? ((await res.json()) as { status: string; item: string }) : null;
      if (!alive) return;
      if (data) setState(data);
      if (data?.status === "paid") return router.refresh();
      if (data && ["failed", "expired", "canceled"].includes(data.status)) return;
      if (++tries < 60) setTimeout(check, 4000);
    };
    check();
    return () => {
      alive = false;
    };
  }, [order, router]);

  if (!order || hidden) return null;
  const s = state?.status;
  const tone =
    s === "paid"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : s && ["failed", "expired", "canceled"].includes(s)
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : "border-primary/30 bg-primary/5";
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${tone}`}>
      {s === "paid" ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      ) : s && ["failed", "expired", "canceled"].includes(s) ? (
        <XCircle className="mt-0.5 size-4 shrink-0" />
      ) : (
        <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
      )}
      <span className="flex-1">
        {!state ? P.checking : s === "paid" ? P.success(state.item) : ["failed", "expired", "canceled"].includes(s ?? "") ? P.failedStatus : P.waiting(state.item)}
      </span>
      <button type="button" aria-label={P.close} onClick={() => setHidden(true)} className="opacity-60 hover:opacity-100">
        <X className="size-4" />
      </button>
    </div>
  );
}
