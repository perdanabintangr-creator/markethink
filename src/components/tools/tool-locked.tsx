"use client";

import { Lock } from "lucide-react";
import type { PlanOffer } from "@/lib/plan-offers";
import { PlanCards } from "./plan-cards";

/** Pengganti form saat Tools Pro terkunci (paket Free): pilihan upgrade paket all-in-1. */
export function ToolLocked({ toolName, plans }: { toolName: string; plans: PlanOffer[] }) {
  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Lock className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">{toolName} tersedia mulai paket Starter</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tools Pro menghasilkan dokumen setara konsultan & agency (halaman visual + PPT/Excel). Semua paket berbayar sudah termasuk Tools Pro —
            pemakaiannya memotong kredit bulanan.
          </p>
        </div>
      </div>
      <div className="mt-5">
        <PlanCards plans={plans} note={`Dari Tools Pro: ${toolName}`} />
      </div>
    </section>
  );
}
