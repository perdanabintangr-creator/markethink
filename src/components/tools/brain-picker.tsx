"use client";

import { useEffect, useState } from "react";
import { Brain, Crown, Lock } from "lucide-react";
import { useApp } from "@/components/app/app-context";
import { TOOL_TIERS, TOOL_TIER_INFO, TOOL_TIER_KEY, readToolTierPref, type ToolTier } from "@/lib/addons/tool-tier";
import { cn } from "@/lib/utils";

/** Pilihan otak Tools Pro & Agent (Associate / Director). Pilihan diingat di browser. */
export function useToolTier() {
  const { allowedTiers, user } = useApp();
  const canDirector = user.role === "admin" || allowedTiers.includes("director");
  const [tier, setTierState] = useState<ToolTier>("associate");
  useEffect(() => {
    const pref = readToolTierPref();
    setTierState(pref === "director" && !canDirector ? "associate" : pref);
  }, [canDirector]);
  function setTier(t: ToolTier) {
    setTierState(t);
    try {
      localStorage.setItem(TOOL_TIER_KEY, t);
    } catch {
      /* abaikan */
    }
  }
  return { tier, setTier, canDirector };
}

export function BrainPicker({ value, onChange, canDirector, disabled }: { value: ToolTier; onChange: (t: ToolTier) => void; canDirector: boolean; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Otak:</span>
      <div role="radiogroup" aria-label="Pilih otak" className="inline-flex rounded-lg bg-muted p-0.5">
        {TOOL_TIERS.map((t) => {
          const locked = t === "director" && !canDirector;
          const active = value === t;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled || locked}
              title={locked ? "Director tersedia di paket Promax" : TOOL_TIER_INFO[t].hint}
              onClick={() => onChange(t)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors",
                active && "bg-background text-foreground shadow-sm",
                !active && !locked && "hover:text-foreground",
                locked && "cursor-not-allowed opacity-60",
              )}
            >
              {t === "director" ? <Crown className="size-3.5 text-amber-500" /> : <Brain className="size-3.5 text-primary" />}
              {TOOL_TIER_INFO[t].label}
              {locked && <Lock className="size-3" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
