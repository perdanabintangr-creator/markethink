"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { CREDITS_CHANGED } from "@/lib/events";
import { useApp } from "./app-context";

export function CreditMeter() {
  const { credits, t, planName } = useApp();
  const [remaining, setRemaining] = useState(credits.remaining);

  useEffect(() => {
    const onChange = (e: Event) => setRemaining((e as CustomEvent<number>).detail);
    window.addEventListener(CREDITS_CHANGED, onChange);
    return () => window.removeEventListener(CREDITS_CHANGED, onChange);
  }, []);

  const pct = credits.dailyLimit ? Math.max(0, Math.min(100, (remaining / credits.dailyLimit) * 100)) : 0;
  return (
    <div className="rounded-lg border bg-background/60 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Zap className="size-3.5 text-primary" /> {t.creditsLeft}
        </span>
        <span className="font-semibold">
          {remaining}/{credits.dailyLimit}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span>Reset setiap 00.00 WIB</span>
        <span className="font-semibold text-primary">Paket {planName}</span>
      </p>
    </div>
  );
}
