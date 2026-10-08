"use client";

import { Check, ChevronDown, Gauge } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TierId } from "@/lib/ai/models.config";
import { useApp } from "@/components/app/app-context";

export interface TierOption {
  id: TierId;
  label: string;
  tagline: { id: string; en: string };
  description: { id: string; en: string };
  creditCost: number;
}

export function ModelSelector({
  tiers,
  value,
  onChange,
}: {
  tiers: TierOption[];
  value: TierId;
  onChange: (t: TierId) => void;
}) {
  const { lang } = useApp();
  const current = tiers.find((t) => t.id === value) ?? tiers[1];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-accent">
          {current.label}
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel>{lang === "en" ? "Choose marketing brain" : "Pilih otak marketing"}</DropdownMenuLabel>
        {tiers.map((t, i) => (
          <DropdownMenuItem key={t.id} onClick={() => onChange(t.id)} className="items-start py-2">
            <span className="mt-0.5 flex gap-0.5 text-primary">
              {Array.from({ length: 3 }).map((_, k) => (
                <Gauge key={k} className={k <= i ? "opacity-100" : "opacity-20"} />
              ))}
            </span>
            <span className="flex-1">
              <span className="block font-medium">{t.label}</span>
              <span className="block text-xs text-muted-foreground">
                {t.tagline[lang]} — {t.description[lang]}
              </span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {t.creditCost} {lang === "en" ? "credits / message" : "kredit / pesan"}
              </span>
            </span>
            {t.id === value && <Check className="mt-0.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
