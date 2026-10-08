"use client";

import { Check, Lock } from "lucide-react";
import { PLAN_LABEL, type TierId } from "@/lib/ai/models.config";
import { useApp } from "@/components/app/app-context";
import { cn } from "@/lib/utils";
import type { TierOption } from "./model-selector";

/** Kartu pilihan otak di layar chat kosong. */
export function BrainPicker({
  tiers,
  value,
  onChange,
  onLocked,
}: {
  tiers: TierOption[];
  value: TierId;
  onChange: (t: TierId) => void;
  onLocked: (t: TierOption) => void;
}) {
  const { lang, allowedTiers } = useApp();
  return (
    <div className="w-full">
      <p className="mb-2 text-left text-xs font-medium text-muted-foreground">
        {lang === "en" ? "Choose your marketing brain" : "Pilih otak marketing"}
      </p>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {tiers.map((t) => {
          const locked = !allowedTiers.includes(t.id);
          const active = t.id === value && !locked;
          return (
            <button
              key={t.id}
              onClick={() => (locked ? onLocked(t) : onChange(t.id))}
              className={cn(
                "relative rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent",
                active && "border-primary ring-1 ring-primary",
                locked && "opacity-70",
              )}
            >
              <span className="flex items-center justify-between gap-1">
                <span className="text-sm font-semibold">{t.label.replace("Markethink ", "")}</span>
                {locked ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    <Lock className="size-2.5" /> {PLAN_LABEL[t.minPlan].toUpperCase()}
                  </span>
                ) : (
                  active && <Check className="size-4 text-primary" />
                )}
              </span>
              <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{t.tagline[lang]}</span>
              <span className="mt-1.5 block text-[11px] leading-snug">{t.skills[lang].slice(0, 2).join(" · ")}</span>
              <span className="mt-1.5 block text-[10px] text-muted-foreground">
                {t.creditCost} {lang === "en" ? "credits/msg" : "kredit/pesan"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
