"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/components/app/app-context";
import { settingsText } from "@/lib/i18n/settings";
import { setTeamReview } from "./actions";

/** Pengaturan → Personalisasi: nyalakan/matikan Pemeriksaan Tim (Tim Otak). */
export function TeamReviewToggle({ enabled, freePlan }: { enabled: boolean; freePlan: boolean }) {
  const { lang } = useApp();
  const t = settingsText(lang);
  const [on, setOn] = useState(enabled);
  const [pending, start] = useTransition();

  const change = (next: boolean) => {
    setOn(next);
    start(async () => {
      const res = await setTeamReview(next);
      if (res?.error) {
        setOn(!next);
        toast.error(res.error);
      } else toast.success(next ? t.teamReviewOn : t.teamReviewOff);
    });
  };

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border p-4">
      <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1 space-y-1">
        <label htmlFor="team-review" className="text-sm font-semibold">
          {t.teamReview}
        </label>
        <p className="text-xs text-muted-foreground">{t.teamReviewDesc}</p>
        {freePlan && <p className="text-xs font-medium text-primary">{t.teamReviewFree}</p>}
      </div>
      <Switch id="team-review" checked={on && !freePlan} disabled={pending || freePlan} onCheckedChange={change} />
    </div>
  );
}
