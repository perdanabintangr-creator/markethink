"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startCheckout } from "@/components/tools/checkout";

/** Baris kecil di atas Autopilot: paket konten aktif + masa aktif + tombol perpanjang (tanpa potong otomatis). */
export function ContentPlanBar({ planId, name, periodEnd, used, limit }: { planId: string; name: string; periodEnd: string | null; used: number; limit: number }) {
  const [busy, setBusy] = useState(false);
  if (planId === "admin") return null;
  const end = periodEnd ? new Date(periodEnd) : null;
  const daysLeft = end ? Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000)) : null;
  const soon = daysLeft !== null && daysLeft <= 5;
  return (
    <div className="mx-auto mt-4 w-full max-w-6xl shrink-0 px-4 md:px-6">
      <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm ${soon ? "border-amber-500/40 bg-amber-500/10" : "bg-card"}`}>
        <span className="flex items-center gap-2">
          <Package className="size-4 text-primary" />
          <b>Autopilot {name}</b>
          <span className="text-muted-foreground">
            · {used}/{limit} konten terpakai
            {end && ` · aktif s.d. ${end.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}${soon ? ` (${daysLeft} hari lagi)` : ""}`}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <Link href="/pricing#paket-konten" className="text-xs text-muted-foreground underline">
            Ganti paket
          </Link>
          <Button
            size="sm"
            variant={soon ? "default" : "outline"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              if (!(await startCheckout("content", planId, "Gagal membuka pembayaran. Coba lagi."))) setBusy(false);
            }}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Perpanjang 30 hari
          </Button>
        </span>
      </div>
    </div>
  );
}
