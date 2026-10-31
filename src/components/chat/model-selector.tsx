"use client";

import { Brain, Check, ChevronDown, Lock, Wand2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PLAN_LABEL, type PlanId, type TierId } from "@/lib/ai/models.config";
import type { TierChoice } from "@/lib/ai/auto-tier";
import { useApp } from "@/components/app/app-context";
import { cn } from "@/lib/utils";
import { chatText } from "@/lib/i18n/chat";

export interface TierOption {
  id: TierId;
  label: string;
  tagline: { id: string; en: string };
  description: { id: string; en: string };
  skills: { id: string[]; en: string[] };
  creditCost: number;
  minPlan: PlanId;
}

/** Satu baris kegunaan per otak — ringkas agar mudah dipilih. */
const BEST_FOR: Partial<Record<TierId, { id: string; en: string }>> = {
  junior: { id: "Cepat · caption & ide konten", en: "Fast · captions & ideas" },
  senior: { id: "Seimbang · campaign & konten", en: "Balanced · campaigns & content" },
  associate: { id: "Mendalam · strategi & riset", en: "Deep · strategy & research" },
  director: { id: "Terpintar · strategi bisnis", en: "Smartest · business strategy" },
};

/** Indikator level kecerdasan (1–4 batang). */
function LevelBars({ level, muted }: { level: number; muted?: boolean }) {
  return (
    <span className="flex h-4 items-end gap-[2px]" aria-hidden>
      {[1, 2, 3, 4].map((k) => (
        <span
          key={k}
          className={cn(
            "w-[3px] rounded-full",
            k <= level ? (muted ? "bg-muted-foreground/50" : "bg-primary") : "bg-muted-foreground/20",
          )}
          style={{ height: `${4 + k * 3}px` }}
        />
      ))}
    </span>
  );
}

export function ModelSelector({
  tiers,
  value,
  onChange,
  onLocked,
  compact,
}: {
  tiers: TierOption[];
  value: TierChoice;
  onChange: (t: TierChoice) => void;
  onLocked: (t: TierOption) => void;
  /** Versi kecil untuk toolbar composer. */
  compact?: boolean;
}) {
  const { lang, allowedTiers } = useApp();
  const c = chatText(lang);
  const isAuto = value === "auto";
  const autoOk = allowedTiers.includes("junior") && allowedTiers.includes("senior");
  const current = tiers.find((t) => t.id === value) ?? tiers[0];
  const autoLabel = c.auto;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/15"
            aria-label={c.chooseBrain}
          >
            {isAuto ? <Wand2 className="size-3.5" /> : <Brain className="size-3.5" />} {isAuto ? autoLabel : current.label.replace("Marqthink ", "")}
            <ChevronDown className="size-3.5" />
          </button>
        ) : (
          <button className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-accent">
            {isAuto ? `Marqthink ${autoLabel}` : current.label}
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 max-w-[calc(100vw-1.5rem)] p-1.5">
        <DropdownMenuLabel className="px-2 pt-1 pb-2">{c.chooseBrainTitle}</DropdownMenuLabel>
        {autoOk && (
          <DropdownMenuItem onClick={() => onChange("auto")} className={cn("gap-3 rounded-lg px-2.5 py-2.5", isAuto && "bg-accent")}>
            <Wand2 className="!size-4 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {autoLabel}
                <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">{c.recommended}</span>
              </span>
              <span className="block text-xs text-muted-foreground">
                {c.autoDesc}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums">
              <Check className={cn("!size-4 text-primary", !isAuto && "invisible")} />
            </span>
          </DropdownMenuItem>
        )}
        {tiers.map((t, i) => {
          const locked = !allowedTiers.includes(t.id);
          const selected = t.id === value && !locked;
          return (
            <DropdownMenuItem
              key={t.id}
              onClick={() => (locked ? onLocked(t) : onChange(t.id))}
              className={cn("gap-3 rounded-lg px-2.5 py-2.5", selected && "bg-accent")}
            >
              <LevelBars level={i + 1} muted={locked} />
              <span className="min-w-0 flex-1">
                <span className={cn("flex items-center gap-1.5 text-sm font-medium", locked && "text-muted-foreground")}>
                  {t.label.replace("Marqthink ", "")}
                  {locked && (
                    <span className="inline-flex items-center gap-0.5 rounded-full border px-1.5 text-[10px] font-medium text-muted-foreground">
                      <Lock className="!size-2.5" /> {PLAN_LABEL[t.minPlan]}
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{BEST_FOR[t.id]?.[lang] ?? t.tagline[lang]}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums">
                <Check className={cn("!size-4 text-primary", !selected && "invisible")} />
              </span>
            </DropdownMenuItem>
          );
        })}
        <p className="px-2.5 pt-1.5 pb-1 text-[11px] leading-snug text-muted-foreground">
          {c.brainCostNote}
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
