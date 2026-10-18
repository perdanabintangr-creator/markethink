"use client";

import { useEffect, useState } from "react";
import { Brain, Crown, Lock, Zap } from "lucide-react";
import { useApp } from "@/components/app/app-context";
import { TOOL_TIERS, TOOL_TIER_KEY, readToolTierPref, type ToolTier } from "@/lib/addons/tool-tier";
import { toolTierInfo, toolTierLockedHint } from "@/lib/addons/i18n";
import { toolsText } from "@/lib/i18n/tools";
import { cn } from "@/lib/utils";

/** Pilihan otak Tools Pro & Agent (Senior / Associate / Director). Pilihan diingat di browser. */
export function useToolTier() {
  const { allowedTiers, user } = useApp();
  const allowed = (t: ToolTier) => t === "senior" || user.role === "admin" || allowedTiers.includes(t);
  const key = allowedTiers.join(",") + user.role;
  const [tier, setTierState] = useState<ToolTier>("senior");
  useEffect(() => {
    const pref = readToolTierPref();
    setTierState(allowed(pref) ? pref : "senior");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  function setTier(t: ToolTier) {
    setTierState(t);
    try {
      localStorage.setItem(TOOL_TIER_KEY, t);
    } catch {
      /* abaikan */
    }
  }
  return { tier, setTier, allowed };
}

const ICON: Record<ToolTier, React.ReactNode> = {
  senior: <Zap className="size-3.5 text-primary" />,
  associate: <Brain className="size-3.5 text-primary" />,
  director: <Crown className="size-3.5 text-amber-500" />,
};

export function BrainPicker({
  value,
  onChange,
  allowed,
  disabled,
}: {
  value: ToolTier;
  onChange: (t: ToolTier) => void;
  allowed: (t: ToolTier) => boolean;
  disabled?: boolean;
}) {
  const { lang } = useApp();
  const T = toolsText(lang);
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">{T.brain}</span>
        <div role="radiogroup" aria-label={T.chooseBrain} className="inline-flex flex-wrap rounded-lg bg-muted p-0.5">
          {TOOL_TIERS.map((t) => {
            const locked = !allowed(t);
            const active = value === t;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled || locked}
                title={locked ? toolTierLockedHint(t, lang) : toolTierInfo(t, lang).hint}
                onClick={() => onChange(t)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors",
                  active && "bg-background text-foreground shadow-sm",
                  !active && !locked && "hover:text-foreground",
                  locked && "cursor-not-allowed opacity-60",
                )}
              >
                {ICON[t]}
                {toolTierInfo(t, lang).label}
                {locked && <Lock className="size-3" />}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {toolTierInfo(value, lang).hint}
      </p>
    </div>
  );
}
