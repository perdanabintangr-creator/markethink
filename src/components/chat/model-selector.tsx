"use client";

import { Check, ChevronDown, Gauge, Lock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TierId } from "@/lib/ai/models.config";
import { useApp } from "@/components/app/app-context";
import { cn } from "@/lib/utils";

export interface TierOption {
  id: TierId;
  label: string;
  tagline: { id: string; en: string };
  description: { id: string; en: string };
  skills: { id: string[]; en: string[] };
  creditCost: number;
}

export function ModelSelector({
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
  const current = tiers.find((t) => t.id === value) ?? tiers[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-accent">
          {current.label}
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[22rem] max-w-[calc(100vw-1.5rem)]">
        <DropdownMenuLabel>{lang === "en" ? "Choose your marketing brain" : "Pilih otak marketing"}</DropdownMenuLabel>
        {tiers.map((t, i) => {
          const locked = !allowedTiers.includes(t.id);
          return (
            <DropdownMenuItem
              key={t.id}
              onClick={() => (locked ? onLocked(t) : onChange(t.id))}
              className={cn("items-start py-2.5", locked && "opacity-80")}
            >
              <span className="mt-0.5 flex gap-0.5 text-primary">
                {Array.from({ length: 3 }).map((_, k) => (
                  <Gauge key={k} className={k <= i ? "opacity-100" : "opacity-20"} />
                ))}
              </span>
              <span className="flex-1">
                <span className="flex items-center gap-1.5 font-medium">
                  {t.label}
                  {locked && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      <Lock className="!size-2.5" /> PRO
                    </span>
                  )}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t.tagline[lang]} — {t.description[lang]}
                </span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {t.skills[lang].map((s) => (
                    <span key={s} className="rounded border px-1.5 py-px text-[10px] text-muted-foreground">
                      {s}
                    </span>
                  ))}
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  {t.creditCost} {lang === "en" ? "credits / message" : "kredit / pesan"}
                </span>
              </span>
              {t.id === value && !locked && <Check className="mt-0.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
