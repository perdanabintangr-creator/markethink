"use client";

import { Lock } from "lucide-react";
import type { PlanOffer } from "@/lib/plan-offers";
import { PlanCards } from "./plan-cards";
import { useApp } from "@/components/app/app-context";
import { toolsText } from "@/lib/i18n/tools";

/**
 * Pengganti form saat Tools Pro terkunci (paket Free): pilihan upgrade paket all-in-1.
 * `toolName` = nama untuk tampilan (sesuai bahasa); `noteName` = nama asli (Indonesia) untuk catatan ke back office.
 */
export function ToolLocked({ toolName, noteName, plans }: { toolName: string; noteName?: string; plans: PlanOffer[] }) {
  const T = toolsText(useApp().lang);
  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Lock className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">{T.lockedTitle(toolName)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{T.lockedDesc}</p>
        </div>
      </div>
      <div className="mt-5">
        <PlanCards plans={plans} note={`Dari Tools Pro: ${noteName ?? toolName}`} />
      </div>
    </section>
  );
}
